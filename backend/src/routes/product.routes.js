import express from "express"
import slugify from "slugify";
import Product from "../models/Product.js";
import {authenticate, requireRole} from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";
import {body, query, param, validationResult} from "express-validator";
import product from "../models/Product.js";

const router = express.Router();


/* --------------------------- POST /api/products (add product (admin-only)) --------------------------- */

const createRules = [
    body("title").isString().trim().isLength({min: 2}).withMessage("Title is required (min 2 chars)"),
    body("price").isFloat({min: 0}).withMessage("Price must be a non-negative number"),
    body("stock").optional().isInt({min: 0}).withMessage("Stock must be an integer >= 0"),
    body("category").optional().isString().trim(),
    body("description").optional().isString(),
    body("images").optional().isArray().withMessage("Images must be an array of URLs"),
    body("images.*").optional().isString().withMessage("Each image must be a string URL"),
    body("active").optional().isBoolean()
];

router.post(
    "/",
    authenticate,
    requireRole(["admin"]),
    createRules,
    async (req, res, next) => {
        try {
            if (!req.is("application/json") && typeof req.body !== "object") {
                return res.status(415).json({error: "Unsupported Media Type. Use application/json."});
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({error: "Validation failed", details: errors.array()});
            }

            const {title, price, stock = 0, category, description = "", images = [], active = true} = req.body;

            const base = slugify(title, {lower: true, strict: true});
            let slug = base;
            let suffix = 1;

            while (await Product.exists({slug})) {
                slug = `${base}-${suffix++}`;
            }

            const doc = await Product.create({
                title, slug, price, stock, category, description, images, active,
                createdBy: req.user.sub
            });

            await AuditLog.create({
                action: "PRODUCT_CREATE",
                targetType: "product",
                targetId: doc._id,
                actorId: req.user.sub,
                actorEmail: req.user.email,
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                details: {title, price, stock, category}
            }).catch(() => {
            });

            return res.status(201).json({
                message: "Product Created",
                product: doc
            });
        } catch (err) {
            if (err?.code === 11000) {
                return res.status(409).json({error: "Duplicate Key", details: err.keyValue});
            }
            next(err);
        }
    }
);

/* --------------------------- GET /api/products --------------------------- */

const listRules = [
    query("q").optional().isString(),
    query("category").optional().isString().trim(),
    query("min").optional().isFloat({min: 0}),
    query("max").optional().isFloat({min: 0}),
    query("page").optional().isInt({min: 1}),
    query("limit").optional().isInt({min: 1, max: 50}),
    query("active").optional().isBoolean().toBoolean()
];

router.get("/", listRules, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({error: "Validation failed", details: errors.array()});

        const {
            q,
            category,
            min,
            max,
            page: pageRaw = 1,
            limit: limitRaw = 12,
            active
        } = req.query;

        const page = Number(pageRaw) || 1;
        const limit = Math.min(Number(limitRaw) || 12, 50);
        const skip = (page - 1) * limit;

        const filter = {};
        let projection = undefined;
        const useText = process.env.USE_TEXT_SEARCH !== "false";
        let sort = {createdAt: -1};
        if (q && q.trim()) {
            if (useText) {
                filter.$text = {$search: q};
                projection = {score: {$meta: "textScore"}};
                sort = {score: {$meta: "textScore"}, createdAt: -1};
            } else {
                // regex fallback (no $text mixed with OR)
                filter.$or = [
                    {title: {$regex: q, $options: "i"}},
                    {description: {$regex: q, $options: "i"}}
                ];
            }
        }

        if (category) filter.category = category;
        if (active !== undefined) filter.active = active;

        if (min !== undefined || max !== undefined) {
            filter.price = {};
            if (min !== undefined) filter.price.$gte = Number(min);
            if (max !== undefined) filter.price.$lte = Number(max);
        }

        const [items, total] = await Promise.all([
            Product.find(filter, projection).sort(sort).skip(skip).limit(limit),
            Product.countDocuments(filter)
        ]);

        const pages = Math.ceil(total / limit) || 1;

        res.json({
            total,
            page,
            pages,
            limit,
            hasNext: page < pages,
            hasPrev: page > 1,
            items
        });
    } catch (err) {
        next(err);
    }
});

/* ---------------------- PUT /api/products/:id (admin) -------------------- */

const updateRules = [
    param("id").isMongoId().withMessage("Invalid product id"),
    body("title").optional().isString().isLength({min: 2}),
    body("price").optional().isFloat({min: 0}),
    body("stock").optional().isInt({min: 0}),
    body("category").optional().isString(),
    body("description").optional().isString(),
    body("images").optional().isArray(),
    body("images.*").optional().isString(),
    body("active").optional().isBoolean()
];

router.put(
    "/:id",
    authenticate,
    requireRole(["admin"]),
    updateRules,
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ error: "Validation failed", details: errors.array() });

            const id = req.params.id;
            const existing = await Product.findById(id);
            if (!existing) return res.status(404).json({ error: "Product not found" });

            const updates = {};
            const {
                title,
                price,
                stock,
                category,
                description,
                images,
                active
            } = req.body || {};

            if (title !== undefined) updates.title = title;
            if (price !== undefined) updates.price = Number(price);
            if (stock !== undefined) updates.stock = Number(stock);
            if (category !== undefined) updates.category = category;
            if (description !== undefined) updates.description = description;
            if (images !== undefined) updates.images = images;
            if (active !== undefined) updates.active = active;

            // If title changes, regenerate a unique slug
            if (title && title.trim() && title.trim() !== existing.title) {
                const base = slugify(title, { lower: true, strict: true });
                let slug = base, i = 1;
                while (await Product.exists({ slug, _id: { $ne: existing._id } })) {
                    slug = `${base}-${i++}`;
                }
                updates.slug = slug;
            }

            // Apply & save
            Object.assign(existing, updates);
            const before = existing.toObject(); // shallow snapshot before save for audit (we will mutate below)
            await existing.save();

            // Minimal diff for audit log
            const changed = {};
            for (const key of Object.keys(updates)) {
                changed[key] = updates[key];
            }

            // Audit
            AuditLog.create({
                action: "PRODUCT_UPDATE",
                targetType: "product",
                targetId: existing._id,
                actorId: req.user.sub,
                actorEmail: req.user.email,
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                details: changed
            }).catch(() => {});

            res.json({ message: "Product updated", product: existing });
        } catch (err) {
            if (err?.code === 11000) {
                return res.status(409).json({ error: "Duplicate key", details: err.keyValue });
            }
            next(err);
        }
    }
);

/* -------------------- DELETE /api/products/:id (admin) ------------------- */

router.delete(
    "/:id",
    authenticate,
    requireRole(["admin"]),
    [param("id").isMongoId().withMessage("Invalid product id")],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ error: "Validation failed", details: errors.array() });

            const id = req.params.id;
            const doc = await Product.findByIdAndDelete(id);
            if (!doc) return res.status(404).json({ error: "Product not found" });

            // Audit
            AuditLog.create({
                action: "PRODUCT_DELETE",
                targetType: "product",
                targetId: doc._id,
                actorId: req.user.sub,
                actorEmail: req.user.email,
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                details: { title: doc.title, slug: doc.slug, price: doc.price }
            }).catch(() => {});

            res.json({ message: "Product deleted", id: doc._id.toString() });
        } catch (err) {
            next(err);
        }
    }
);

/* --------------------- GET /api/products/:slug (public) -------------------- */
router.get(
    "/:slug",
    [param("slug").isString().trim().isLength({ min: 2 })],
    async (req, res, next) => {
        try {
            const { slug } = req.params;
            const product = await Product.findOne({ slug, active: true });
            if (!product) return res.status(404).json({ error: "Product not found" });
            res.json({ product });
        } catch (err) { next(err); }
    }
);

export default router;
import express from "express";
import {body, param, validationResult} from "express-validator";
import {authenticate} from "../middleware/auth.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const router = express.Router();

/* ------------------ Helpers ----------------------- */

const computeTotals = (items) => {
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    return {subtotal, total: subtotal};
}


/* ------------------- GET /api/cart (protected) ------------------- */

router.get("/", authenticate, async (req, res, next) => {
    try {
        const cart = await Cart.findOne({userId: req.user.sub}).lean();
        if (!cart || cart.items.length === 0) return res.json({items: [], subtotal: 0, total: 0});

        const ids = cart.items.map((i) => i.productId);
        const productMap = new Map(
            (await Product.find({_id: {$in: ids}})
                    .select("title price images slug")
                    .lean()
            ).map((p) => [p._id.toString(), p])
        );

        const items = cart.items.map((it) => {
            const p = productMap.get(it.productId.toString());
            return {
                productId: it.productId,
                qty: it.qty,
                title: p?.title ?? "Unknown Product",
                price: p?.price ?? 0,
                image: p?.images?.[0] ?? null,
                slug: p?.slug ?? null,
            };
        });

        const totals = computeTotals(items);
        res.json({items, ...totals});
    } catch (err) {
        next(err);
    }
});

/* ------------- POST /api/cart (add or update) -------------------- */

const upsertRules = [
    body("productId").isMongoId().withMessage("Valid productId Required"),
    body("qty").isInt({min: 0}).withMessage("qty must be >= 0"),
];

router.post("/", authenticate, upsertRules, async (req, res, next) => {
   try {
       const errors = validationResult(req);
       if(!errors.isEmpty())
           return res.status(400).json({ error: "Validation Failed", details: errors.array() });

       const { productId, qty } = req.body;

       const product = await Product.findOne({ _id: productId, active: true }).select("price").lean();
       if (!product) return res.status(404).json({ error: "Product not found or inactive" });

       const cart = await Cart.findOneAndUpdate(
           { userId: req.user.sub},
           { $setOnInsert: { userId: req.user.sub, items: [] } },
           { new: true, upsert: true }
       );

       if (qty === 0) {
           await Cart.updateOne(
               { _id: cart._id },
               { $pull: { items: { productId } } }
           );
       } else {
           const existing = cart.items.find((i) => i.productId.toString() === productId);
           if (existing) {
               await Cart.updateOne(
                   { _id: cart._id, "items.productId": productId },
                   { $set: { "items.$.qty": qty } }
               );
           } else {
               await Cart.updateOne(
                   { _id: cart._id },
                   { $push: { items: { productId, qty } } }
               );
           }
       }

       const updated = await Cart.findById(cart._id).lean();
       const ids = updated.items.map((i) => i.productId);
       const productMap = new Map(
           (await Product.find({ _id: { $in: ids } })
                   .select("title price images slug")
                   .lean()
           ).map((p) => [p._id.toString(), p])
       );

       const items = updated.items.map((it) => {
          const p = productMap.get(it.productId.toString());
          return {
              productId: it.productId,
              qty: it.qty,
              title: p?.title ?? "Unknown Product",
              price: p?.price ?? 0,
              image: p?.images?.[0] ?? null,
              slug: p?.slug ?? null,
          };
       });

       const totals = computeTotals(items);
       res.status(200).json({ items, ...totals });
   } catch (err) {
       next(err);
   }
});

/* ------------- DELETE /api/cart/:productId ----------------------- */

router.delete(
    "/:productId",
    authenticate,
    [param("productId").isMongoId().withMessage("Valid productId required")],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ error: "Validation failed", details: errors.array() });

            const { productId } = req.params;

            const cart = await Cart.findOneAndUpdate(
                { userId: req.user.sub },
                { $pull: { items: { productId } } },
                { new: true }
            ).lean();

            if (!cart) return res.json({ items: [], subtotal: 0, total: 0 });

            const ids = cart.items.map((i) => i.productId);
            const productMap = new Map(
                (await Product.find({ _id: { $in: ids } })
                        .select("title price images slug")
                        .lean()
                ).map((p) => [p._id.toString(), p])
            );

            const items = cart.items.map((it) => {
                const p = productMap.get(it.productId.toString());
                return {
                    productId: it.productId,
                    qty: it.qty,
                    title: p?.title ?? "Unknown Product",
                    price: p?.price ?? 0,
                    image: p?.images?.[0] ?? null,
                    slug: p?.slug ?? null,
                };
            });

            const total = computeTotals(items);
            res.json({ items, ...total });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
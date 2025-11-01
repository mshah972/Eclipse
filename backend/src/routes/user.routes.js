import express from "express"
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { signJWT } from "../utils/jwt.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const router = express.Router();

/* --------------------------- GET /api/profile --------------------------- */

const updateProfileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => req.user?.sub ?? ipKeyGenerator(req, res),
    message: {error: "Too many profile update attempts. Please try again later."}
});

router.get("/profile", authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.sub)
            .select("name email role createdAt updatedAt");

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

/* --------------------------- PUT /api/profile (update Profile) --------------------------- */

const updateProfileRules = [
    body("name")
        .optional()
        .isString().withMessage("Name must be a string")
        .isLength({min: 2, max: 80}).withMessage("Name must be 2-80 chars"),
    body("currentPassword")
        .optional()
        .isString().isLength({min: 8}).withMessage("Current password must be at least 8 chars"),
    body("newPassword")
        .optional()
        .isString().isLength({ min: 8}). withMessage("New password must be at least 8 chars")
        .matches(/[A-Z]/).withMessage("New password need an uppercase letter")
        .matches(/[a-z]/).withMessage("New password needs a lowercase letter")
        .matches(/[0-9]/).withMessage("New password needs a number"),
    body("confirmPassword")
        .optional()
        .custom((val, {req}) => {
            if (req.body.newPassword && val !== req.body.newPassword) {
                throw new Error("confirmNewPassword must match newPassword");
            }
            return true;
        })
];


router.put("/profile", authenticate, updateProfileRules, updateProfileLimiter, async (req, res, next) => {
    try {
        if (!req.is("application/json") && !req.is("json") && typeof req.body !== "object") {
            return res.status(415).json({ error: "Unsupported Media Type. Use application/json." });
        }

        const payload = req.body || {};
        const { name, currentPassword, newPassword } = payload;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: "Validation failed", details: errors.array() });
        }

        if (
            (name === undefined || name === null) &&
            !payload.newPassword && !payload.confirmNewPassword && !payload.currentPassword
        ) {
            return res.status(400).json({ error: "Nothing to update. Provide name or password fields." });
        }

        const user = await User.findById(req.user.sub).select(
            payload.currentPassword ? "+password" : ""
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        // Update name
        if (typeof name === "string" && name.trim().length >= 2) {
            user.name = name.trim();
        }

        // Update password
        if (payload.newPassword) {
            if (!payload.currentPassword) {
                return res.status(400).json({ error: "currentPassword is required to change password" });
            }
            const ok = await bcrypt.compare(payload.currentPassword, user.password || "");
            if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

            const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 8;
            user.password = await bcrypt.hash(payload.newPassword, saltRounds);

            user.tokenVersion = (user.tokenVersion || 0) + 1;
        }

        await user.save();

        const token = signJWT({ sub: user._id, role: user.role, email: user.email, tv: user.tokenVersion });
        return res.json({
            message: "Profile updated",
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err) {
        next(err);
    }
});


export default router;
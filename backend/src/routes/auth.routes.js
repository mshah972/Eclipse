import express from "express";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { signJWT } from "../utils/jwt.js";

const router = express.Router();

const registerRules = [
    body("name").isString().isLength({ min: 2}).withMessage("Name Required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("Password with 8 chars")
        .matches(/[A-Z]/).withMessage("Add an uppercase letter")
        .matches(/[a-z]/).withMessage("Add a lowercase letter")
        .matches(/[0-9]/).withMessage("Add a number"),
];

const loginRules = [
    body("email").isEmail(),
    body("password").isString().isLength({ min: 8 })
];

router.post("/register", registerRules, async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if(!errors.isEmpty())
        {
            return res.status(400).json(
                {
                error: "Validation failed",
                details: errors.array()
            })
        }

        const { name, email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ error: "Email already registered" });

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 8;
        const hashed = await bcrypt.hash(password, saltRounds);

        const user = await User.create({ name, email, password: hashed });
        const token = signJWT({ sub: user._id, role: user.role, email: user.email, tv: user.tokenVersion ?? 0 });

        res.status(201).json({
            message: "Registration successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err) { next(err); }
});

router.post("/login", loginRules, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({ error: "Validation failed", details: errors.array() });

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if (!user) return res.status(401).json({ error: "Account doesn't exists or invalid credentials" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: "Account doesn't exists or invalid credentials" });

        const token = signJWT({ sub: user._id, role: user.role, email: user.email, tv: user.tokenVersion ?? 0 });

        res.json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err) { next(err); }
});

router.get("/verify", (req, res) => {
    res.json({ ok: true, message: "Public verify endpoint (JWT check is middleware-based on protected routes)" });
});


export default router;
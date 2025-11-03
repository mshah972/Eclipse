import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import cartRoutes from "./routes/cart.routes.js";

export function buildApp() {
    const app = express();

    const allow = new Set([
        (process.env.CLIENT_ORIGIN || "").replace(/\/$/, ""),
        "http://localhost:5173",
    ]);

    app.use(helmet());
    app.use(cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true); // curl/tests
            const norm = origin.replace(/\/$/, "");
            return cb(null, allow.has(norm));
        },
        credentials: true,
        methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
        allowedHeaders: ["Content-Type","Authorization"],
    }));
    app.use(express.json({ limit: "10kb" }));
    app.use(morgan("dev"));
    app.set("trust proxy", 1);
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

    // routes
    app.use("/api/auth", authRoutes);
    app.use("/api/user", userRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/audit", auditRoutes);
    app.use("/api/cart", cartRoutes);
    app.get("/health", (_req, res) => res.json({ ok: true }));

    // error handler (FIX: was app.get)
    app.use(errorHandler);

    return app;
}

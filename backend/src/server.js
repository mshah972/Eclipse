import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db.js";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import {errorHandler} from "./middleware/error.js";

await connectDB();
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, crendentials: true}));
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));
app.set("trust proxy", 1);
app.use(rateLimit({windowMs: 15 * 60 * 1000, max: 200}));

// app.use("/api/auth", authRoutes);

app.get('/health', (_req, res) => res.json({ok: true}));

app.get(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 API listening on http://localhost:${port}`))


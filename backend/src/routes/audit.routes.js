import express from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

router.get("/", authenticate, requireRole(["admin"]), async (req, res, next) => {
   try {
       const { targetId, action ,page = 1, limit = 20} = req.query;
       const q = {};
       if (targetId) q.targetId = targetId;
       if (action) q.action = action;

       const skip = (Number(page) - 1) * Number(limit);
       const [items, total] = await Promise.all([
           AuditLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
           AuditLog.countDocuments(q)
       ]);

       res.json({ total, page: Number(page), limit: Number(limit), items });
   } catch (err) { next(err) };
});

export default router;
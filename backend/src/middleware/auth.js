import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
   try {
       const auth = req.headers.authorization || "";
       const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
       if (!token) return res.status(401).json({ error: " Access Token Required" });

       if (!process.env.JWT_SECRET) {
           return res.status(500).json({ error: "Server misconfiguration: JWT Secret Missing" });
       }

       let payload;
       try {
           payload = jwt.verify(token, process.env.JWT_SECRET);
       } catch (err) {
           return res.status(403).json({ error: "Invalid or expired token" });
       }

       const user = await User.findById(payload.sub).select("tokenVersion role email");
       if (!user) return res.status(401).json({ error: "Invalid User" });

       const tokenTv = typeof payload.tv === "number" ? payload.tv : 0;     // tolerate old tokens
       const userTv  = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;

       if (tokenTv !== userTv) {
           return res.status(401).json({ error: "Token is no longer valid. Please log in again." });
       }

       req.user = { ...payload, tv: userTv };
       next();
   } catch (err) {
       next(err);
   }
};

export const requireRole = (roles = []) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
        return res.status(403).json({ error: "Insufficient permissions" });
    next();
};

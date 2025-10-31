import jwt from "jsonwebtoken";

export const signJWT = (payload, opts = {}) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing. Check your .env or dotenv config.");
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "12h",
        ...opts,
    });
};

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true, minLength: 2, maxLength: 80 },
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        password: { type: String, required: true, minLength: 8, select: false },
        role: { type: String, enum: ["user", "admin"], default: "user"},
        tokenVersion: { type: Number, default: 0 }
    },
    { timestamps: true, collection: "users" }
);

export default mongoose.model("User", userSchema);
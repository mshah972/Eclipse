import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, index: true },
        description: String,
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, default: 0, min: 0 },
        category: { type: String, index: true },
        images: [String],
        active: { type: Boolean, default: true }
    },
    { timestamps: true, collection: "products" }
);

export default mongoose.model("Product", ProductSchema);
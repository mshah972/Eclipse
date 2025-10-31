import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, index: true },
        description: { type:String, default: "" },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, default: 0, min: 0 },
        category: { type: String, index: true },
        images: { type: [String], default: [] },
        active: { type: Boolean, default: true },

        createdBy: { type: mongoose.Types.ObjectId, ref: "User", index: true, required: true }
    },
    { timestamps: true, collection: "products" }
);

ProductSchema.index({ title: "text", description: "text" });

export default mongoose.model("Product", ProductSchema);
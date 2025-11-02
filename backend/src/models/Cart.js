import mongoose from "mongoose";

const CartItem = new mongoose.Schema(
    {
        productId: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
        qty: { type: Number, min: 1, required: true }
    },
    { _id: false }
);

const CartSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Types.ObjectId, ref: "User", unique: true, required: true },
        items: { type: [CartItem], default: [] }
    },
    { timestamps: true, collection: "carts" }
);

export default mongoose.model("Cart", CartSchema);
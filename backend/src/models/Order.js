import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
        title: String,
        qty: { type: Number, min: 1, required: true },
        price: { type: Number, min: 0, required: true }
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Types.ObjectId, ref: "User", required: true, index: true },
        items: { type: [ItemSchema], required: true },
        subtotal: { type: Number, min: 0, required: true },
        tax: { type: Number, min: 0, default: 0 },
        shipping: { type: Number, min: 0, required: true },
        total: { type: Number, min: 0, required: true },
        currency: { type: String, enum: ["USD", "EUR"], default: "USD" },
        payment: { provider: { type: String, enum: ["stripe"] }, intentId: String, paid: { type: Boolean, default: false } },
        status: { type: String, enum: ["pending", "paid", "fulfilled", "cancelled", "refunded"], default: "pending", index: true }
    },
    { timestamps: true, collection: "orders"}
);

export default mongoose.model("Order", OrderSchema);
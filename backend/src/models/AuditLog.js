import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
    {
        action: {type: String, required: true, enum: ["PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE"]},
        targetType: {type: String, required: true, enum: ["product"]},
        targetId: {type: mongoose.Types.ObjectId, required: true, index: true},

        actorId: {type: mongoose.Types.ObjectId, ref: "User", required: true, index: true},
        actorEmail: {type: String, required: true},

        ip: {type: String},
        userAgent: {type: String},

        details: {type: Object, default: {}}
    },
    { timestamps: true, collection: "audit_logs" }
);

export default mongoose.model("AuditLog", AuditLogSchema);
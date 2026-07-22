const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId:             { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    razorpayOrderId:    { type: String, required: true },
    razorpayPaymentId:  { type: String, required: true, unique: true },
    plan:               { type: String, default: "standard" },
    period:             { type: String, enum: ["monthly", "yearly"], required: true },
    amount:             { type: Number, required: true }, // in paise
    currency:           { type: String, default: "INR" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);

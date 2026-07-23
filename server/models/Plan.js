// models/Plan.js - admin-managed subscription plans stored in MongoDB.

const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    planId:           { type: String, required: true, unique: true, trim: true }, // slug e.g. "free", "premium"
    name:             { type: String, required: true, trim: true },
    tagline:          { type: String, default: "" },
    features:         [{ type: String }],
    monthlyPrice:     { type: Number, default: 0 },
    yearlyPrice:      { type: Number, default: 0 },
    yearlyDiscountPct:{ type: Number, default: 0 },  // e.g. 20 = 20% off yearly
    trialDays:        { type: Number, default: 0 },   // 0 = no trial period
    isActive:         { type: Boolean, default: true },
    highlighted:      { type: Boolean, default: false }, // show as recommended
    cta:              { type: String, default: "Get started" },
    order:            { type: Number, default: 0 },   // display sort order
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);

// models/KpiLibrary.js - per-user Tier 1 KPI library (replaces the uploaded
// KPI Excel sheet). One document per user; seeded from core/kpiDefaults on first
// access. The ranking pipeline reads these rows instead of parsing an xlsx.

const mongoose = require("mongoose");

const kpiRowSchema = new mongoose.Schema(
  {
    template: { type: String, required: true, trim: true },
    kpi: { type: String, required: true, trim: true },
    category: { type: String, default: "", trim: true },
    weight: { type: Number, required: true },
    direction: { type: String, enum: ["Higher", "Lower"], required: true },
  },
  { _id: false }
);

const kpiLibrarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, default: "default", trim: true },
    rows: { type: [kpiRowSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KpiLibrary", kpiLibrarySchema);

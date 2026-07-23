// models/AdminLog.js - records every admin action on users.

const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema({
  actorId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorEmail:  { type: String, required: true },
  targetId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  targetEmail: { type: String },
  targetName:  { type: String },
  action:      { type: String, required: true }, // e.g. "plan_change", "trial_date_edit"
  changes:     { type: mongoose.Schema.Types.Mixed }, // { field, from, to }
}, { timestamps: true });

module.exports = mongoose.model("AdminLog", adminLogSchema);

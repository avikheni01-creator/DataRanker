// models/ScreenerSnapshot.js — daily admin-uploaded screener dataset.
// Only one snapshot exists at a time; the admin replaces it on each upload.

const mongoose = require("mongoose");

const screenerSnapshotSchema = new mongoose.Schema({
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },   // absolute path on server disk
  rawMimeType: { type: String, default: "text/csv" },
  columns: [String],
  rows: [mongoose.Schema.Types.Mixed],
});

module.exports = mongoose.model("ScreenerSnapshot", screenerSnapshotSchema);

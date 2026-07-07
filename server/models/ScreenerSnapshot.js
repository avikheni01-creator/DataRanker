// models/ScreenerSnapshot.js — daily admin-uploaded screener dataset.
// Only one snapshot exists at a time; the admin replaces it on each upload.

const mongoose = require("mongoose");

const screenerSnapshotSchema = new mongoose.Schema({
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileName: { type: String, required: true },
  fileBuffer: { type: Buffer, required: true }, // raw file stored in MongoDB (no disk needed)
  rawMimeType: { type: String, default: "text/csv" },
  columns: [String],
  rows: [mongoose.Schema.Types.Mixed],
});

module.exports = mongoose.model("ScreenerSnapshot", screenerSnapshotSchema);

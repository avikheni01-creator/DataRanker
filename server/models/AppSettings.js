const mongoose = require("mongoose");

const AppSettingsSchema = new mongoose.Schema(
  {
    // Pipeline page: allow users to upload their own Screener.in CSV.
    // When false, the upload zone is hidden and users must use the Screener page.
    allowCustomUpload: { type: Boolean, default: true },

    // Feature visibility — hide pages from nav (and redirect direct visits).
    screenerEnabled:   { type: Boolean, default: true },
    comparisonEnabled: { type: Boolean, default: true },

    // When true, regular users can only view their KPI library (Save is disabled).
    kpiEditorLocked: { type: Boolean, default: false },

    // Max rows the Screener page can send to the pipeline. 0 = no limit.
    screenerMaxRows: { type: Number, default: 0, min: 0 },

    // Optional banner shown to every logged-in user. Empty string = no banner.
    maintenanceBanner: { type: String, default: "" },
  },
  { timestamps: true }
);

// Singleton helper — always returns the one document, creating it if missing.
AppSettingsSchema.statics.getOrCreate = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model("AppSettings", AppSettingsSchema);

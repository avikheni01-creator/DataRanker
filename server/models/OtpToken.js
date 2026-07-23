// models/OtpToken.js - short-lived OTP store for password reset and change flows.

const mongoose = require("mongoose");
const crypto = require("crypto");

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const OtpTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, enum: ["reset", "change", "verify"], required: true },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB auto-deletes docs once expiresAt < now.
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OtpTokenSchema.statics.generate = async function (email, purpose) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const key = normEmail(email);
  await this.deleteMany({ email: key, purpose });
  await this.create({ email: key, otpHash: hashOtp(otp), purpose, expiresAt });
  return otp;
};

// Returns true and deletes the token on a match; false otherwise.
OtpTokenSchema.statics.verify = async function (email, otp, purpose) {
  const token = await this.findOne({
    email: normEmail(email),
    purpose,
    expiresAt: { $gt: new Date() },
  });
  if (!token) return false;
  const valid = token.otpHash === hashOtp(String(otp));
  if (valid) await token.deleteOne();
  return valid;
};

module.exports = mongoose.model("OtpToken", OtpTokenSchema);

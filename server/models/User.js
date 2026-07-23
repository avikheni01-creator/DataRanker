// models/User.js - application user with subscription plan.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, sparse: true },
    plan: { type: String, default: "standard" },
    isAdmin: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    trialEndsAt: { type: Date, default: null },         // fixed 3-month trial from signup; never extended
    paidUntil: { type: Date, default: null },           // set on payment; null = never paid
    planOverrideFree: { type: Boolean, default: false }, // admin grants permanent free access
  },
  { timestamps: true }
);

// Hash a plaintext password and store it. Call before save on signup / change.
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

// Shape returned to the client - never leak the hash.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    plan: this.plan,
    isAdmin: this.isAdmin || false,
    emailVerified: this.emailVerified || false,
    hasPassword: Boolean(this.passwordHash),
    trialEndsAt: this.trialEndsAt || null,
    paidUntil: this.paidUntil || null,
    planOverrideFree: this.planOverrideFree || false,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);

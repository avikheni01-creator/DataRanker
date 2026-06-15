// models/User.js — application user with subscription plan.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { PLAN_IDS } = require("../core/plans");

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
    passwordHash: { type: String, required: true },
    plan: { type: String, enum: PLAN_IDS, default: "free" },
  },
  { timestamps: true }
);

// Hash a plaintext password and store it. Call before save on signup / change.
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Shape returned to the client — never leak the hash.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    plan: this.plan,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);

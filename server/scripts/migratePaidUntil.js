// scripts/migratePaidUntil.js
// One-time migration: backfill paidUntil from Payment records for users who paid
// before the trialEndsAt → paidUntil split (commit fc416c6).
//
// Run from server/ directory:
//   node scripts/migratePaidUntil.js
//
// Safe to re-run: only updates users who have Payment records and paidUntil = null.

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Payment = require("../models/Payment");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Find all Payment records grouped by userId
  const payments = await Payment.find({}).sort({ createdAt: 1 }).lean();

  if (payments.length === 0) {
    console.log("No payment records found. Nothing to migrate.");
    return;
  }

  // Group payments by userId
  const byUser = {};
  for (const p of payments) {
    const uid = p.userId.toString();
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(p);
  }

  let updated = 0;
  let skipped = 0;

  for (const [userId, userPayments] of Object.entries(byUser)) {
    const user = await User.findById(userId);
    if (!user) { skipped++; continue; }

    // Already migrated — skip
    if (user.paidUntil) { skipped++; continue; }

    // Reconstruct paidUntil by stacking payments in chronological order
    let paidUntil = null;
    for (const p of userPayments) {
      const daysToAdd = p.period === "yearly" ? 365 : 30;
      const base = paidUntil && paidUntil > new Date(p.createdAt)
        ? paidUntil
        : new Date(p.createdAt);
      paidUntil = new Date(base.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    }

    // Reset trialEndsAt to natural 90-day trial from signup
    const naturalTrialEnd = new Date(
      new Date(user.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000
    );

    await User.findByIdAndUpdate(userId, {
      paidUntil,
      trialEndsAt: naturalTrialEnd,
    });

    console.log(
      `  Updated ${user.email}: paidUntil=${paidUntil.toDateString()}, trialEndsAt reset to ${naturalTrialEnd.toDateString()}`
    );
    updated++;
  }

  console.log(`\nDone. ${updated} user(s) migrated, ${skipped} skipped.`);
}

run()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => mongoose.disconnect());

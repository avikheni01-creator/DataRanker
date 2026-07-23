// routes/payment.js - Razorpay order creation and payment verification.
//
// POST /payment/create-order  (requireAuth)
//   Creates a Razorpay order for the requested period (monthly|yearly).
//   Looks up the active "standard" plan price from MongoDB; falls back to
//   hardcoded paise values if no plan document exists.
//   Returns { orderId, amount, currency, key } to the frontend.
//
// POST /payment/verify  (requireAuth)
//   Verifies the Razorpay HMAC signature, extends user.trialEndsAt by 30 or
//   365 days (stacking on top of the current value when still in the future),
//   records the payment, and returns the updated user.
//
// Both routes return 503 gracefully when Razorpay keys are not configured.

const express = require("express");
const crypto  = require("crypto");
const Razorpay = require("razorpay");
const Plan    = require("../models/Plan");
const Payment = require("../models/Payment");
const User    = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Fallback prices in paise when no Plan document exists (₹499/mo, ₹4,999/yr)
const FALLBACK_PAISE = { monthly: 49900, yearly: 499900 };

function getRazorpay() {
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

// POST /payment/create-order
router.post("/payment/create-order", requireAuth, async (req, res) => {
  const rzp = getRazorpay();
  if (!rzp) {
    return res.status(503).json({ detail: "Payment gateway not configured. Contact support." });
  }

  const { period } = req.body;
  if (!["monthly", "yearly"].includes(period)) {
    return res.status(400).json({ detail: "period must be 'monthly' or 'yearly'" });
  }

  try {
    const plan = await Plan.findOne({ planId: "standard", isActive: true });

    // Use discounted price when set (> 0), otherwise fall back to regular price.
    let amountInPaise;
    if (period === "yearly") {
      const discounted = plan?.yearlyDiscountedPrice || 0;
      const regular    = plan?.yearlyPrice || 0;
      amountInPaise = discounted > 0
        ? Math.round(discounted * 100)
        : (regular > 0 ? Math.round(regular * 100) : FALLBACK_PAISE.yearly);
    } else {
      const discounted = plan?.monthlyDiscountedPrice || 0;
      const regular    = plan?.monthlyPrice || 0;
      amountInPaise = discounted > 0
        ? Math.round(discounted * 100)
        : (regular > 0 ? Math.round(regular * 100) : FALLBACK_PAISE.monthly);
    }

    const order = await rzp.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      receipt:  `r_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes:    { period, userId: req.user._id.toString() },
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const detail = err.message || err.error?.description || err.description || JSON.stringify(err);
    console.error("[payment] create-order error:", detail);
    res.status(500).json({ detail });
  }
});

// POST /payment/verify
router.post("/payment/verify", requireAuth, async (req, res) => {
  const rzp = getRazorpay();
  if (!rzp) {
    return res.status(503).json({ detail: "Payment gateway not configured." });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, period } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ detail: "Missing Razorpay payment fields" });
  }
  if (!["monthly", "yearly"].includes(period)) {
    return res.status(400).json({ detail: "period must be 'monthly' or 'yearly'" });
  }

  // Verify HMAC-SHA256 signature: orderId|paymentId signed with key secret
  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ detail: "Payment signature verification failed" });
  }

  try {
    const daysToAdd = period === "yearly" ? 365 : 30;

    // Record payment first - unique index on razorpayPaymentId guards against replay.
    // isNew = false means this payment was already processed; skip trialEndsAt extension.
    let isNew = true;
    try {
      await Payment.create({
        userId:            req.user._id,
        razorpayOrderId:   razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        plan:              "standard",
        period,
        amount:            period === "yearly" ? FALLBACK_PAISE.yearly : FALLBACK_PAISE.monthly,
        currency:          "INR",
      });
    } catch (dupErr) {
      isNew = false; // duplicate payment_id - already handled
    }

    const user = await User.findById(req.user._id);

    if (isNew) {
      // Base = latest of: current paidUntil, trial end, or now.
      const now = new Date();
      const candidates = [
        now,
        user.paidUntil && user.paidUntil > now ? user.paidUntil : null,
        user.trialEndsAt && user.trialEndsAt > now ? user.trialEndsAt : null,
      ].filter(Boolean);
      const base = new Date(Math.max(...candidates.map((d) => d.getTime())));
      user.paidUntil = new Date(base.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      await user.save();
    }

    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    const detail = err.message || err.error?.description || err.description || JSON.stringify(err);
    console.error("[payment] verify error:", detail);
    res.status(500).json({ detail });
  }
});

module.exports = router;

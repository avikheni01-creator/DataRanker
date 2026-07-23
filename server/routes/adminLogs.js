// routes/adminLogs.js — admin-only unified logs endpoint.
// GET /admin/logs — returns Payment records + AdminLog records merged, newest first.

const express  = require("express");
const Payment  = require("../models/Payment");
const AdminLog = require("../models/AdminLog");
const User     = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/admin/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);

    const [payments, adminLogs] = await Promise.all([
      Payment.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
      AdminLog.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
    ]);

    // Enrich payment records with user info
    const paymentUserIds = [...new Set(payments.map((p) => p.userId.toString()))];
    const paymentUsers   = await User.find({ _id: { $in: paymentUserIds } }, "name email").lean();
    const paymentUserMap = Object.fromEntries(paymentUsers.map((u) => [u._id.toString(), u]));

    const paymentLogs = payments.map((p) => {
      const u = paymentUserMap[p.userId.toString()] || {};
      return {
        id:               p._id.toString(),
        type:             "payment",
        actorEmail:       null,
        targetEmail:      u.email || "—",
        targetName:       u.name  || "—",
        action:           p.period === "yearly" ? "payment_yearly" : "payment_monthly",
        detail:           `₹${(p.amount / 100).toLocaleString("en-IN")} · ${p.period} · ${p.razorpayPaymentId}`,
        razorpayPaymentId: p.razorpayPaymentId,
        razorpayOrderId:  p.razorpayOrderId,
        amount:           p.amount,
        period:           p.period,
        createdAt:        p.createdAt,
      };
    });

    const actionLogs = adminLogs.map((l) => ({
      id:          l._id.toString(),
      type:        "admin_action",
      actorEmail:  l.actorEmail,
      targetEmail: l.targetEmail || "—",
      targetName:  l.targetName  || "—",
      action:      l.action,
      detail:      formatChange(l.action, l.changes),
      changes:     l.changes,
      createdAt:   l.createdAt,
    }));

    // Merge and sort newest first, then take top `limit`
    const merged = [...paymentLogs, ...actionLogs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.json({
      logs:  merged,
      total: merged.length,
      paymentCount:   paymentLogs.length,
      adminLogCount:  actionLogs.length,
    });
  } catch (err) {
    res.status(500).json({ detail: String(err.message || err) });
  }
});

function formatChange(action, changes) {
  if (!changes) return "";
  const { field, from, to } = changes;
  const fmt = (v) => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (field === "trialEndsAt" || field === "paidUntil") {
      return v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
    }
    return String(v);
  };
  return `${field}: ${fmt(from)} → ${fmt(to)}`;
}

module.exports = router;

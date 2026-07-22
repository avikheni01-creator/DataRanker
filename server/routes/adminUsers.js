// routes/adminUsers.js — admin-only user management endpoints.

const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /admin/users — list all users, newest first
router.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash -googleId").sort({ createdAt: -1 });
    return res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
});

// PATCH /admin/users/:id — update plan and/or isAdmin (cannot modify yourself)
router.patch("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ detail: "Invalid user ID" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ detail: "You cannot modify your own account from this panel" });
    }

    const allowed = ["plan", "isAdmin", "planOverrideFree"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ detail: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return res.status(404).json({ detail: "User not found" });
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
});

// DELETE /admin/users/:id — delete a user (cannot delete yourself)
router.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ detail: "Invalid user ID" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ detail: "You cannot delete your own account" });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ detail: "User not found" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
});

module.exports = router;

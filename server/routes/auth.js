// routes/auth.js — mounted at /auth.

const express = require("express");
const { signup, login, me, logout } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

module.exports = router;

// routes/results.js — POST /results/email-summary
// Accepts top-10 company data for all templates as JSON,
// generates a styled PDF via pdfkit, and emails it to the logged-in user.

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { sendRankingsSummaryEmail } = require("../services/mailer");
const { generateRankingsPDF } = require("../services/pdfReport");

const router = express.Router();

router.post("/results/email-summary", requireAuth, async (req, res) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ detail: "No template data provided" });
    }
    const pdfBuffer = await generateRankingsPDF(templates);
    await sendRankingsSummaryEmail(req.user.email, pdfBuffer, templates.length);
    res.json({ ok: true, sentTo: req.user.email });
  } catch (err) {
    res.status(500).json({ detail: err.message || "Email failed" });
  }
});

module.exports = router;

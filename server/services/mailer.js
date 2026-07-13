// services/mailer.js — Gmail SMTP via nodemailer.
// Requires GMAIL_APP_PASSWORD in server .env (Google App Password, not the account password).
// To generate one: Google Account → Security → 2-Step Verification → App passwords.

const nodemailer = require("nodemailer");

const SENDER = "avikheni01@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: SENDER, pass: process.env.GMAIL_APP_PASSWORD },
});

async function sendOtpEmail(to, otp, purpose) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Email service is not configured (GMAIL_APP_PASSWORD not set)");
  }
  const subjects = {
    reset:  "Reset your Matrix password",
    change: "Verify your Matrix password change",
    verify: "Verify your Matrix email address",
  };
  const actions = {
    reset:  "reset your password",
    change: "change your password",
    verify: "verify your email address",
  };
  const subject = subjects[purpose] || "Your Matrix verification code";
  const action  = actions[purpose]  || "continue";

  await transporter.sendMail({
    from: `"Matrix" <${SENDER}>`,
    to,
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#0f0f0f">
        <div style="background:linear-gradient(135deg,#7C6CFF 0%,#4F46E5 100%);height:4px;border-radius:4px 4px 0 0"></div>
        <div style="padding:36px 32px;background:#fff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;letter-spacing:-0.02em">Your verification code</h2>
          <p style="margin:0 0 24px;color:#666;font-size:15px">Use this code to ${action}:</p>
          <div style="font-size:40px;font-weight:700;letter-spacing:10px;padding:20px;background:#f4f4f8;text-align:center;border-radius:10px;margin:0 0 24px;color:#4F46E5">${otp}</div>
          <p style="margin:0 0 8px;color:#666;font-size:13px">This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;color:#999;font-size:12px">If you didn&apos;t request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };

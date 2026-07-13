import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Seo from "../seo";
import { forgotPassword, resetPassword } from "../auth";

const STEP = { EMAIL: "email", OTP: "otp", DONE: "done" };

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await forgotPassword(email);
      setStep(STEP.OTP);
    } catch (err) {
      setError(err.message || "Failed to send code");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email, otp, newPassword);
      setStep(STEP.DONE);
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (step === STEP.DONE) {
    return (
      <AuthLayout
        title="Password reset"
        subtitle="Your password has been updated."
        footer={<Link to="/login">Back to Sign In</Link>}
      >
        <Seo title="Password reset" noindex />
        <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Your password has been changed. You can now sign in with your new password.
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (step === STEP.OTP) {
    return (
      <AuthLayout
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${email}`}
        footer={
          <>
            Didn&apos;t receive it?{" "}
            <button
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline", fontSize: "inherit", padding: 0 }}
              onClick={() => { setStep(STEP.EMAIL); setError(""); }}
            >
              Try again
            </button>
          </>
        }
      >
        <Seo title="Verify code" noindex />
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleReset}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="otp">Verification Code</label>
            <input
              id="otp" type="text" inputMode="numeric" className="auth-input"
              placeholder="123456" maxLength={6}
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code" required
              style={{ letterSpacing: "0.25em", fontSize: 20, textAlign: "center" }}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="np">New Password</label>
            <input
              id="np" type="password" className="auth-input" placeholder="Min. 8 characters"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password" required minLength={8}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="cp">Confirm Password</label>
            <input
              id="cp" type="password" className="auth-input" placeholder="Repeat password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" required
            />
          </div>
          <button type="submit" className="auth-submit" disabled={busy || otp.length < 6}>
            {busy ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send a verification code."
      footer={<><Link to="/login">Back to Sign In</Link></>}
    >
      <Seo title="Forgot password" noindex />
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSendCode}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" className="auth-input" placeholder="you@fund.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required
          />
        </div>
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Sending…" : "Send Code"}
        </button>
      </form>
    </AuthLayout>
  );
}

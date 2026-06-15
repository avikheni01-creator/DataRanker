import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { signUp } from "../auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await signUp({ name: form.name, email: form.email, password: form.password });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start ranking in under a minute."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-field">
          <label className="auth-label" htmlFor="name">Full Name</label>
          <input id="name" className="auth-input" placeholder="Jane Analyst"
            value={form.name} onChange={set("name")} autoComplete="name" required />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="auth-input" placeholder="you@fund.com"
            value={form.email} onChange={set("email")} autoComplete="email" required />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="auth-input" placeholder="At least 8 characters"
            value={form.password} onChange={set("password")} autoComplete="new-password" required />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="confirm">Confirm Password</label>
          <input id="confirm" type="password" className="auth-input" placeholder="••••••••"
            value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
        </div>
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}

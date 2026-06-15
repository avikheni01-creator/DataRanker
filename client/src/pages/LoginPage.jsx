import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { logIn } from "../auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await logIn({ email, password });
      const dest = location.state?.from || "/app";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to run your rankings."
      footer={<>Don&apos;t have an account? <Link to="/signup">Sign up</Link></>}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" className="auth-input" placeholder="you@fund.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
          />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password" type="password" className="auth-input" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required
          />
        </div>
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </AuthLayout>
  );
}

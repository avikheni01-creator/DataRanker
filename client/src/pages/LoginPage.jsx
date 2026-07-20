import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import AuthLayout from "./AuthLayout";
import Seo from "../seo";
import { logIn, googleLogin, isAuthed } from "../auth";
import GoogleButton, { AuthDivider } from "../components/GoogleButton";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dest = location.state?.from || "/app";

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setBusy(true);
      try {
        await googleLogin(tokenResponse.access_token);
        navigate(dest, { replace: true });
      } catch (err) {
        setError(err.message || "Google sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    onError: () => setError("Google sign-in was cancelled or failed"),
  });

  if (isAuthed()) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await logIn({ email, password });
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
      <Seo title="Log in" path="/login" description="Log in to ThinkVest to rank and score your equity universe by industry-specific KPI templates." />
      {error && <div className="auth-error">{error}</div>}
      <GoogleButton onClick={handleGoogle} disabled={busy} label="Continue with Google" />
      <AuthDivider />
      <form onSubmit={handleSubmit}>
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
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link to="/forgot-password" style={{ fontSize: 13, opacity: 0.75 }}>
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

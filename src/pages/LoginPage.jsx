import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { signIn } from "../auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI-only auth: any input signs you in (prototype gate, no real credentials).
  const handleSubmit = (e) => {
    e.preventDefault();
    signIn({ email });
    const dest = location.state?.from || "/app";
    navigate(dest, { replace: true });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to run your rankings."
      footer={<>Don&apos;t have an account? <Link to="/signup">Sign up</Link></>}
    >
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" className="auth-input" placeholder="you@fund.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
          />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password" type="password" className="auth-input" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          />
        </div>
        <button type="submit" className="auth-submit">Sign In</button>
      </form>
    </AuthLayout>
  );
}

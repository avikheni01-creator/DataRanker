import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { signIn } from "../auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // UI-only auth: creating an account just sets the simulated flag.
  const handleSubmit = (e) => {
    e.preventDefault();
    signIn({ name: form.name, email: form.email });
    navigate("/app", { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start ranking in under a minute."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="name">Full Name</label>
          <input id="name" className="auth-input" placeholder="Jane Analyst"
            value={form.name} onChange={set("name")} autoComplete="name" />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="auth-input" placeholder="you@fund.com"
            value={form.email} onChange={set("email")} autoComplete="email" />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="auth-input" placeholder="••••••••"
            value={form.password} onChange={set("password")} autoComplete="new-password" />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="confirm">Confirm Password</label>
          <input id="confirm" type="password" className="auth-input" placeholder="••••••••"
            value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        </div>
        <button type="submit" className="auth-submit">Create Account</button>
      </form>
    </AuthLayout>
  );
}

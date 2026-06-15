"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import { signIn } from "@/lib/auth";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI-only auth: any input signs you in (prototype gate, no real credentials).
  const handleSubmit = (e) => {
    e.preventDefault();
    signIn({ email });
    const from = searchParams.get("from");
    const dest = from ? decodeURIComponent(from) : "/app";
    router.push(dest);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to run your rankings."
      footer={<>Don&apos;t have an account? <Link href="/signup">Sign up</Link></>}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

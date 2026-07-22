import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, fetchMe, updateProfile, requestOtpForChange, changePassword, logOut } from "../auth";
import { apiFetch } from "../api";
import { useThemeMode } from "../theme/ThemeContext";
import { colors, fonts, radius } from "../theme";
import PaymentButton from "../components/PaymentButton";

const PLAN_COLORS = {
  free: "#94A3B8",
  standard: "#3B82F6",
  premium: "#F59E0B",
  enterprise: "#10B981",
};

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 12,
    }}>
      {title && (
        <div style={{
          fontFamily: fonts.mono, fontSize: 10, letterSpacing: ".16em",
          textTransform: "uppercase", color: colors.textMuted,
          padding: "12px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--inset)",
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: "8px 20px 16px" }}>{children}</div>
    </div>
  );
}

function Row({ label, sub, children, borderless }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 20, padding: "14px 0",
      borderBottom: borderless ? "none" : "1px solid var(--border)",
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Banner({ type, children }) {
  const s = {
    success: { bg: "rgba(34,197,94,.10)", border: "rgba(34,197,94,.4)", color: "#22C55E" },
    error:   { bg: "rgba(239,68,68,.10)",  border: "rgba(239,68,68,.4)",  color: "#EF4444" },
    info:    { bg: "rgba(16,185,129,.10)", border: "rgba(16,185,129,.4)", color: "#10B981" },
  }[type] || {};
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: radius.sm,
      padding: "10px 14px", fontSize: 13, color: s.color, marginTop: 10, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

const BTN_PRIMARY = {
  background: "linear-gradient(135deg,#10B981 0%,#1E3A8A 100%)",
  border: "none", borderRadius: radius.sm, color: "#fff",
  fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
  padding: "9px 20px", cursor: "pointer",
  boxShadow: "0 4px 14px rgba(16,185,129,.28)", transition: "opacity .15s",
};
const BTN_GHOST = {
  background: "transparent", border: "1px solid var(--border)",
  borderRadius: radius.sm, color: colors.textSecondary,
  fontSize: 13, fontWeight: 500, fontFamily: fonts.sans,
  padding: "9px 20px", cursor: "pointer",
};
const INPUT_STYLE = {
  background: "var(--inset)", border: "1px solid var(--border)",
  borderRadius: radius.sm, color: colors.text,
  fontFamily: fonts.sans, fontSize: 13,
  padding: "8px 12px", boxSizing: "border-box", outline: "none",
};

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileSection({ user, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true); setStatus(null);
    try {
      const updated = await updateProfile(name.trim());
      onUpdate(updated);
      setEditing(false);
      setStatus({ type: "success", msg: "Name updated." });
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Update failed" });
    } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Profile">
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0 12px" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg,#10B981,#1E3A8A)",
          color: "#fff", fontSize: 20, fontWeight: 700,
          boxShadow: "0 0 18px rgba(16,185,129,.35)",
        }}>{initial}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{user.name || "—"}</div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>{user.email}</div>
          {user.isAdmin && (
            <span style={{
              display: "inline-block", marginTop: 4,
              fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
              color: "#10B981", background: "rgba(16,185,129,.12)",
              border: "1px solid rgba(16,185,129,.3)",
              borderRadius: 999, padding: "2px 8px",
            }}>Admin</span>
          )}
        </div>
      </div>

      {status && <Banner type={status.type}>{status.msg}</Banner>}

      <Row label="Display name">
        {editing ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...INPUT_STYLE, width: 180 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <button style={BTN_PRIMARY} onClick={handleSave} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button style={BTN_GHOST} onClick={() => { setEditing(false); setName(user.name || ""); }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: colors.text, fontSize: 14 }}>{user.name || "—"}</span>
            <button style={BTN_GHOST} onClick={() => setEditing(true)}>Edit</button>
          </div>
        )}
      </Row>

      <Row label="Email" borderless>
        <span style={{ color: colors.textSecondary, fontSize: 14 }}>{user.email}</span>
      </Row>

      <div style={{ fontSize: 12, color: colors.textMuted, paddingTop: 6, paddingBottom: 4 }}>
        Member since {joined}
      </div>
    </SectionCard>
  );
}

// ── Membership ────────────────────────────────────────────────────────────────

function MembershipSection({ user, onUpdate }) {
  const [planData,   setPlanData]   = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);

  useEffect(() => {
    apiFetch("/plans")
      .then((plans) => {
        const match = plans.find((p) => p.id === user.plan);
        setPlanData(match || null);
      })
      .catch(() => {});
  }, [user.plan]);

  const planColor = PLAN_COLORS[user.plan] || "#94A3B8";

  // Trial calculations.
  // Standard plan users get 90 days free from signup. Derive from createdAt when
  // trialEndsAt is absent (e.g. accounts that predate the field, or stale cache).
  const trialEnd = (() => {
    if (user.trialEndsAt) return new Date(user.trialEndsAt);
    if (user.plan === "standard" && user.createdAt) {
      return new Date(new Date(user.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000);
    }
    return null;
  })();
  const trialDaysLeft = trialEnd
    ? Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;
  const trialEndLabel = trialEnd
    ? trialEnd.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Pricing from plan data (supports both DB and fallback formats)
  const monthlyPrice = planData?.monthlyPrice ?? planData?.price ?? null;
  const yearlyPrice  = planData?.yearlyPrice  ?? null;
  const pricingText = (() => {
    if (monthlyPrice === 0 || monthlyPrice == null) return null;
    return `₹${monthlyPrice}/month`;
  })();

  return (
    <SectionCard title="Membership">
      <div style={{ paddingTop: 14 }}>

        {/* Current plan badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "capitalize",
            color: planColor, background: `${planColor}1a`,
            border: `1px solid ${planColor}44`, borderRadius: 999, padding: "4px 12px",
          }}>{user.plan || "standard"} plan</span>
          {user.planOverrideFree && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#22C55E",
              background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)",
              borderRadius: 999, padding: "2px 8px",
            }}>Free access — admin granted</span>
          )}
        </div>

        {/* Trial status block */}
        {trialEnd && !user.planOverrideFree && (
          <div style={{
            borderRadius: radius.sm, marginBottom: 16, overflow: "hidden",
            border: `1px solid ${trialExpired ? "rgba(239,68,68,.3)" : "rgba(245,158,11,.3)"}`,
          }}>
            {/* Header bar */}
            <div style={{
              padding: "10px 14px",
              background: trialExpired ? "rgba(239,68,68,.1)" : "rgba(245,158,11,.08)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={trialExpired ? "#EF4444" : "#F59E0B"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: trialExpired ? "#EF4444" : "#F59E0B" }}>
                  {trialExpired
                    ? `Free trial ended on ${trialEndLabel}`
                    : `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} remaining`}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  {trialExpired
                    ? "Your 90-day free access period has expired"
                    : `Trial ends on ${trialEndLabel}`}
                </div>
              </div>
            </div>
            {/* After-trial info */}
            <div style={{
              padding: "12px 14px",
              background: "var(--inset)",
              borderTop: `1px solid ${trialExpired ? "rgba(239,68,68,.2)" : "rgba(245,158,11,.15)"}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>
                {trialExpired ? "What happens next" : "After your trial ends"}
              </div>
              <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.55 }}>
                A paid subscription is required to continue accessing ThinkVest.
                {pricingText && <> The <strong style={{ color: colors.text }}>Standard plan</strong> is priced at <strong style={{ color: colors.text }}>{pricingText}</strong>.</>}
                {" "}Contact us at{" "}
                <a href="mailto:connect@thinkvest.in" style={{ color: "#10B981", textDecoration: "none" }}>
                  connect@thinkvest.in
                </a>
                {" "}to activate your plan.
              </div>
              {trialExpired && (
                <a
                  href="/app/upgrade"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 12, background: "linear-gradient(135deg,#10B981 0%,#1E3A8A 100%)",
                    border: "none", borderRadius: radius.sm, color: "#fff",
                    fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
                    padding: "9px 18px", textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(16,185,129,.28)",
                  }}
                >
                  Go to upgrade page
                </a>
              )}
            </div>
          </div>
        )}

        {/* Free-override note */}
        {user.planOverrideFree && (
          <div style={{
            padding: "10px 14px", borderRadius: radius.sm, marginBottom: 16,
            background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.25)",
            fontSize: 13, color: "#22C55E",
          }}>
            Your account has permanent free access granted by an administrator.
          </div>
        )}

        {/* Plan features */}
        {planData?.features?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: fonts.mono, letterSpacing: ".1em", textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 }}>
              Included features
            </div>
            {planData.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5, fontSize: 13, color: colors.textSecondary }}>
                <span style={{ color: "#10B981", marginTop: 1, flexShrink: 0 }}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        {user.plan !== "premium" && user.plan !== "enterprise" && !trialExpired && (
          <a
            href="/app/premium"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(124,108,255,.15)", border: "1px solid rgba(124,108,255,.35)",
              borderRadius: radius.sm, color: "#A78BFA",
              fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
              padding: "9px 18px", textDecoration: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,108,255,.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,108,255,.15)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            View Premium features
          </a>
        )}

        {/* Payment section — shown for standard-plan users who haven't been granted free access */}
        {user.plan === "standard" && !user.planOverrideFree && (
          <div style={{
            marginTop: 20, paddingTop: 18,
            borderTop: "1px solid var(--border)",
          }}>
            <div style={{
              fontSize: 11, fontFamily: fonts.mono, letterSpacing: ".1em",
              textTransform: "uppercase", color: colors.textMuted, marginBottom: 14,
            }}>
              Continue access
            </div>

            {paySuccess && (
              <Banner type="success">
                Payment successful — your access is extended to{" "}
                <strong>
                  {new Date(paySuccess.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </strong>.
              </Banner>
            )}

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: paySuccess ? 14 : 0 }}>
              <PaymentButton
                period="monthly"
                user={user}
                label="Pay Monthly"
                priceLabel={`₹${monthlyPrice || 499} / month`}
                onSuccess={(updated) => { setPaySuccess(updated); onUpdate(updated); }}
              />
              <PaymentButton
                period="yearly"
                user={user}
                label="Pay Yearly"
                priceLabel={`₹${yearlyPrice || 4999} / year`}
                discountLabel={planData?.yearlyDiscountPct ? `Save ${planData.yearlyDiscountPct}%` : undefined}
                onSuccess={(updated) => { setPaySuccess(updated); onUpdate(updated); }}
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Security ──────────────────────────────────────────────────────────────────

const PWD_STATE = { IDLE: "idle", SENT: "sent", DONE: "done" };

function SecuritySection({ hasPassword }) {
  const [pwdState, setPwdState] = useState(PWD_STATE.IDLE);
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequestOtp = async () => {
    setError(""); setBusy(true);
    try { await requestOtpForChange(); setPwdState(PWD_STATE.SENT); }
    catch (err) { setError(err.message || "Failed to send code"); }
    finally { setBusy(false); }
  };

  const handleChange = async (e) => {
    e.preventDefault(); setError("");
    if (newPwd !== confirmPwd) { setError("Passwords do not match"); return; }
    if (newPwd.length < 8) { setError("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      await changePassword(otp, newPwd);
      setPwdState(PWD_STATE.DONE);
      setSuccess("Password changed successfully.");
      setOtp(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) { setError(err.message || "Failed to change password"); }
    finally { setBusy(false); }
  };

  if (!hasPassword) {
    return (
      <SectionCard title="Security">
        <div style={{ padding: "14px 0 4px", color: colors.textMuted, fontSize: 14, lineHeight: 1.6 }}>
          Your account uses <strong style={{ color: colors.text }}>Google Sign-In</strong>. Password changes are managed through your Google account.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Security">
      {success && <Banner type="success">{success}</Banner>}
      {error && <Banner type="error">{error}</Banner>}

      <div style={{ paddingTop: 14 }}>
        {pwdState === PWD_STATE.IDLE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Password</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 3 }}>A verification code will be sent to your email.</div>
            </div>
            <button style={BTN_PRIMARY} onClick={handleRequestOtp} disabled={busy}>
              {busy ? "Sending…" : "Change Password"}
            </button>
          </div>
        )}

        {pwdState === PWD_STATE.SENT && (
          <form onSubmit={handleChange} style={{ maxWidth: 380 }}>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>
              A 6-digit code was sent to your email.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>Verification Code</label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                style={{ ...INPUT_STYLE, width: "100%", letterSpacing: "0.25em", fontSize: 18, textAlign: "center" }}
                placeholder="123456" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>New Password</label>
              <input type="password" style={{ ...INPUT_STYLE, width: "100%" }} placeholder="Min. 8 characters"
                value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" required minLength={8} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>Confirm Password</label>
              <input type="password" style={{ ...INPUT_STYLE, width: "100%" }} placeholder="Repeat password"
                value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" required />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={BTN_PRIMARY} disabled={busy || otp.length < 6}>{busy ? "Saving…" : "Update Password"}</button>
              <button type="button" style={BTN_GHOST} onClick={() => { setPwdState(PWD_STATE.IDLE); setError(""); }}>Cancel</button>
            </div>
          </form>
        )}

        {pwdState === PWD_STATE.DONE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Password</div>
            <button style={BTN_GHOST} onClick={() => { setPwdState(PWD_STATE.IDLE); setSuccess(""); }}>Change again</button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Appearance ────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <SectionCard title="Appearance">
      <Row label="Theme" sub={isDark ? "Currently: Dark mode" : "Currently: Light mode"} borderless>
        <button
          onClick={toggle}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)",
            border: "1px solid var(--border)", borderRadius: radius.sm,
            color: colors.text, fontSize: 13, fontWeight: 500,
            fontFamily: fonts.sans, padding: "8px 16px", cursor: "pointer",
          }}
        >
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
          Switch to {isDark ? "Light" : "Dark"} mode
        </button>
      </Row>
    </SectionCard>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();

  // Refresh from server so stale localStorage never hides trialEndsAt or plan changes.
  useEffect(() => {
    fetchMe().then((fresh) => { if (fresh) setUser(fresh); }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logOut();
    navigate("/");
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="us-page">
        <div className="us-header">
          <div className="us-eyebrow">Settings</div>
          <h1 className="us-title">Account Settings</h1>
          <p className="us-sub">Manage your profile, membership, and preferences.</p>
        </div>

        <ProfileSection user={user} onUpdate={(updated) => setUser((u) => ({ ...u, ...updated }))} />
        <MembershipSection user={user} onUpdate={(updated) => setUser((u) => ({ ...u, ...updated }))} />
        <SecuritySection hasPassword={user.hasPassword !== false} />
        <AppearanceSection />

        <div style={{
          marginTop: 8, padding: "16px 20px",
          background: "var(--card)", border: "1px solid rgba(239,68,68,.25)",
          borderRadius: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Sign out</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Sign out of your ThinkVest account on this device.</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)",
                borderRadius: radius.sm, color: "#EF4444",
                fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
                padding: "9px 18px", cursor: "pointer", transition: "background .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
  .us-page {
    max-width: 640px; margin: 0 auto;
    padding: 36px 32px 64px;
    font-family: ${fonts.sans};
  }
  .us-header { margin-bottom: 24px; }
  .us-eyebrow {
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .2em; text-transform: uppercase;
    color: ${colors.accentHover}; margin-bottom: 8px;
  }
  .us-title {
    font-family: 'Space Grotesk', ${fonts.sans};
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: ${colors.text}; margin: 0 0 6px;
  }
  .us-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; }

  @media (max-width: 640px) {
    .us-page { padding: 24px 16px 48px; }
  }
`;

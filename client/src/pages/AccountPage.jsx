import { useState } from "react";
import { getUser, updateProfile, requestOtpForChange, changePassword } from "../auth";
import { colors, fonts, radius } from "../theme";

function Banner({ type, children }) {
  const styles = {
    success: { bg: "rgba(34,197,94,.10)", border: "rgba(34,197,94,.4)", color: "#22C55E" },
    error:   { bg: "rgba(239,68,68,.10)",  border: "rgba(239,68,68,.4)",  color: "#EF4444" },
    info:    { bg: "rgba(124,108,255,.10)", border: "rgba(124,108,255,.4)", color: "#7C6CFF" },
  }[type] || {};
  return (
    <div style={{
      background: styles.bg, border: `1px solid ${styles.border}`,
      borderRadius: radius.sm, padding: "11px 16px",
      fontSize: 13, color: styles.color, marginBottom: 16, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 16,
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
      <div style={{ padding: "4px 20px" }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 24, padding: "16px 0", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>{children}</div>
    </div>
  );
}

const INPUT_STYLE = {
  background: "var(--inset)", border: "1px solid var(--border)",
  borderRadius: radius.sm, color: colors.text,
  fontFamily: fonts.sans, fontSize: 13,
  padding: "8px 12px", width: "100%", boxSizing: "border-box",
  outline: "none",
};

const BTN_PRIMARY = {
  background: "linear-gradient(135deg,#7C6CFF 0%,#4F46E5 100%)",
  border: "none", borderRadius: radius.sm, color: "#fff",
  fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
  padding: "9px 20px", cursor: "pointer",
  boxShadow: "0 4px 14px rgba(124,108,255,.28)", transition: "all .18s",
};

const BTN_GHOST = {
  background: "transparent", border: "1px solid var(--border)",
  borderRadius: radius.sm, color: colors.textSecondary,
  fontSize: 13, fontWeight: 500, fontFamily: fonts.sans,
  padding: "9px 20px", cursor: "pointer", transition: "all .15s",
};

const PLAN_COLORS = { free: "#94A3B8", premium: "#F59E0B", enterprise: "#7C6CFF" };

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileCard({ user, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const updated = await updateProfile(name.trim());
      onUpdate(updated);
      setEditing(false);
      setStatus({ type: "success", msg: "Name updated." });
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Update failed" });
    } finally {
      setBusy(false);
    }
  };

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <Card title="Profile">
      {status && <div style={{ marginTop: 12 }}><Banner type={status.type}>{status.msg}</Banner></div>}

      <Row label="Name">
        {editing ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <input
              style={{ ...INPUT_STYLE, width: 200 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <button style={BTN_PRIMARY} onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button style={BTN_GHOST} onClick={() => { setEditing(false); setName(user.name || ""); }}>
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
            <span style={{ color: colors.text, fontSize: 14 }}>{user.name || "—"}</span>
            <button style={BTN_GHOST} onClick={() => setEditing(true)}>Edit</button>
          </div>
        )}
      </Row>

      <Row label="Email">
        <span style={{ color: colors.textSecondary, fontSize: 14 }}>{user.email}</span>
      </Row>

      <Row label="Plan">
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "capitalize",
          color: PLAN_COLORS[user.plan] || colors.textMuted,
          background: `${PLAN_COLORS[user.plan] || colors.textMuted}18`,
          border: `1px solid ${PLAN_COLORS[user.plan] || colors.textMuted}44`,
          borderRadius: 999, padding: "3px 10px",
        }}>
          {user.plan || "free"}
        </span>
      </Row>

      <Row label="Member since">
        <span style={{ color: colors.textSecondary, fontSize: 14 }}>{joined}</span>
      </Row>

      {user.isAdmin && (
        <Row label="Role">
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: ".06em",
            color: "#7C6CFF", background: "rgba(124,108,255,.12)",
            border: "1px solid rgba(124,108,255,.3)",
            borderRadius: 999, padding: "3px 10px",
          }}>
            Admin
          </span>
        </Row>
      )}
    </Card>
  );
}

// ── Security / change password section ───────────────────────────────────────

const PWD_STATE = { IDLE: "idle", SENT: "sent", DONE: "done" };

function SecurityCard({ hasPassword }) {
  const [pwdState, setPwdState] = useState(PWD_STATE.IDLE);
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!hasPassword) {
    return (
      <Card title="Security">
        <div style={{ padding: "20px 0", color: colors.textMuted, fontSize: 14, lineHeight: 1.6 }}>
          Your account uses <strong style={{ color: colors.text }}>Google Sign-In</strong> — no password is set.
          Password changes are managed through your Google account.
        </div>
      </Card>
    );
  }

  const handleRequestOtp = async () => {
    setError(""); setBusy(true);
    try {
      await requestOtpForChange();
      setPwdState(PWD_STATE.SENT);
    } catch (err) {
      setError(err.message || "Failed to send code");
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    setError("");
    if (newPwd !== confirmPwd) { setError("Passwords do not match"); return; }
    if (newPwd.length < 8) { setError("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      await changePassword(otp, newPwd);
      setPwdState(PWD_STATE.DONE);
      setSuccess("Password changed successfully.");
      setOtp(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setPwdState(PWD_STATE.IDLE); setError(""); setSuccess(""); };

  return (
    <Card title="Security">
      {success && <div style={{ marginTop: 12 }}><Banner type="success">{success}</Banner></div>}
      {error && <div style={{ marginTop: 12 }}><Banner type="error">{error}</Banner></div>}

      <div style={{ padding: "16px 0" }}>
        {pwdState === PWD_STATE.IDLE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Password</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 3 }}>
                A verification code will be sent to your email.
              </div>
            </div>
            <button style={BTN_PRIMARY} onClick={handleRequestOtp} disabled={busy}>
              {busy ? "Sending…" : "Change Password"}
            </button>
          </div>
        )}

        {pwdState === PWD_STATE.SENT && (
          <form onSubmit={handleChange} style={{ maxWidth: 400 }}>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>
              A 6-digit code was sent to your email. Enter it below along with your new password.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>
                Verification Code
              </label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                style={{ ...INPUT_STYLE, letterSpacing: "0.25em", fontSize: 18, textAlign: "center" }}
                placeholder="123456"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password" style={INPUT_STYLE} placeholder="Min. 8 characters"
                value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password" required minLength={8}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type="password" style={INPUT_STYLE} placeholder="Repeat password"
                value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password" required
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={BTN_PRIMARY} disabled={busy || otp.length < 6}>
                {busy ? "Saving…" : "Update Password"}
              </button>
              <button type="button" style={BTN_GHOST} onClick={reset}>Cancel</button>
            </div>
          </form>
        )}

        {pwdState === PWD_STATE.DONE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Password</div>
            <button style={BTN_GHOST} onClick={reset}>Change again</button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const [user, setUser] = useState(getUser());

  return (
    <>
      <style>{CSS}</style>
      <div className="ac-page">
        <div className="ac-header">
          <div className="ac-eyebrow">Account</div>
          <h1 className="ac-title">Your Profile</h1>
          <p className="ac-sub">Manage your account details and security settings.</p>
        </div>

        <div className="ac-body">
          <ProfileCard user={user} onUpdate={(updated) => setUser((u) => ({ ...u, ...updated }))} />
          <SecurityCard hasPassword={user.hasPassword !== false} />
        </div>
      </div>
    </>
  );
}

const CSS = `
  .ac-page {
    max-width: 680px; margin: 0 auto;
    padding: 36px 32px 64px;
    font-family: ${fonts.sans};
  }
  .ac-header { margin-bottom: 28px; }
  .ac-eyebrow {
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .2em; text-transform: uppercase;
    color: ${colors.accentHover}; margin-bottom: 8px;
  }
  .ac-title {
    font-family: 'Space Grotesk', ${fonts.sans};
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: ${colors.text}; margin: 0 0 6px;
  }
  .ac-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; line-height: 1.55; }
  .ac-body { display: flex; flex-direction: column; gap: 0; }

  @media (max-width: 640px) {
    .ac-page { padding: 24px 16px 48px; }
  }
`;

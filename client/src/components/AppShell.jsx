import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { logOut, getUser, verifyEmail, resendVerification } from "../auth";
import Seo from "../seo";
import { colors, gradients, fonts, radius } from "../theme";
import { useAppConfig, useRefreshAppConfig } from "../AppConfigContext";

// Icons kept as tiny inline SVGs so we don't add an icon dependency.
const Icon = ({ d, paths }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths ? paths.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const BASE_NAV = [
  { to: "/app", end: true, label: "Pipeline", icon: <Icon paths={["M3 3v18h18", "M7 14l4-4 3 3 5-6"]} />, flag: "allowCustomUpload" },
  { to: "/app/screener", label: "Screener", icon: <Icon paths={["M3 6h18", "M3 12h18", "M3 18h18"]} />, flag: "screenerEnabled" },
  { to: "/app/results", label: "Results", icon: <Icon paths={["M4 19V9", "M10 19V5", "M16 19v-7", "M22 19H2"]} /> },
  { to: "/app/comparison", label: "Compare", icon: <Icon paths={["M18 20V10", "M12 20V4", "M6 20v-6"]} />, flag: "comparisonEnabled" },
];

const KPI_NAV = { to: "/app/kpi-editor", label: "KPI Editor", icon: <Icon paths={["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"]} /> };
const SETTINGS_NAV = { to: "/app/settings", label: "Settings", icon: <Icon paths={["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"]} /> };
const ADMIN_USERS_NAV = { to: "/app/admin/users", label: "Users", icon: <Icon paths={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} /> };

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const appConfig = useAppConfig();
  const refreshAppConfig = useRefreshAppConfig();

  // Email verification banner state
  const [showVerifyBanner, setShowVerifyBanner] = useState(
    user && user.emailVerified === false
  );
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyStep, setVerifyStep] = useState("prompt"); // "prompt" | "otp" | "busy"
  const [verifyError, setVerifyError] = useState("");

  // Fetch live settings as soon as the authenticated shell mounts.
  // This handles the login flow where App.js's initial fetch got a 401.
  useEffect(() => { refreshAppConfig(); }, [refreshAppConfig]);

  // Filter nav items by feature flags
  const NAV = BASE_NAV.filter((item) => !item.flag || appConfig[item.flag] !== false);
  const items = [...NAV, KPI_NAV, ...(user?.isAdmin ? [ADMIN_USERS_NAV, SETTINGS_NAV] : [])];

  const topNav = ["/app", "/app/results", "/app/kpi-editor", "/app/screener", "/app/comparison", "/app/settings", "/app/account", "/app/admin/users"].includes(location.pathname);

  const handleSignOut = async () => {
    await logOut();
    navigate("/");
  };

  const handleResendVerification = async () => {
    setVerifyError("");
    setVerifyStep("busy");
    try {
      await resendVerification();
      setVerifyStep("otp");
    } catch {
      setVerifyStep("prompt");
      setVerifyError("Failed to send code. Try again.");
    }
  };

  const handleVerifyEmail = async () => {
    if (verifyOtp.length < 6) return;
    setVerifyError("");
    setVerifyStep("busy");
    try {
      await verifyEmail(verifyOtp);
      setShowVerifyBanner(false);
    } catch (err) {
      setVerifyError(err.message || "Invalid code");
      setVerifyStep("otp");
    }
  };

  const initial = (user.name || user.email || "M").trim().charAt(0).toUpperCase();

  return (
    <div className={`shell${topNav ? " topbar" : ""}`}>
      <Seo title="Workspace" noindex description="Matrix workspace — the signed-in ranking pipeline, column mapper, results dashboard and KPI editor." />
      <style>{SHELL_CSS}</style>

      <aside className="shell-side">
        <div className="shell-brand"><Logo size={22} /></div>

        <div className="shell-section">Workspace</div>
        <nav className="shell-nav">
          {items.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `shell-link ${isActive ? "active" : ""}`}>
              <span className="shell-link-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-user">
          <NavLink to="/app/account" className="shell-avatar" title="Account" aria-label="Account">{initial}</NavLink>
          <div className="shell-user-meta">
            <div className="shell-user-name">{user.name || "Analyst"}</div>
            <div className="shell-user-email">{user.email || "matrix prototype"}</div>
          </div>
          <ThemeToggle size={34} />
          <button className="shell-signout" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
            <Icon paths={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]} />
          </button>
        </div>
      </aside>

      <main className="shell-main">
        {/* Email verification banner */}
        {showVerifyBanner && (
          <div className="shell-verify-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>Please verify your email address.</span>
            {verifyStep === "prompt" && (
              <>
                <button className="shell-verify-btn" onClick={handleResendVerification}>Send Code</button>
                <button className="shell-verify-dismiss" onClick={() => setShowVerifyBanner(false)} aria-label="Dismiss">×</button>
              </>
            )}
            {verifyStep === "otp" && (
              <>
                <input
                  className="shell-verify-input" type="text" inputMode="numeric"
                  maxLength={6} placeholder="6-digit code"
                  value={verifyOtp} onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
                <button className="shell-verify-btn" onClick={handleVerifyEmail} disabled={verifyOtp.length < 6}>Verify</button>
                {verifyError && <span className="shell-verify-error">{verifyError}</span>}
              </>
            )}
            {verifyStep === "busy" && <span style={{ fontSize: 12, opacity: 0.7 }}>Please wait…</span>}
          </div>
        )}

        {appConfig.maintenanceBanner && (
          <div className="shell-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {appConfig.maintenanceBanner}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

const SHELL_CSS = `
  .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; font-family: ${fonts.sans}; }

  .shell-side {
    position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-right: 1px solid ${colors.glassBorder}; padding: 22px 14px 16px;
  }
  .shell-brand { padding: 6px 10px 24px; }

  .shell-section { font-family: ${fonts.mono}; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: ${colors.textMuted}; padding: 0 12px 10px; }

  .shell-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .shell-link { position: relative; display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: ${radius.sm}; color: ${colors.textSecondary}; font-size: 14px; font-weight: 500; transition: all .15s ease; }
  .shell-link:hover { color: ${colors.text}; background: rgba(255,255,255,0.05); }
  .shell-link.active { color: ${colors.text}; background: linear-gradient(90deg, rgba(124,108,255,0.18), rgba(124,108,255,0.05)); box-shadow: inset 0 0 0 1px rgba(124,108,255,0.28); }
  .shell-link.active::before { content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 3px; background: ${gradients.brand}; box-shadow: 0 0 10px rgba(124,108,255,0.6); }
  .shell-link-icon { display: inline-flex; color: inherit; opacity: .85; }
  .shell-link.active .shell-link-icon { color: ${colors.accentHover}; opacity: 1; }

  .shell-user { display: flex; align-items: center; gap: 10px; padding: 12px 10px 4px; border-top: 1px solid ${colors.glassBorder}; margin-top: 8px; }
  .shell-avatar { width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${gradients.brand}; color: #fff; font-weight: 700; font-size: 14px; box-shadow: 0 0 16px rgba(124,108,255,0.35); text-decoration: none; transition: box-shadow .15s, transform .15s; }
  .shell-avatar:hover { box-shadow: 0 0 22px rgba(124,108,255,0.55); transform: scale(1.06); }
  .shell-user-meta { flex: 1; min-width: 0; }
  .shell-user-name { font-size: 13px; font-weight: 600; color: ${colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell-user-email { font-size: 11px; color: ${colors.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell-signout { background: transparent; border: none; color: ${colors.textMuted}; cursor: pointer; padding: 6px; border-radius: ${radius.sm}; display: inline-flex; transition: all .15s; }
  .shell-signout:hover { color: ${colors.negative}; background: ${colors.negativeSoft}; }

  .shell-main { min-width: 0; }

  .shell-verify-banner {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 9px 20px; font-size: 13px;
    background: rgba(59,130,246,.10); color: #60A5FA;
    border-bottom: 1px solid rgba(59,130,246,.25);
  }
  .shell-verify-btn {
    padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
    background: rgba(59,130,246,.2); border: 1px solid rgba(59,130,246,.4);
    color: #93C5FD; cursor: pointer; transition: background .15s;
  }
  .shell-verify-btn:hover:not(:disabled) { background: rgba(59,130,246,.35); }
  .shell-verify-btn:disabled { opacity: .45; cursor: not-allowed; }
  .shell-verify-input {
    padding: 4px 10px; border-radius: 6px; font-size: 13px; width: 110px;
    background: rgba(0,0,0,.2); border: 1px solid rgba(59,130,246,.4);
    color: #E2E8F0; letter-spacing: .15em; text-align: center;
    outline: none;
  }
  .shell-verify-dismiss {
    margin-left: auto; background: transparent; border: none; color: inherit;
    font-size: 18px; cursor: pointer; opacity: .6; line-height: 1; padding: 0 4px;
  }
  .shell-verify-dismiss:hover { opacity: 1; }
  .shell-verify-error { font-size: 12px; color: #F87171; }

  .shell-banner {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 20px; font-size: 13px;
    background: rgba(245,158,11,.12); color: #F59E0B;
    border-bottom: 1px solid rgba(245,158,11,.25);
  }

  /* Results / KPI-editor page: horizontal top bar, full-height content. */
  .shell.topbar { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: 100vh; overflow: hidden; }
  .shell.topbar .shell-main { min-height: 0; overflow-y: auto; }
  .shell.topbar .shell-side {
    position: sticky; top: 0; z-index: 20; height: auto; flex-direction: row;
    align-items: center; gap: 8px; padding: 12px 18px; overflow-x: auto;
    border-right: none; border-bottom: 1px solid ${colors.glassBorder};
  }
  .shell.topbar .shell-brand { padding: 0 8px 0 4px; }
  .shell.topbar .shell-section { display: none; }
  .shell.topbar .shell-nav { flex-direction: row; flex: 1; }
  .shell.topbar .shell-link { white-space: nowrap; }
  .shell.topbar .shell-link.active::before { display: none; }
  .shell.topbar .shell-user { border-top: none; margin-top: 0; padding: 0; }
  .shell.topbar .shell-user-meta { display: none; }

  @media (max-width: 760px) {
    .shell { grid-template-columns: 1fr; }
    .shell-side { position: static; height: auto; flex-direction: row; align-items: center; gap: 8px; padding: 12px; overflow-x: auto; }
    .shell-brand { padding: 0 8px 0 4px; }
    .shell-section { display: none; }
    .shell-nav { flex-direction: row; flex: 1; }
    .shell-link.active::before { display: none; }
    .shell-link { white-space: nowrap; }
    .shell-user { border-top: none; margin-top: 0; padding: 0; }
    .shell-user-meta { display: none; }
  }
`;

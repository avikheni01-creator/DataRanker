import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { getUser, verifyEmail, resendVerification } from "../auth";
import Seo from "../seo";
import { colors, gradients, fonts, radius } from "../theme";
import { useAppConfig, useRefreshAppConfig } from "../AppConfigContext";

const CHANGELOG_VERSION = "v1.3";
const CHANGELOG = [
  {
    v: "v1.3", date: "Jul 2026",
    items: [
      "DSL filter autocomplete with suggestion history",
      "Pipeline stage progress overlay",
      "Filter presets - save named filters with one click",
      "Sector breakdown chart in Results",
      "Email results to your inbox",
      "Live stats on landing page",
      "Real 404 page and keyboard accessibility pass",
    ],
  },
  {
    v: "v1.2", date: "Jun 2026",
    items: [
      "Company comparison dashboard (radar, leaderboard, scatter)",
      "Results column ordering - Identifiers → KPIs → Other",
      "Results pagination (25 / 50 / 100 / 200 per page)",
      "Admin screener snapshot upload",
    ],
  },
  {
    v: "v1.1", date: "Jun 2026",
    items: [
      "Live screener with formula DSL filter",
      "Column picker with three-section grouping",
      "MERN migration - pipeline now runs server-side",
      "Light / dark theme toggle",
    ],
  },
];

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

const KPI_NAV     = { to: "/app/kpi-editor", label: "KPI Editor", icon: <Icon paths={["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"]} /> };
const PREMIUM_NAV = { to: "/app/premium", label: "Premium", cls: "shell-link-premium", icon: <Icon paths={["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"]} /> };
const SETTINGS_NAV = { to: "/app/settings", label: "Settings", icon: <Icon paths={["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"]} /> };
const ADMIN_USERS_NAV = { to: "/app/admin/users", label: "Users", icon: <Icon paths={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} /> };
const ADMIN_PLANS_NAV = { to: "/app/admin/plans", label: "Plans", icon: <Icon paths={["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", "M5 3h14", "M5 21h14"]} /> };
const ADMIN_LOGS_NAV  = { to: "/app/admin/logs",  label: "Logs",  icon: <Icon paths={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"]} /> };

export default function AppShell() {
  const location = useLocation();
  const user = getUser();
  const appConfig = useAppConfig();
  const refreshAppConfig = useRefreshAppConfig();

  // Email verification banner state
  const [showVerifyBanner, setShowVerifyBanner] = useState(
    user && user.emailVerified === false
  );
  const [verifyOtp, setVerifyOtp] = useState("");
  // If signup already emailed a code, open directly on the code-entry step.
  // Read-only here (safe under StrictMode double-invoke); the flag is cleared in an effect below.
  const [verifyStep, setVerifyStep] = useState(() => {
    try {
      return localStorage.getItem("thinkvest_verify_sent") === "1" ? "otp" : "prompt";
    } catch { return "prompt"; } // "prompt" | "otp" | "busy"
  });
  const [verifyError, setVerifyError] = useState("");
  // Consume the one-shot "code already sent on signup" flag after mount.
  useEffect(() => {
    try { localStorage.removeItem("thinkvest_verify_sent"); } catch { /* ignore */ }
  }, []);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    setHasNew(localStorage.getItem("thinkvest_changelog_seen") !== CHANGELOG_VERSION);
  }, []);
  const openChangelog = () => {
    setShowChangelog(true);
    setHasNew(false);
    localStorage.setItem("thinkvest_changelog_seen", CHANGELOG_VERSION);
  };

  // Fetch live settings as soon as the authenticated shell mounts.
  // This handles the login flow where App.js's initial fetch got a 401.
  useEffect(() => { refreshAppConfig(); }, [refreshAppConfig]);

  // Filter nav items by feature flags
  const NAV = BASE_NAV.filter((item) => !item.flag || appConfig[item.flag] !== false);
  const items = [...NAV, KPI_NAV, PREMIUM_NAV, ...(user?.isAdmin ? [ADMIN_USERS_NAV, ADMIN_PLANS_NAV, ADMIN_LOGS_NAV, SETTINGS_NAV] : [])];

  const topNav = ["/app", "/app/results", "/app/kpi-editor", "/app/screener", "/app/comparison", "/app/premium", "/app/upgrade", "/app/settings", "/app/account", "/app/admin/users", "/app/admin/plans", "/app/admin/logs"].includes(location.pathname);

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

  // Force expired-trial users to the upgrade page (except allowed paths).
  // Standard plan gets 90 days free from signup; derive from createdAt when trialEndsAt is absent.
  const effectiveTrialEnd = (() => {
    if (user.trialEndsAt) return new Date(user.trialEndsAt);
    if (user.plan === "standard" && user.createdAt) {
      return new Date(new Date(user.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000);
    }
    return null;
  })();
  const paidActive = user.paidUntil && new Date(user.paidUntil) > new Date();
  const trialExpired = effectiveTrialEnd && effectiveTrialEnd < new Date() && !user.planOverrideFree && !paidActive;
  const TRIAL_ALLOWED = ["/app/upgrade", "/app/account", "/app/premium"];
  if (trialExpired && !TRIAL_ALLOWED.some((p) => location.pathname.startsWith(p))) {
    return <Navigate to="/app/upgrade" replace />;
  }

  return (
    <div className={`shell${topNav ? " topbar" : ""}`}>
      <Seo title="Workspace" noindex description="ThinkVest workspace - the signed-in ranking pipeline, column mapper, results dashboard and KPI editor." />
      <style>{SHELL_CSS}</style>

      <aside className="shell-side">
        <div className="shell-brand"><Logo size={22} /></div>

        <button className="shell-hamburger" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div className="shell-section">Workspace</div>
        <nav className="shell-nav">
          {items.map(({ to, label, icon, end, cls }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `shell-link${cls ? ` ${cls}` : ""} ${isActive ? "active" : ""}`}>
              <span className="shell-link-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            className={`shell-link shell-whatsnew${showChangelog ? " active" : ""}`}
            onClick={openChangelog}
          >
            <span className="shell-link-icon">
              <Icon paths={["M13 10V3L4 14h7v7l9-11h-7z"]} />
            </span>
            <span>What's new</span>
            {hasNew && <span className="shell-badge" aria-label="New updates" />}
          </button>
        </nav>

        <div className="shell-user">
          <div className="shell-avatar-wrap">
            <div className="shell-avatar-initial">{initial}</div>
          </div>
          <div className="shell-user-meta">
            <div className="shell-user-name">{user.name || "Analyst"}</div>
            <div className="shell-user-email">{user.email || "thinkvest"}</div>
          </div>
          <NavLink to="/app/account" className="shell-settings-btn" title="Settings" aria-label="Settings">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </NavLink>
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
                <button className="shell-verify-resend" onClick={handleResendVerification}>Resend</button>
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

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="mob-drawer" onClick={() => setMobileNavOpen(false)}>
          <div className="mob-panel" onClick={e => e.stopPropagation()}>
            <div className="mob-panel-head">
              <Logo size={20} />
              <button className="mob-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">✕</button>
            </div>
            <nav className="mob-nav">
              {items.map(({ to, label, icon, end, cls }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `shell-link${cls ? ` ${cls}` : ""} ${isActive ? "active" : ""}`}
                  onClick={() => setMobileNavOpen(false)}>
                  <span className="shell-link-icon">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
              <button className={`shell-link shell-whatsnew${showChangelog ? " active" : ""}`}
                onClick={() => { setMobileNavOpen(false); openChangelog(); }}>
                <span className="shell-link-icon"><Icon paths={["M13 10V3L4 14h7v7l9-11h-7z"]} /></span>
                <span>What's new</span>
                {hasNew && <span className="shell-badge" aria-label="New updates" />}
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Changelog modal */}
      {showChangelog && (
        <div className="shell-cl-overlay" onClick={() => setShowChangelog(false)}>
          <div className="shell-cl-panel" onClick={e => e.stopPropagation()}>
            <div className="shell-cl-head">
              <div>
                <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: ".14em", color: "rgba(16,185,129,.8)", marginBottom: 4 }}>THINKVEST</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>What's New</div>
              </div>
              <button className="shell-cl-close" onClick={() => setShowChangelog(false)} aria-label="Close">✕</button>
            </div>
            <div className="shell-cl-body">
              {CHANGELOG.map((entry, ei) => (
                <div key={entry.v} className="shell-cl-entry">
                  <div className="shell-cl-version">
                    <span className="shell-cl-vtag">{entry.v}</span>
                    <span className="shell-cl-date">{entry.date}</span>
                    {ei === 0 && <span className="shell-cl-latest">Latest</span>}
                  </div>
                  <ul className="shell-cl-list">
                    {entry.items.map(item => (
                      <li key={item} className="shell-cl-item">
                        <span className="shell-cl-dot" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
  .shell-link.active { color: ${colors.text}; background: linear-gradient(90deg, rgba(16,185,129,0.18), rgba(16,185,129,0.05)); box-shadow: inset 0 0 0 1px rgba(16,185,129,0.28); }
  .shell-link.active::before { content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 3px; background: ${gradients.brand}; box-shadow: 0 0 10px rgba(16,185,129,0.6); }
  .shell-link-icon { display: inline-flex; color: inherit; opacity: .85; }
  .shell-link.active .shell-link-icon { color: ${colors.accentHover}; opacity: 1; }

  /* ── Premium purple nav item ── */
  .shell-link-premium {
    background: rgba(124,108,255,0.13);
    border: 1px solid rgba(124,108,255,0.32);
    color: #A78BFA !important;
    margin-top: 4px;
  }
  .shell-link-premium .shell-link-icon { color: #A78BFA !important; opacity: 1; }
  .shell-link-premium:hover {
    background: rgba(124,108,255,0.22);
    border-color: rgba(124,108,255,0.5);
    color: #C4B5FD !important;
  }
  .shell-link-premium:hover .shell-link-icon { color: #C4B5FD !important; }
  .shell-link-premium.active {
    background: rgba(124,108,255,0.25);
    box-shadow: inset 0 0 0 1px rgba(124,108,255,0.45), 0 0 12px rgba(124,108,255,0.15);
    color: #C4B5FD !important;
  }
  .shell-link-premium.active::before { background: linear-gradient(180deg, #7C6CFF, #A78BFA) !important; box-shadow: 0 0 10px rgba(124,108,255,0.6) !important; }

  .shell-user { display: flex; align-items: center; gap: 10px; padding: 12px 10px 4px; border-top: 1px solid ${colors.glassBorder}; margin-top: 8px; }
  .shell-avatar-wrap { width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${gradients.brand}; box-shadow: 0 0 16px rgba(16,185,129,0.35); }
  .shell-avatar-initial { color: #fff; font-weight: 700; font-size: 14px; }
  .shell-user-meta { flex: 1; min-width: 0; }
  .shell-user-name { font-size: 13px; font-weight: 600; color: ${colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell-user-email { font-size: 11px; color: ${colors.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell-settings-btn { background: transparent; border: none; color: ${colors.textMuted}; cursor: pointer; padding: 6px; border-radius: ${radius.sm}; display: inline-flex; transition: all .15s; text-decoration: none; }
  .shell-settings-btn:hover { color: ${colors.text}; background: rgba(255,255,255,0.08); }
  .shell-settings-btn.active { color: ${colors.accentHover}; background: rgba(16,185,129,0.12); }

  /* min-width:0 prevents the grid column from expanding beyond viewport on mobile */
  .shell-main { min-width: 0; overflow-x: hidden; }

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
  .shell-verify-resend {
    background: transparent; border: none; color: #93C5FD; cursor: pointer;
    font-size: 12px; text-decoration: underline; padding: 4px 4px;
  }
  .shell-verify-resend:hover { color: #BFDBFE; }
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

  /* What's New button - same styles as a NavLink */
  .shell-whatsnew { background: none; border: none; cursor: pointer; font-family: ${fonts.sans}; font-size: 14px; font-weight: 500; width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: ${radius.sm}; color: ${colors.textSecondary}; transition: all .15s ease; }
  .shell-whatsnew:hover { color: ${colors.text}; background: rgba(255,255,255,0.05) !important; }
  .shell-whatsnew.active { color: ${colors.text}; background: linear-gradient(90deg, rgba(16,185,129,0.18), rgba(16,185,129,0.05)); box-shadow: inset 0 0 0 1px rgba(16,185,129,0.28); }

  /* Badge dot */
  .shell-badge { width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; margin-left: auto; flex-shrink: 0; box-shadow: 0 0 6px rgba(245,158,11,.6); }

  /* Changelog modal */
  .shell-cl-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .shell-cl-panel { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 440px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.5); }
  .shell-cl-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
  .shell-cl-close { background: var(--elevated); border: none; color: var(--text-secondary); font-size: 16px; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; }
  .shell-cl-close:hover { background: var(--negative-soft) !important; color: var(--negative) !important; }
  .shell-cl-body { overflow-y: auto; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 24px; }
  .shell-cl-entry { display: flex; flex-direction: column; gap: 10px; }
  .shell-cl-version { display: flex; align-items: center; gap: 8px; }
  .shell-cl-vtag { font-family: monospace; font-size: 12px; font-weight: 700; color: var(--accent-hover); background: var(--accent-soft); padding: 2px 8px; border-radius: 999px; }
  .shell-cl-date { font-size: 12px; color: var(--text-muted); }
  .shell-cl-latest { font-size: 10px; font-weight: 700; color: var(--positive); background: var(--positive-soft); padding: 2px 7px; border-radius: 999px; letter-spacing: .05em; }
  .shell-cl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .shell-cl-item { display: flex; align-items: baseline; gap: 10px; font-size: 13px; color: var(--text-secondary); }
  .shell-cl-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 2px; }

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

  /* Hamburger - hidden on desktop, shown on mobile */
  .shell-hamburger { display: none; }

  @media (max-width: 760px) {
    .shell { grid-template-columns: 1fr; }

    .shell-side {
      position: sticky; top: 0; z-index: 100;
      height: auto; flex-direction: row; align-items: center;
      padding: 10px 16px; gap: 0; overflow-x: visible;
    }
    .shell-brand { padding: 0; flex: 1; }
    .shell-section { display: none; }
    .shell-nav { display: none; }
    .shell-link.active::before { display: none; }
    .shell-user { border-top: none; margin-top: 0; padding: 0; gap: 8px; }
    .shell-user-meta { display: none; }

    .shell-hamburger {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; margin-right: 8px;
      border-radius: 8px; border: 1px solid ${colors.border};
      background: transparent; color: ${colors.textSecondary};
      cursor: pointer; transition: all .15s; flex-shrink: 0;
    }
    .shell-hamburger:hover { background: ${colors.elevated}; color: ${colors.text}; }

    /* Mobile drawer */
    .mob-drawer {
      position: fixed; inset: 0; z-index: 500;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
      display: flex;
    }
    .mob-panel {
      width: 260px; height: 100%; background: var(--canvas);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      padding: 20px 14px; overflow-y: auto;
      box-shadow: 4px 0 32px rgba(0,0,0,0.4);
      animation: mob-slide .2s ease;
    }
    @keyframes mob-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    .mob-panel-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; padding: 0 4px;
    }
    .mob-close {
      background: transparent; border: none; color: ${colors.textMuted};
      font-size: 18px; cursor: pointer; padding: 4px 8px;
      border-radius: 6px; line-height: 1; display: flex;
    }
    .mob-close:hover { color: ${colors.text}; background: ${colors.elevated}; }
    .mob-nav { display: flex; flex-direction: column; gap: 4px; }
  }
`;

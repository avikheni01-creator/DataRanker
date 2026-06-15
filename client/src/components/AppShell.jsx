import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { logOut, getUser } from "../auth";
import { colors, gradients, fonts, radius } from "../theme";

// Icons kept as tiny inline SVGs so we don't add an icon dependency.
const Icon = ({ d, paths }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths ? paths.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const NAV = [
  { to: "/app", end: true, label: "Pipeline", icon: <Icon paths={["M3 3v18h18", "M7 14l4-4 3 3 5-6"]} /> },
  { to: "/app/column-mapper", label: "Column Mapper", icon: <Icon paths={["M4 6h16", "M4 12h10", "M4 18h7", "M16 15l4 3-4 3"]} /> },
  { to: "/app/results", label: "Results", icon: <Icon paths={["M4 19V9", "M10 19V5", "M16 19v-7", "M22 19H2"]} /> },
];

const KPI_NAV = { to: "/app/kpi-editor", label: "KPI Editor", icon: <Icon paths={["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"]} /> };

// KPI Editor is always reachable (no longer gated on a KPI upload). The Results
// page renders the nav as a top bar instead of the left sidebar so the output
// dashboard gets the full page width.
export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const items = [...NAV, KPI_NAV];
  const topNav = location.pathname === "/app/results";

  const handleSignOut = async () => {
    await logOut();
    navigate("/");
  };

  const initial = (user.name || user.email || "M").trim().charAt(0).toUpperCase();

  return (
    <div className={`shell${topNav ? " topbar" : ""}`}>
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
          <div className="shell-avatar">{initial}</div>
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
  .shell-avatar { width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${gradients.brand}; color: #fff; font-weight: 700; font-size: 14px; box-shadow: 0 0 16px rgba(124,108,255,0.35); }
  .shell-user-meta { flex: 1; min-width: 0; }
  .shell-user-name { font-size: 13px; font-weight: 600; color: ${colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell-user-email { font-size: 11px; color: ${colors.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell-signout { background: transparent; border: none; color: ${colors.textMuted}; cursor: pointer; padding: 6px; border-radius: ${radius.sm}; display: inline-flex; transition: all .15s; }
  .shell-signout:hover { color: ${colors.negative}; background: ${colors.negativeSoft}; }

  .shell-main { min-width: 0; }

  /* Results page: horizontal top bar instead of the left sidebar. */
  .shell.topbar { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
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

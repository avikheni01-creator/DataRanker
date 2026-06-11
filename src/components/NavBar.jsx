import { NavLink } from "react-router-dom";

// Global navigation. Height is kept in sync with the layout offsets used by
// StockDashboard (calc(100vh - 52px)) and KPILibraryEditor (sticky top: 52).
const NAV_HEIGHT = 52;

const NAV_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .nav-bar {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 24px;
    height: ${NAV_HEIGHT}px; padding: 0 24px;
    background: #0a0a0f; border-bottom: 1px solid #1e1c30;
    font-family: 'Syne', sans-serif;
  }
  .nav-brand {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 800; color: #e8e6f0; letter-spacing: 0.02em;
  }
  .nav-brand .dot { color: #6c63ff; }
  .nav-links { display: flex; gap: 4px; }
  .nav-link {
    font-family: 'DM Mono', monospace; font-size: 12px;
    color: #7a7690; text-decoration: none;
    padding: 7px 14px; border-radius: 8px; letter-spacing: 0.02em;
    transition: all 0.15s ease;
  }
  .nav-link:hover { color: #c8c4e0; background: #15132a; }
  .nav-link.active { color: #fff; background: #1e1c30; }
`;

const LINKS = [
  { to: "/", label: "Pipeline", end: true },
  { to: "/column-mapper", label: "Column Mapping" },
  { to: "/kpi-dashboard", label: "KPI Library" },
  { to: "/stock-dashboard", label: "Output" },
];

export default function NavBar() {
  return (
    <>
      <style>{NAV_STYLE}</style>
      <nav className="nav-bar">
        <div className="nav-brand">
          <span className="dot">◆</span> DataRanker
        </div>
        <div className="nav-links">
          {LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

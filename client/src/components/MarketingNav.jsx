import { Link, NavLink } from "react-router-dom";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

// Shared sticky glass nav for the public marketing pages (Landing/Pricing/About).
export default function MarketingNav() {
  return (
    <header className="mkt-navwrap">
      <style>{NAV_CSS}</style>
      <nav className="mkt-nav">
        <Link to="/" aria-label="Matrix home"><Logo size={22} /></Link>

        <div className="mkt-nav-links">
          <NavLink to="/" end className={({ isActive }) => `mkt-link ${isActive ? "active" : ""}`}>Product</NavLink>
          <NavLink to="/pricing" className={({ isActive }) => `mkt-link ${isActive ? "active" : ""}`}>Pricing</NavLink>
          <NavLink to="/about" className={({ isActive }) => `mkt-link ${isActive ? "active" : ""}`}>About</NavLink>
        </div>

        <div className="mkt-nav-actions">
          <ThemeToggle size={36} />
          <Link to="/login" className="mkt-link mkt-link-signin">Sign In</Link>
          <Link to="/signup" className="mkt-btn">Get Started</Link>
        </div>
      </nav>
    </header>
  );
}

const NAV_CSS = `
  .mkt-navwrap { position: sticky; top: 14px; z-index: 30; display: flex; justify-content: center; padding: 0 20px; }
  .mkt-nav { width: 100%; max-width: 1100px; display: flex; align-items: center; gap: 18px; padding: 10px 12px 10px 20px; border-radius: ${radius.pill}; font-family: ${fonts.sans}; ${glassCss} }
  .mkt-nav-links { display: flex; gap: 4px; margin: 0 auto 0 22px; }
  .mkt-nav-actions { display: flex; align-items: center; gap: 10px; }
  .mkt-link { color: ${colors.textSecondary}; font-weight: 500; font-size: 14px; padding: 9px 14px; border-radius: ${radius.pill}; transition: color .15s, background .15s; }
  .mkt-link:hover { color: ${colors.text}; }
  .mkt-link.active { color: ${colors.text}; background: ${colors.accentSoft}; }
  .mkt-btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; border-radius: ${radius.pill}; padding: 10px 20px; background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22); transition: all .15s ease; }
  .mkt-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(124,108,255,0.45), inset 0 1px 0 rgba(255,255,255,0.22); filter: brightness(1.08); }

  @media (max-width: 720px) {
    .mkt-nav-links { display: none; }
    .mkt-nav { gap: 10px; }
    .mkt-link-signin { display: none; }
  }
`;

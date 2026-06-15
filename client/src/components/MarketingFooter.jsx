import { Link } from "react-router-dom";
import Logo from "./Logo";
import { colors, fonts, radius } from "../theme";

// Shared footer for the public marketing pages.
export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <style>{FOOTER_CSS}</style>
      <div className="mkt-footer-inner">
        <div className="mkt-footer-brand">
          <Logo size={20} />
          <p className="mkt-footer-tag">
            Proprietary equity ranking — fundamentals mapped to your sectors and
            scored against your KPI templates.
          </p>
        </div>
        <div className="mkt-footer-cols">
          <div className="mkt-footer-col">
            <div className="mkt-footer-head">Product</div>
            <Link to="/">Overview</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/signup">Get started</Link>
          </div>
          <div className="mkt-footer-col">
            <div className="mkt-footer-head">Company</div>
            <Link to="/about">About</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="mkt-footer-bar">
        <span>© {new Date().getFullYear()} Matrix</span>
        <span>For internal & authorized use</span>
      </div>
    </footer>
  );
}

const FOOTER_CSS = `
  .mkt-footer { border-top: 1px solid ${colors.borderSubtle}; font-family: ${fonts.sans}; margin-top: 40px; }
  .mkt-footer-inner { max-width: 1080px; margin: 0 auto; padding: 56px 40px 32px; display: grid; grid-template-columns: 1.4fr 1fr; gap: 40px; }
  .mkt-footer-brand { max-width: 340px; }
  .mkt-footer-tag { color: ${colors.textMuted}; font-size: 14px; line-height: 1.6; margin: 16px 0 0; }
  .mkt-footer-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .mkt-footer-col { display: flex; flex-direction: column; gap: 12px; }
  .mkt-footer-head { font-family: ${fonts.mono}; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: ${colors.textMuted}; margin-bottom: 4px; }
  .mkt-footer-col a { color: ${colors.textSecondary}; font-size: 14px; transition: color .15s; }
  .mkt-footer-col a:hover { color: ${colors.text}; }
  .mkt-footer-bar { max-width: 1080px; margin: 0 auto; padding: 22px 40px; border-top: 1px solid ${colors.borderSubtle}; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; color: ${colors.textMuted}; font-size: 13px; }
  @media (max-width: 720px) {
    .mkt-footer-inner { grid-template-columns: 1fr; padding: 40px 22px 24px; gap: 28px; border-radius: ${radius.sm}; }
  }
`;

import { Link } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { colors, gradients, fonts, radius } from "../theme";

export default function NotFoundPage() {
  return (
    <div style={{ color: colors.text, fontFamily: fonts.sans, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        .nf-root { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
        .nf-code {
          font-family: ${fonts.display}; font-size: clamp(90px, 18vw, 160px);
          font-weight: 700; line-height: 1; letter-spacing: -0.04em;
          background: ${gradients.brand}; -webkit-background-clip: text;
          background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 8px; display: block;
        }
        .nf-title { font-family: ${fonts.display}; font-size: clamp(22px, 3.5vw, 34px); font-weight: 700; color: ${colors.text}; margin: 0 0 14px; }
        .nf-sub { font-size: 16px; color: ${colors.textSecondary}; line-height: 1.6; max-width: 380px; margin: 0 auto 36px; }
        .nf-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .nf-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 26px; border-radius: ${radius.pill}; font-weight: 600; font-size: 14px; text-decoration: none; transition: all .15s ease; border: 1px solid transparent; cursor: pointer; }
        .nf-btn-solid { background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(124,108,255,0.3); }
        .nf-btn-solid:hover { transform: translateY(-1px); box-shadow: 0 8px 26px rgba(124,108,255,0.45); filter: brightness(1.08); }
        .nf-btn-ghost { background: transparent; color: ${colors.textSecondary}; border-color: ${colors.border}; }
        .nf-btn-ghost:hover { border-color: ${colors.accent}; color: ${colors.text}; background: ${colors.accentSoft}; }
        .nf-orb { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; opacity: .6; }
        .nf-orb-a { width: 380px; height: 380px; top: 5%; left: 50%; margin-left: -350px; background: rgba(124,108,255,0.18); }
        .nf-orb-b { width: 300px; height: 300px; bottom: 10%; right: 8%; background: rgba(34,211,238,0.10); }
      `}</style>

      <div className="nf-orb nf-orb-a" aria-hidden="true" />
      <div className="nf-orb nf-orb-b" aria-hidden="true" />

      <MarketingNav />

      <div className="nf-root">
        <span className="nf-code" aria-label="Error 404">404</span>
        <h1 className="nf-title">Page not found</h1>
        <p className="nf-sub">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="nf-actions">
          <Link to="/" className="nf-btn nf-btn-solid">← Go home</Link>
          <Link to="/login" className="nf-btn nf-btn-ghost">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

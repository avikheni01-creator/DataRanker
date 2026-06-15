import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

// Shared split-screen frame for Login & Signup. Left = brand panel with
// floating glow orbs; right = a glass form card (passed as children).
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <style>{AUTH_CSS}</style>

      <div className="auth-brand">
        <div className="auth-orb auth-orb-a" aria-hidden="true" />
        <div className="auth-orb auth-orb-b" aria-hidden="true" />
        <Link to="/" style={{ position: "relative" }}><Logo size={24} /></Link>
        <div className="auth-brand-body">
          <h2 className="auth-brand-headline">
            Rank every company.<br /><span className="auth-grad">With precision.</span>
          </h2>
          <p className="auth-brand-tag">
            A proprietary engine that maps fundamentals to your sectors and scores
            them against your KPI templates.
          </p>
        </div>
        <div className="auth-brand-foot">© {new Date().getFullYear()} Matrix</div>
      </div>

      <div className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.21, 0.6, 0.35, 1] }}
          className="auth-form-card"
        >
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}

const AUTH_CSS = `
  .auth-wrap { display: grid; grid-template-columns: 44% 56%; min-height: 100vh; font-family: ${fonts.sans}; }

  .auth-brand { position: relative; overflow: hidden; border-right: 1px solid ${colors.borderSubtle}; padding: 44px; display: flex; flex-direction: column; justify-content: space-between; }
  .auth-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; animation: authFloat 14s ease-in-out infinite alternate; }
  .auth-orb-a { width: 440px; height: 440px; top: -120px; left: -140px; background: rgba(124,108,255,0.22); }
  .auth-orb-b { width: 360px; height: 360px; bottom: -120px; right: -100px; background: rgba(34,211,238,0.10); animation-delay: -7s; }
  @keyframes authFloat { from { transform: translate(-10px, -10px); } to { transform: translate(16px, 22px); } }

  .auth-brand-body { position: relative; max-width: 380px; }
  .auth-brand-headline { font-family: ${fonts.display}; font-size: 38px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; color: ${colors.text}; margin: 0 0 18px; }
  .auth-grad { background: ${gradients.textBright}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .auth-brand-tag { color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; margin: 0; }
  .auth-brand-foot { position: relative; color: ${colors.textMuted}; font-size: 13px; }

  .auth-form-side { display: flex; align-items: center; justify-content: center; padding: 40px; }
  .auth-form-card { width: 100%; max-width: 420px; padding: 40px 38px; border-radius: ${radius.xl}; ${glassCss} }
  .auth-title { font-family: ${fonts.display}; font-size: 28px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 8px; color: ${colors.text}; }
  .auth-subtitle { color: ${colors.textSecondary}; font-size: 15px; margin: 0 0 30px; }

  .auth-error { margin-bottom: 18px; padding: 11px 14px; border-radius: ${radius.sm}; background: ${colors.negativeSoft}; border: 1px solid ${colors.negative}; color: ${colors.negative}; font-size: 14px; }

  .auth-field { margin-bottom: 18px; }
  .auth-label { display: block; font-size: 13px; font-weight: 500; color: ${colors.textSecondary}; margin-bottom: 8px; }
  .auth-input { width: 100%; height: 46px; padding: 0 14px; background: rgba(255,255,255,0.04); border: 1px solid ${colors.glassBorder}; border-radius: ${radius.sm}; color: ${colors.text}; font-size: 15px; font-family: ${fonts.sans}; transition: border-color .15s, box-shadow .15s, background .15s; }
  .auth-input::placeholder { color: ${colors.textMuted}; }
  .auth-input:focus { outline: none; border-color: ${colors.accent}; background: rgba(124,108,255,0.06); box-shadow: 0 0 0 3px ${colors.focusGlow}; }

  .auth-submit { width: 100%; height: 48px; margin-top: 6px; background: ${gradients.brand}; color: #fff; border: none; border-radius: ${radius.sm}; font-size: 15px; font-weight: 600; font-family: ${fonts.sans}; cursor: pointer; transition: all .15s ease; box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22); }
  .auth-submit:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(124,108,255,0.45), inset 0 1px 0 rgba(255,255,255,0.22); filter: brightness(1.08); }
  .auth-submit:active { transform: translateY(1px); }

  .auth-footer { margin-top: 26px; text-align: center; font-size: 14px; color: ${colors.textSecondary}; }
  .auth-footer a { color: ${colors.accentHover}; font-weight: 600; }
  .auth-footer a:hover { text-decoration: underline; }

  @media (max-width: 820px) {
    .auth-wrap { grid-template-columns: 1fr; }
    .auth-brand { display: none; }
    .auth-form-card { padding: 32px 24px; }
  }
`;

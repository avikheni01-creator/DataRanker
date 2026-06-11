import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

const WORKFLOW = [
  { n: "01", title: "Upload Data", desc: "Screener.in export, industry map & KPI library." },
  { n: "02", title: "Map Columns", desc: "Auto-matched to the canonical schema in one click." },
  { n: "03", title: "Run Pipeline", desc: "Format, sector-map and score in a single pass." },
  { n: "04", title: "Download Rankings", desc: "A fully scored, ranked Excel report." },
];

const BRING = [
  "Screener.in CSV export",
  "Industry mapping workbook",
  "KPI library & weights",
];

const GET = [
  "Ranked Excel report",
  "Sector-grouped results",
  "Weighted KPI scores",
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, delay, ease: [0.21, 0.6, 0.35, 1] },
});

export default function LandingPage() {
  return (
    <div style={{ color: colors.text, fontFamily: fonts.sans, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{LANDING_CSS}</style>

      {/* Floating glass nav */}
      <header className="lp-navwrap">
        <nav className="lp-nav">
          <Logo size={22} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link to="/login" className="lp-link">Sign In</Link>
            <Link to="/signup" className="lp-btn lp-btn-solid">Get Started</Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-orb lp-orb-a" aria-hidden="true" />
        <div className="lp-orb lp-orb-b" aria-hidden="true" />
        <motion.div {...fadeUp(0)} className="lp-eyebrow">
          <span className="lp-eyebrow-dot" />
          Proprietary Equity Ranking Engine
        </motion.div>
        <motion.h1 {...fadeUp(0.06)} className="lp-title">
          Rank every company.<br />
          <span className="lp-grad">With precision.</span>
        </motion.h1>
        <motion.p {...fadeUp(0.12)} className="lp-sub">
          Matrix turns raw fundamentals into a defensible, weighted ranking —
          mapped to your sectors and scored against your KPI templates.
        </motion.p>
        <motion.div {...fadeUp(0.18)} className="lp-cta">
          <Link to="/signup" className="lp-btn lp-btn-solid lp-btn-lg">
            Get Started <span className="lp-btn-arrow">→</span>
          </Link>
          <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Sign In</Link>
        </motion.div>

        {/* Hero glass panel — abstract ranking preview, no real data */}
        <motion.div {...fadeUp(0.28)} className="lp-panel" aria-hidden="true">
          <div className="lp-panel-head">
            <span className="lp-panel-dot" /><span className="lp-panel-dot" /><span className="lp-panel-dot" />
            <span className="lp-panel-title">FINAL_RANKED_REPORT.XLSX</span>
          </div>
          {[92, 81, 74, 63, 55].map((w, i) => (
            <div className="lp-panel-row" key={i}>
              <span className="lp-panel-rank">#{i + 1}</span>
              <span className="lp-panel-ticker">{"▮▮▮▮▮▮".slice(0, 6 - i)}</span>
              <span className="lp-panel-bar"><span style={{ width: `${w}%` }} /></span>
              <span className="lp-panel-score">{(w / 10).toFixed(1)}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Workflow strip */}
      <section className="lp-section">
        <motion.div {...fadeUp(0)} className="lp-kicker">Workflow</motion.div>
        <motion.h2 {...fadeUp(0.04)} className="lp-h2">From export to ranking<br />in four steps</motion.h2>
        <div className="lp-flow">
          <div className="lp-flow-line" aria-hidden="true" />
          {WORKFLOW.map((s, i) => (
            <motion.div key={s.n} {...fadeUp(i * 0.08)} className="lp-flow-card">
              <div className="lp-flow-n">{s.n}</div>
              <div className="lp-flow-title">{s.title}</div>
              <div className="lp-flow-desc">{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you bring / get */}
      <section className="lp-section">
        <div className="lp-cols">
          <motion.div {...fadeUp(0)} className="lp-col">
            <div className="lp-col-label">What you bring</div>
            <ul className="lp-list">
              {BRING.map((x) => <li key={x}><span className="lp-tick lp-tick-muted">›</span>{x}</li>)}
            </ul>
          </motion.div>
          <motion.div {...fadeUp(0.1)} className="lp-col lp-col-accent">
            <div className="lp-col-label" style={{ color: colors.accentHover }}>What you get</div>
            <ul className="lp-list">
              {GET.map((x) => <li key={x}><span className="lp-tick">✓</span>{x}</li>)}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="lp-footcta">
        <div className="lp-orb lp-orb-c" aria-hidden="true" />
        <motion.div {...fadeUp(0)} style={{ position: "relative" }}>
          <h2 className="lp-h2" style={{ marginBottom: 22 }}>Ready to see your rankings?</h2>
          <Link to="/signup" className="lp-btn lp-btn-solid lp-btn-lg">
            Get Started <span className="lp-btn-arrow">→</span>
          </Link>
        </motion.div>
      </section>

      <footer className="lp-footer">
        <Logo size={18} />
        <span className="lp-footer-tag">Proprietary equity ranking · for internal use</span>
        <span className="lp-footer-tag">© {new Date().getFullYear()} Matrix</span>
      </footer>
    </div>
  );
}

const LANDING_CSS = `
  .lp-navwrap { position: sticky; top: 14px; z-index: 20; display: flex; justify-content: center; padding: 0 20px; }
  .lp-nav {
    width: 100%; max-width: 1040px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px 10px 20px; border-radius: ${radius.pill};
    ${glassCss}
  }
  .lp-link { color: ${colors.textSecondary}; font-weight: 500; font-size: 14px; padding: 9px 14px; border-radius: ${radius.pill}; transition: color .15s; }
  .lp-link:hover { color: ${colors.text}; }

  .lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 14px; border-radius: ${radius.pill}; padding: 10px 20px; transition: all .15s ease; cursor: pointer; border: 1px solid transparent; }
  .lp-btn-lg { padding: 15px 30px; font-size: 15px; }
  .lp-btn-solid { background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22); }
  .lp-btn-solid:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(124,108,255,0.45), inset 0 1px 0 rgba(255,255,255,0.22); filter: brightness(1.08); }
  .lp-btn-ghost { background: rgba(255,255,255,0.03); color: ${colors.text}; border-color: ${colors.glassBorder}; backdrop-filter: blur(8px); }
  .lp-btn-ghost:hover { border-color: ${colors.accent}; background: ${colors.accentSoft}; }
  .lp-btn-arrow { transition: transform .15s ease; }
  .lp-btn:hover .lp-btn-arrow { transform: translateX(3px); }

  .lp-hero { position: relative; text-align: center; padding: 110px 24px 90px; }
  .lp-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; animation: lpFloat 14s ease-in-out infinite alternate; }
  .lp-orb-a { width: 520px; height: 520px; top: -180px; left: 50%; margin-left: -460px; background: rgba(124,108,255,0.20); }
  .lp-orb-b { width: 420px; height: 420px; top: -60px; left: 50%; margin-left: 80px; background: rgba(34,211,238,0.10); animation-delay: -7s; }
  .lp-orb-c { width: 480px; height: 480px; bottom: -240px; left: 50%; margin-left: -240px; background: rgba(124,108,255,0.14); }
  @keyframes lpFloat { from { transform: translateY(-14px); } to { transform: translateY(22px); } }

  .lp-eyebrow {
    position: relative; display: inline-flex; align-items: center; gap: 9px;
    font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
    color: ${colors.accentHover}; margin-bottom: 26px;
    padding: 8px 16px; border-radius: ${radius.pill};
    background: ${colors.accentSoft}; border: 1px solid rgba(124,108,255,0.25);
  }
  .lp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: ${colors.accent}; box-shadow: 0 0 10px ${colors.accent}; animation: lpPulse 2.2s ease-in-out infinite; }
  @keyframes lpPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

  .lp-title { position: relative; font-family: ${fonts.display}; font-size: clamp(44px, 7.5vw, 86px); font-weight: 700; line-height: 1.02; letter-spacing: -0.025em; margin: 0; }
  .lp-grad { background: ${gradients.textBright}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .lp-sub { position: relative; max-width: 560px; margin: 28px auto 0; color: ${colors.textSecondary}; font-size: 18px; line-height: 1.65; }
  .lp-cta { position: relative; display: flex; gap: 14px; justify-content: center; margin-top: 40px; }

  .lp-panel {
    position: relative; max-width: 620px; margin: 70px auto 0;
    border-radius: ${radius.lg}; padding: 0 0 14px; overflow: hidden;
    ${glassCss}
    box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 80px rgba(124,108,255,0.08);
  }
  .lp-panel-head { display: flex; align-items: center; gap: 7px; padding: 14px 18px; border-bottom: 1px solid ${colors.glassBorder}; }
  .lp-panel-dot { width: 9px; height: 9px; border-radius: 50%; background: ${colors.elevated}; border: 1px solid ${colors.glassBorder}; }
  .lp-panel-title { margin-left: 10px; font-family: ${fonts.mono}; font-size: 10px; letter-spacing: .14em; color: ${colors.textMuted}; }
  .lp-panel-row { display: grid; grid-template-columns: 44px 90px 1fr 44px; align-items: center; gap: 14px; padding: 11px 20px; }
  .lp-panel-row + .lp-panel-row { border-top: 1px solid rgba(255,255,255,0.04); }
  .lp-panel-rank { font-family: ${fonts.mono}; font-size: 12px; color: ${colors.accentHover}; text-align: left; }
  .lp-panel-ticker { font-family: ${fonts.mono}; font-size: 11px; color: ${colors.textMuted}; letter-spacing: 2px; }
  .lp-panel-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
  .lp-panel-bar span { display: block; height: 100%; border-radius: 3px; background: ${gradients.score}; }
  .lp-panel-score { font-family: ${fonts.mono}; font-size: 12px; color: ${colors.text}; text-align: right; font-feature-settings: "tnum" 1; }

  .lp-section { position: relative; max-width: 1080px; margin: 0 auto; padding: 80px 40px; }
  .lp-kicker { font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: ${colors.accentHover}; text-align: center; margin-bottom: 14px; }
  .lp-h2 { font-family: ${fonts.display}; font-size: clamp(28px, 4vw, 44px); font-weight: 700; line-height: 1.12; letter-spacing: -0.015em; text-align: center; margin: 0 0 48px; }

  .lp-flow { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .lp-flow-line { position: absolute; top: 39px; left: 6%; right: 6%; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,108,255,0.45), rgba(124,108,255,0.45), transparent); pointer-events: none; }
  .lp-flow-card { position: relative; border-radius: ${radius.md}; padding: 28px 22px; transition: transform .15s ease, box-shadow .15s ease; ${glassCss} }
  .lp-flow-card:hover { transform: translateY(-4px); box-shadow: 0 16px 44px rgba(0,0,0,0.5), 0 0 40px rgba(124,108,255,0.12); }
  .lp-flow-n {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: ${radius.pill};
    font-family: ${fonts.mono}; font-size: 12px; color: #fff;
    background: ${gradients.brand}; box-shadow: 0 0 18px rgba(124,108,255,0.4);
    margin-bottom: 16px;
  }
  .lp-flow-title { font-family: ${fonts.display}; font-size: 17px; font-weight: 700; margin-bottom: 8px; }
  .lp-flow-desc { font-size: 14px; color: ${colors.textSecondary}; line-height: 1.55; }

  .lp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .lp-col { border-radius: ${radius.lg}; padding: 36px; ${glassCss} }
  .lp-col-accent { background: linear-gradient(165deg, rgba(124,108,255,0.13), rgba(255,255,255,0.02) 60%); border-color: rgba(124,108,255,0.35); border-top-color: rgba(157,144,255,0.5); }
  .lp-col-label { font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: ${colors.textMuted}; margin-bottom: 22px; }
  .lp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
  .lp-list li { display: flex; align-items: center; gap: 14px; font-size: 16px; color: ${colors.text}; }
  .lp-tick { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 999px; background: ${gradients.brand}; color: #fff; font-size: 12px; flex-shrink: 0; box-shadow: 0 0 14px rgba(124,108,255,0.35); }
  .lp-tick-muted { background: ${colors.elevated}; color: ${colors.textMuted}; box-shadow: none; }

  .lp-footcta { position: relative; text-align: center; padding: 110px 24px; overflow: hidden; border-top: 1px solid ${colors.borderSubtle}; }

  .lp-footer { display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap; padding: 32px; border-top: 1px solid ${colors.borderSubtle}; }
  .lp-footer-tag { color: ${colors.textMuted}; font-size: 13px; }

  @media (max-width: 860px) {
    .lp-flow { grid-template-columns: 1fr 1fr; }
    .lp-flow-line { display: none; }
    .lp-cols { grid-template-columns: 1fr; }
    .lp-section { padding: 56px 22px; }
    .lp-hero { padding: 80px 20px 70px; }
  }
  @media (max-width: 520px) { .lp-flow { grid-template-columns: 1fr; } .lp-cta { flex-direction: column; align-items: center; } }
`;

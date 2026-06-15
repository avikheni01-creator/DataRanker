import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingNav from "../components/MarketingNav";
import MarketingFooter from "../components/MarketingFooter";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

const WORKFLOW = [
  { n: "01", title: "Upload Data", desc: "Screener.in export, industry map & KPI library." },
  { n: "02", title: "Map Columns", desc: "Auto-matched to the canonical schema in one click." },
  { n: "03", title: "Run Pipeline", desc: "Format, sector-map and score in a single pass." },
  { n: "04", title: "Download Rankings", desc: "A fully scored, ranked Excel report." },
];

const FEATURES = [
  { icon: ["M4 6h16", "M4 12h10", "M4 18h7", "M16 15l4 3-4 3"], title: "Smart column mapping", desc: "Auto-matches your CSV headers to the canonical schema, with manual overrides when you need them." },
  { icon: ["M3 3v18h18", "M7 14l4-4 3 3 5-6"], title: "Direction-aware scoring", desc: "Every KPI is ranked by its own higher/lower-is-better rule and weighted into one defensible score." },
  { icon: ["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"], title: "190 → 130 sector mapping", desc: "Industries are mapped to your SCS sectors and KPI templates automatically before ranking." },
  { icon: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8", "M8 17h5"], title: "Excel-native output", desc: "A colour-coded, multi-sheet ranked report you can open, audit and share immediately." },
  { icon: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"], title: "Editable KPI library", desc: "Tune templates, weights and categories in-app — no spreadsheets to wrangle by hand." },
  { icon: ["M4 19V9", "M10 19V5", "M16 19v-7", "M22 19H2"], title: "Results dashboard", desc: "Explore rankings with charts and sortable tables before you export." },
];

const FAQ = [
  { q: "What do I need to get started?", a: "Three files: your Screener.in CSV export, an industry-mapping workbook, and your KPI library. Matrix handles the rest." },
  { q: "Is my methodology safe?", a: "Your KPI weights and ranking logic stay in your workspace. The pipeline runs your templates exactly as you define them." },
  { q: "What does the Free plan include?", a: "The full ranking pipeline, column mapper, KPI editor, results dashboard and Excel export — everything you need to rank your first universe." },
  { q: "Can I change the scoring later?", a: "Yes. Edit templates, weights and directions in the KPI editor and re-run the pipeline any time." },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, delay, ease: [0.21, 0.6, 0.35, 1] },
});

function Glyph({ paths }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div style={{ color: colors.text, fontFamily: fonts.sans, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{LANDING_CSS}</style>

      <MarketingNav />

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
          <Link to="/pricing" className="lp-btn lp-btn-ghost lp-btn-lg">See pricing</Link>
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

      {/* Trusted-by strip */}
      <section className="lp-trust">
        <span className="lp-trust-label">Built for the workflow of</span>
        <div className="lp-trust-logos">
          {["Hedge funds", "Equity research", "Family offices", "PMS desks"].map((x) => (
            <span key={x} className="lp-trust-item">{x}</span>
          ))}
        </div>
      </section>

      {/* Workflow strip */}
      <section className="lp-section">
        <motion.div {...fadeUp(0)} className="lp-kicker">How it works</motion.div>
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

      {/* Feature grid */}
      <section className="lp-section">
        <motion.div {...fadeUp(0)} className="lp-kicker">Capabilities</motion.div>
        <motion.h2 {...fadeUp(0.04)} className="lp-h2">Everything you need to<br />defend a ranking</motion.h2>
        <div className="lp-features">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fadeUp((i % 3) * 0.06)} className="lp-feature">
              <div className="lp-feature-icon"><Glyph paths={f.icon} /></div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="lp-section">
        <motion.div {...fadeUp(0)} className="lp-teaser">
          <div>
            <div className="lp-kicker" style={{ textAlign: "left", marginBottom: 10 }}>Pricing</div>
            <h2 className="lp-h2" style={{ textAlign: "left", margin: 0 }}>Start free.<br />Scale when you&apos;re ready.</h2>
            <p className="lp-teaser-sub">The Free plan runs the full pipeline today. Paid tiers are on the way.</p>
          </div>
          <Link to="/pricing" className="lp-btn lp-btn-solid lp-btn-lg">
            View plans <span className="lp-btn-arrow">→</span>
          </Link>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="lp-section lp-faq-section">
        <motion.div {...fadeUp(0)} className="lp-kicker">FAQ</motion.div>
        <motion.h2 {...fadeUp(0.04)} className="lp-h2">Questions, answered</motion.h2>
        <div className="lp-faq">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className={`lp-faq-item ${open ? "open" : ""}`}>
                <button className="lp-faq-q" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}>
                  <span>{item.q}</span>
                  <span className="lp-faq-chev">{open ? "−" : "+"}</span>
                </button>
                {open && <div className="lp-faq-a">{item.a}</div>}
              </div>
            );
          })}
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

      <MarketingFooter />
    </div>
  );
}

const LANDING_CSS = `
  .lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 14px; border-radius: ${radius.pill}; padding: 10px 20px; transition: all .15s ease; cursor: pointer; border: 1px solid transparent; }
  .lp-btn-lg { padding: 15px 30px; font-size: 15px; }
  .lp-btn-solid { background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22); }
  .lp-btn-solid:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(124,108,255,0.45), inset 0 1px 0 rgba(255,255,255,0.22); filter: brightness(1.08); }
  .lp-btn-ghost { background: ${colors.glass}; color: ${colors.text}; border-color: ${colors.glassBorder}; backdrop-filter: blur(8px); }
  .lp-btn-ghost:hover { border-color: ${colors.accent}; background: ${colors.accentSoft}; }
  .lp-btn-arrow { transition: transform .15s ease; }
  .lp-btn:hover .lp-btn-arrow { transform: translateX(3px); }

  .lp-hero { position: relative; text-align: center; padding: 90px 24px 80px; }
  .lp-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; animation: lpFloat 14s ease-in-out infinite alternate; }
  .lp-orb-a { width: 520px; height: 520px; top: -180px; left: 50%; margin-left: -460px; background: rgba(124,108,255,0.20); }
  .lp-orb-b { width: 420px; height: 420px; top: -60px; left: 50%; margin-left: 80px; background: rgba(34,211,238,0.10); animation-delay: -7s; }
  .lp-orb-c { width: 480px; height: 480px; bottom: -240px; left: 50%; margin-left: -240px; background: rgba(124,108,255,0.14); }
  @keyframes lpFloat { from { transform: translateY(-14px); } to { transform: translateY(22px); } }

  .lp-eyebrow { position: relative; display: inline-flex; align-items: center; gap: 9px; font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: ${colors.accentHover}; margin-bottom: 26px; padding: 8px 16px; border-radius: ${radius.pill}; background: ${colors.accentSoft}; border: 1px solid rgba(124,108,255,0.25); }
  .lp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: ${colors.accent}; box-shadow: 0 0 10px ${colors.accent}; animation: lpPulse 2.2s ease-in-out infinite; }
  @keyframes lpPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

  .lp-title { position: relative; font-family: ${fonts.display}; font-size: clamp(44px, 7.5vw, 86px); font-weight: 700; line-height: 1.02; letter-spacing: -0.025em; margin: 0; }
  .lp-grad { background: ${gradients.textBright}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .lp-sub { position: relative; max-width: 560px; margin: 28px auto 0; color: ${colors.textSecondary}; font-size: 18px; line-height: 1.65; }
  .lp-cta { position: relative; display: flex; gap: 14px; justify-content: center; margin-top: 40px; }

  .lp-panel { position: relative; max-width: 620px; margin: 70px auto 0; border-radius: ${radius.lg}; padding: 0 0 14px; overflow: hidden; ${glassCss} box-shadow: 0 30px 80px rgba(0,0,0,0.25), 0 0 80px rgba(124,108,255,0.08); }
  .lp-panel-head { display: flex; align-items: center; gap: 7px; padding: 14px 18px; border-bottom: 1px solid ${colors.glassBorder}; }
  .lp-panel-dot { width: 9px; height: 9px; border-radius: 50%; background: ${colors.elevated}; border: 1px solid ${colors.glassBorder}; }
  .lp-panel-title { margin-left: 10px; font-family: ${fonts.mono}; font-size: 10px; letter-spacing: .14em; color: ${colors.textMuted}; }
  .lp-panel-row { display: grid; grid-template-columns: 44px 90px 1fr 44px; align-items: center; gap: 14px; padding: 11px 20px; }
  .lp-panel-row + .lp-panel-row { border-top: 1px solid ${colors.glassBorder}; }
  .lp-panel-rank { font-family: ${fonts.mono}; font-size: 12px; color: ${colors.accentHover}; text-align: left; }
  .lp-panel-ticker { font-family: ${fonts.mono}; font-size: 11px; color: ${colors.textMuted}; letter-spacing: 2px; }
  .lp-panel-bar { height: 6px; border-radius: 3px; background: ${colors.inset}; overflow: hidden; }
  .lp-panel-bar span { display: block; height: 100%; border-radius: 3px; background: ${gradients.score}; }
  .lp-panel-score { font-family: ${fonts.mono}; font-size: 12px; color: ${colors.text}; text-align: right; font-feature-settings: "tnum" 1; }

  .lp-trust { max-width: 1000px; margin: 0 auto; padding: 20px 40px 10px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .lp-trust-label { font-family: ${fonts.mono}; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: ${colors.textMuted}; }
  .lp-trust-logos { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
  .lp-trust-item { font-family: ${fonts.display}; font-weight: 600; font-size: 16px; color: ${colors.textSecondary}; opacity: .8; padding: 8px 16px; border-radius: ${radius.pill}; border: 1px solid ${colors.borderSubtle}; }

  .lp-section { position: relative; max-width: 1080px; margin: 0 auto; padding: 80px 40px; }
  .lp-kicker { font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: ${colors.accentHover}; text-align: center; margin-bottom: 14px; }
  .lp-h2 { font-family: ${fonts.display}; font-size: clamp(28px, 4vw, 44px); font-weight: 700; line-height: 1.12; letter-spacing: -0.015em; text-align: center; margin: 0 0 48px; color: ${colors.text}; }

  .lp-flow { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .lp-flow-line { position: absolute; top: 39px; left: 6%; right: 6%; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,108,255,0.45), rgba(124,108,255,0.45), transparent); pointer-events: none; }
  .lp-flow-card { position: relative; border-radius: ${radius.md}; padding: 28px 22px; transition: transform .15s ease, box-shadow .15s ease; ${glassCss} }
  .lp-flow-card:hover { transform: translateY(-4px); box-shadow: 0 16px 44px rgba(0,0,0,0.25), 0 0 40px rgba(124,108,255,0.12); }
  .lp-flow-n { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: ${radius.pill}; font-family: ${fonts.mono}; font-size: 12px; color: #fff; background: ${gradients.brand}; box-shadow: 0 0 18px rgba(124,108,255,0.4); margin-bottom: 16px; }
  .lp-flow-title { font-family: ${fonts.display}; font-size: 17px; font-weight: 700; margin-bottom: 8px; color: ${colors.text}; }
  .lp-flow-desc { font-size: 14px; color: ${colors.textSecondary}; line-height: 1.55; }

  .lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .lp-feature { border-radius: ${radius.md}; padding: 28px 24px; transition: transform .15s ease, box-shadow .15s ease; ${glassCss} }
  .lp-feature:hover { transform: translateY(-4px); box-shadow: 0 16px 44px rgba(0,0,0,0.25), 0 0 40px rgba(124,108,255,0.12); }
  .lp-feature-icon { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: ${radius.sm}; background: ${colors.accentSoft}; color: ${colors.accentHover}; border: 1px solid rgba(124,108,255,0.25); margin-bottom: 18px; }
  .lp-feature-title { font-family: ${fonts.display}; font-size: 18px; font-weight: 700; margin-bottom: 8px; color: ${colors.text}; }
  .lp-feature-desc { font-size: 14px; color: ${colors.textSecondary}; line-height: 1.6; }

  .lp-teaser { display: flex; align-items: center; justify-content: space-between; gap: 30px; flex-wrap: wrap; border-radius: ${radius.lg}; padding: 44px; background: linear-gradient(165deg, ${colors.accentSoft}, transparent 70%); border: 1px solid rgba(124,108,255,0.3); }
  .lp-teaser-sub { color: ${colors.textSecondary}; font-size: 16px; margin: 16px 0 0; max-width: 420px; line-height: 1.6; }

  .lp-faq-section { max-width: 820px; }
  .lp-faq { display: flex; flex-direction: column; gap: 12px; }
  .lp-faq-item { border-radius: ${radius.md}; ${glassCss} overflow: hidden; }
  .lp-faq-item.open { border-color: rgba(124,108,255,0.35); }
  .lp-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; background: transparent; border: none; cursor: pointer; text-align: left; color: ${colors.text}; font-family: ${fonts.sans}; font-size: 16px; font-weight: 600; }
  .lp-faq-chev { color: ${colors.accentHover}; font-size: 22px; line-height: 1; }
  .lp-faq-a { padding: 0 24px 22px; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.65; }

  .lp-footcta { position: relative; text-align: center; padding: 110px 24px; overflow: hidden; border-top: 1px solid ${colors.borderSubtle}; }

  @media (max-width: 860px) {
    .lp-flow { grid-template-columns: 1fr 1fr; }
    .lp-flow-line { display: none; }
    .lp-features { grid-template-columns: 1fr; }
    .lp-section { padding: 56px 22px; }
    .lp-hero { padding: 70px 20px 60px; }
    .lp-teaser { padding: 32px 24px; }
  }
  @media (max-width: 520px) { .lp-flow { grid-template-columns: 1fr; } .lp-cta { flex-direction: column; align-items: center; } }
`;

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingNav from "../components/MarketingNav";
import MarketingFooter from "../components/MarketingFooter";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

// Dummy About page — placeholder copy, fully themed.
const VALUES = [
  { title: "Defensible by design", desc: "Every score traces back to a KPI, a weight and a direction you control. No black boxes." },
  { title: "Analyst-first", desc: "Built around the real workflow of equity research — export, map, rank, export again." },
  { title: "Your methodology", desc: "Matrix runs your templates. The edge stays yours; we just make it fast and repeatable." },
];

const STATS = [
  { k: "3-stage", v: "pipeline: format → map → rank" },
  { k: "190 → 130", v: "industry-to-sector mapping" },
  { k: "1 click", v: "from raw export to ranked report" },
];

export default function AboutPage() {
  return (
    <div style={{ color: colors.text, fontFamily: fonts.sans, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{ABOUT_CSS}</style>
      <MarketingNav />

      <section className="ab-hero">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="ab-kicker">About Matrix</div>
          <h1 className="ab-title">We turn fundamentals into<br /><span className="ab-grad">defensible rankings.</span></h1>
          <p className="ab-sub">
            Matrix is a proprietary equity-ranking engine. It maps company fundamentals
            to your sectors and scores them against your KPI templates — so your team
            spends time on judgement, not spreadsheets. (This page is placeholder copy.)
          </p>
        </motion.div>
      </section>

      <section className="ab-section">
        <div className="ab-stats">
          {STATS.map((s) => (
            <div key={s.k} className="ab-stat">
              <div className="ab-stat-k">{s.k}</div>
              <div className="ab-stat-v">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-section">
        <h2 className="ab-h2">What we believe</h2>
        <div className="ab-values">
          {VALUES.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.06 }} className="ab-value">
              <div className="ab-value-title">{v.title}</div>
              <div className="ab-value-desc">{v.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="ab-cta-section">
        <div className="ab-cta">
          <h2 className="ab-h2" style={{ margin: 0 }}>See it on your own data</h2>
          <Link to="/signup" className="ab-btn">Get Started <span>→</span></Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

const ABOUT_CSS = `
  .ab-hero { text-align: center; padding: 80px 24px 40px; max-width: 760px; margin: 0 auto; }
  .ab-kicker { font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: ${colors.accentHover}; margin-bottom: 16px; }
  .ab-title { font-family: ${fonts.display}; font-size: clamp(34px, 5.5vw, 60px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; margin: 0; color: ${colors.text}; }
  .ab-grad { background: ${gradients.textBright}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .ab-sub { color: ${colors.textSecondary}; font-size: 17px; line-height: 1.7; margin: 24px auto 0; max-width: 600px; }

  .ab-section { max-width: 1000px; margin: 0 auto; padding: 40px 40px; }
  .ab-h2 { font-family: ${fonts.display}; font-size: clamp(26px, 3.5vw, 38px); font-weight: 700; text-align: center; letter-spacing: -0.015em; margin: 0 0 36px; color: ${colors.text}; }

  .ab-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .ab-stat { text-align: center; border-radius: ${radius.md}; padding: 30px 20px; ${glassCss} }
  .ab-stat-k { font-family: ${fonts.display}; font-size: 30px; font-weight: 700; background: ${gradients.textBright}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .ab-stat-v { color: ${colors.textSecondary}; font-size: 14px; margin-top: 8px; }

  .ab-values { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .ab-value { border-radius: ${radius.md}; padding: 28px 24px; ${glassCss} }
  .ab-value-title { font-family: ${fonts.display}; font-size: 18px; font-weight: 700; margin-bottom: 10px; color: ${colors.text}; }
  .ab-value-desc { color: ${colors.textSecondary}; font-size: 14px; line-height: 1.6; }

  .ab-cta-section { max-width: 1000px; margin: 20px auto 0; padding: 40px; }
  .ab-cta { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; border-radius: ${radius.lg}; padding: 40px 44px; background: linear-gradient(165deg, ${colors.accentSoft}, transparent 70%); border: 1px solid rgba(124,108,255,0.3); }
  .ab-btn { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; border-radius: ${radius.pill}; padding: 15px 30px; background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22); transition: all .15s ease; }
  .ab-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
  .ab-btn span { transition: transform .15s ease; }
  .ab-btn:hover span { transform: translateX(3px); }

  @media (max-width: 860px) {
    .ab-stats, .ab-values { grid-template-columns: 1fr; }
    .ab-section { padding: 30px 22px; }
  }
`;

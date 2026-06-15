import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingNav from "../components/MarketingNav";
import MarketingFooter from "../components/MarketingFooter";
import { apiUrl } from "../api";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

// Fallback tiers if the backend isn't reachable — keeps the page presentable.
const FALLBACK_PLANS = [
  { id: "free", name: "Free", price: 0, period: "forever", tagline: "Everything you need to rank your first universe.", features: ["Full ranking pipeline", "Column mapper & KPI editor", "Results dashboard & Excel export"], cta: "Get started", comingSoon: false, highlighted: false },
  { id: "premium", name: "Premium", price: 49, period: "month", tagline: "For analysts running rankings every day.", features: ["Everything in Free", "Saved pipelines & history", "Larger universes & priority runs"], cta: "Coming soon", comingSoon: true, highlighted: true },
  { id: "enterprise", name: "Enterprise", price: null, period: "custom", tagline: "For funds with bespoke needs.", features: ["Everything in Premium", "Custom KPI templates & SSO", "Dedicated support"], cta: "Contact us", comingSoon: true, highlighted: false },
];

function priceLabel(plan) {
  if (plan.price === null || plan.price === undefined) return "Custom";
  if (plan.price === 0) return "$0";
  return `$${plan.price}`;
}

export default function PricingPage() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/plans"))
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data) && data.length) setPlans(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ color: colors.text, fontFamily: fonts.sans, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{PRICING_CSS}</style>
      <MarketingNav />

      <section className="pr-hero">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="pr-kicker">Pricing</div>
          <h1 className="pr-title">Simple, transparent plans</h1>
          <p className="pr-sub">Start on Free today. Paid tiers below are placeholders — final names and prices are coming soon.</p>
        </motion.div>
      </section>

      <section className="pr-grid-wrap">
        <div className="pr-grid">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className={`pr-card ${plan.highlighted ? "highlighted" : ""}`}
            >
              {plan.highlighted && <div className="pr-badge">Most popular</div>}
              <div className="pr-plan-name">{plan.name}</div>
              <div className="pr-price">
                <span className="pr-price-amt">{priceLabel(plan)}</span>
                {plan.price !== null && plan.price !== undefined && plan.period !== "forever" && (
                  <span className="pr-price-per">/{plan.period}</span>
                )}
                {plan.period === "forever" && <span className="pr-price-per">forever</span>}
              </div>
              <p className="pr-tagline">{plan.tagline}</p>
              <ul className="pr-features">
                {plan.features.map((f) => (
                  <li key={f}><span className="pr-tick">✓</span>{f}</li>
                ))}
              </ul>
              {plan.comingSoon ? (
                <button className="pr-cta pr-cta-muted" disabled>{plan.cta || "Coming soon"}</button>
              ) : (
                <Link to="/signup" className="pr-cta pr-cta-solid">{plan.cta || "Get started"}</Link>
              )}
            </motion.div>
          ))}
        </div>
        <p className="pr-note">Paid tiers are not yet billable. Every account starts on the Free plan.</p>
      </section>

      <MarketingFooter />
    </div>
  );
}

const PRICING_CSS = `
  .pr-hero { text-align: center; padding: 80px 24px 30px; max-width: 720px; margin: 0 auto; }
  .pr-kicker { font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: ${colors.accentHover}; margin-bottom: 14px; }
  .pr-title { font-family: ${fonts.display}; font-size: clamp(34px, 5vw, 56px); font-weight: 700; letter-spacing: -0.02em; margin: 0; color: ${colors.text}; }
  .pr-sub { color: ${colors.textSecondary}; font-size: 17px; line-height: 1.6; margin: 20px auto 0; max-width: 540px; }

  .pr-grid-wrap { max-width: 1080px; margin: 0 auto; padding: 40px 40px 20px; }
  .pr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
  .pr-card { position: relative; display: flex; flex-direction: column; border-radius: ${radius.lg}; padding: 32px 28px; ${glassCss} }
  .pr-card.highlighted { border-color: rgba(124,108,255,0.5); border-top-color: rgba(157,144,255,0.6); box-shadow: 0 20px 60px rgba(124,108,255,0.18); }
  .pr-badge { position: absolute; top: -12px; left: 28px; font-family: ${fonts.mono}; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #fff; background: ${gradients.brand}; padding: 5px 12px; border-radius: ${radius.pill}; box-shadow: 0 6px 18px rgba(124,108,255,0.4); }
  .pr-plan-name { font-family: ${fonts.display}; font-size: 20px; font-weight: 700; color: ${colors.text}; }
  .pr-price { display: flex; align-items: baseline; gap: 6px; margin: 16px 0 4px; }
  .pr-price-amt { font-family: ${fonts.display}; font-size: 44px; font-weight: 700; letter-spacing: -0.02em; color: ${colors.text}; }
  .pr-price-per { color: ${colors.textMuted}; font-size: 14px; }
  .pr-tagline { color: ${colors.textSecondary}; font-size: 14px; line-height: 1.55; margin: 8px 0 22px; min-height: 42px; }
  .pr-features { list-style: none; margin: 0 0 26px; padding: 0; display: flex; flex-direction: column; gap: 13px; flex: 1; }
  .pr-features li { display: flex; align-items: flex-start; gap: 11px; font-size: 14px; color: ${colors.text}; line-height: 1.4; }
  .pr-tick { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; border-radius: 999px; background: ${colors.accentSoft}; color: ${colors.accentHover}; font-size: 11px; }
  .pr-cta { display: inline-flex; align-items: center; justify-content: center; height: 46px; border-radius: ${radius.sm}; font-weight: 600; font-size: 15px; font-family: ${fonts.sans}; cursor: pointer; border: 1px solid transparent; transition: all .15s ease; }
  .pr-cta-solid { background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22); }
  .pr-cta-solid:hover { transform: translateY(-1px); filter: brightness(1.08); }
  .pr-cta-muted { background: ${colors.glass}; color: ${colors.textMuted}; border-color: ${colors.glassBorder}; cursor: not-allowed; }
  .pr-note { text-align: center; color: ${colors.textMuted}; font-size: 13px; margin: 28px 0 0; }

  @media (max-width: 860px) { .pr-grid { grid-template-columns: 1fr; } .pr-grid-wrap { padding: 30px 22px; } }
`;

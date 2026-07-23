import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingNav from "../components/MarketingNav";
import MarketingFooter from "../components/MarketingFooter";
import Seo from "../seo";
import { apiUrl } from "../api";
import { colors, gradients, fonts, radius, glassCss } from "../theme";

const CONTACT_EMAIL = "connect@thinkvest.in";

const FALLBACK_PLANS = [
  {
    id: "standard",
    name: "Standard",
    tagline: "Everything you need to rank, analyse, and compare stocks - free for 3 months.",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    yearlyDiscountPct: 17,
    trialDays: 90,
    highlighted: true,
    cta: "Start free trial",
    features: [
      "Rank any stock universe in minutes",
      "Smart composite scoring across multiple KPIs",
      "Filter stocks with simple expressions before ranking",
      "Compare 2–6 companies head-to-head with charts",
      "Company deep dive - live price, fundamentals & charts",
      "Customise KPI weights to match your investment style",
      "Email PDF summary of top-ranked companies",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Advanced analytics, real-time alerts, watchlists & AI interpretation.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscountPct: 0,
    trialDays: 0,
    highlighted: false,
    cta: "Contact us to upgrade",
    features: [
      "Everything in Standard",
      "Real-time alerts on earnings & critical news",
      "Custom stock watchlist",
      "Daily BSE/NSE company announcements feed",
      "Multi-year historical data & KPI time-series",
      "AI Interpretation Engine - plain-language insights",
    ],
  },
];

function priceLabel(plan, period) {
  const price = period === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  if (!price) return "Contact us";
  return `₹${price.toLocaleString("en-IN")}`;
}

function pricePer(period) {
  return period === "yearly" ? "/ year" : "/ month";
}

function isContactPlan(plan) {
  return !plan.monthlyPrice && !plan.yearlyPrice;
}

export default function PricingPage() {
  const [plans, setPlans]   = useState(FALLBACK_PLANS);
  const [period, setPeriod] = useState("monthly"); // "monthly" | "yearly"
  const [promo, setPromo]   = useState(null); // { promoBanner, promoExpiry } | null

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/plans"))
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data) && data.length) setPlans(data); })
      .catch(() => {});
    fetch(apiUrl("/promo"))
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.promoBanner) setPromo(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ color: colors.text, fontFamily: fonts.sans, minHeight: "100vh", overflowX: "hidden" }}>
      <Seo
        title="Pricing"
        path="/pricing"
        description="Start free for 90 days with the full ThinkVest ranking pipeline. Upgrade to Standard from ₹499/month."
      />
      <style>{PRICING_CSS}</style>

      {/* ── Announcement bar — promo when active, else free trial ── */}
      {(() => {
        const maxTrial = Math.max(...plans.map((p) => p.trialDays || 0));
        const showPromo = promo?.promoBanner;
        const promoExpiry = promo?.promoExpiry ? new Date(promo.promoExpiry) : null;
        if (!showPromo && !maxTrial) return null;
        return (
          <motion.div
            className="pr-trial-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="pr-trial-bar-dot" />
            {showPromo ? (
              <span>
                {promo.promoBanner}
                {promoExpiry && (
                  <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
                    · Ends {promoExpiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </span>
            ) : (
              <span>
                <strong>{maxTrial}-day free trial</strong> — full access, no credit card required.
              </span>
            )}
            <Link to="/signup" className="pr-trial-bar-cta">
              {showPromo ? "Claim offer →" : "Start free →"}
            </Link>
          </motion.div>
        );
      })()}

      <MarketingNav />

      <section className="pr-hero">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="pr-kicker">Pricing</div>
          <h1 className="pr-title">Simple, transparent plans</h1>
          <p className="pr-sub">Try everything free for {Math.max(...plans.map((p) => p.trialDays || 0)) || 90} days. Upgrade when you're ready.</p>
        </motion.div>

        {/* Monthly / Yearly toggle */}
        <div className="pr-toggle-wrap">
          <button
            className={`pr-toggle-btn${period === "monthly" ? " active" : ""}`}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`pr-toggle-btn${period === "yearly" ? " active" : ""}`}
            onClick={() => setPeriod("yearly")}
          >
            Yearly
            {plans.some((p) => p.yearlyDiscountPct > 0) && (
              <span className="pr-toggle-badge">
                Save {Math.max(...plans.map((p) => p.yearlyDiscountPct || 0))}%
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="pr-grid-wrap">
        <div className={`pr-grid pr-grid-${plans.length}`}>
          {plans.map((plan, i) => {
            const contact = isContactPlan(plan);
            const showDiscount = period === "yearly" && plan.yearlyDiscountPct > 0;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className={`pr-card${plan.highlighted ? " highlighted" : ""}`}
              >
                {plan.highlighted && <div className="pr-badge">Most popular</div>}

                <div className="pr-plan-name">{plan.name}</div>

                {plan.trialDays > 0 && (
                  <div className="pr-trial-badge">{plan.trialDays}-day free trial</div>
                )}

                <div className="pr-price">
                  {contact ? (
                    <span className="pr-price-amt" style={{ fontSize: 30 }}>Contact us</span>
                  ) : (
                    <>
                      <span className="pr-price-amt">{priceLabel(plan, period)}</span>
                      <span className="pr-price-per">{pricePer(period)}</span>
                    </>
                  )}
                </div>

                {showDiscount && (
                  <div className="pr-discount-badge">Save {plan.yearlyDiscountPct}% vs monthly</div>
                )}

                <p className="pr-tagline">{plan.tagline}</p>

                <ul className="pr-features">
                  {plan.features.map((f) => (
                    <li key={f}><span className="pr-tick">✓</span>{f}</li>
                  ))}
                </ul>

                {contact ? (
                  <a href={`mailto:${CONTACT_EMAIL}`} className="pr-cta pr-cta-outline">
                    ✉ {plan.cta || "Contact us"}
                  </a>
                ) : (
                  <Link to="/signup" className="pr-cta pr-cta-solid">
                    {plan.cta || "Get started"}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

const PRICING_CSS = `
  .pr-trial-bar {
    display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;
    background: linear-gradient(90deg, rgba(16,185,129,.12) 0%, rgba(16,185,129,.06) 100%);
    border-bottom: 1px solid rgba(16,185,129,.25);
    padding: 11px 24px; font-size: 14px; color: ${colors.text};
    text-align: center;
  }
  .pr-trial-bar strong { color: #10B981; }
  .pr-trial-bar-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #10B981; flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(16,185,129,.25);
    animation: pr-pulse 2s ease-in-out infinite;
  }
  @keyframes pr-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,.25); }
    50%       { box-shadow: 0 0 0 6px rgba(16,185,129,.08); }
  }
  .pr-trial-bar-cta {
    font-size: 13px; font-weight: 700; color: #10B981;
    background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.35);
    border-radius: 999px; padding: 3px 12px; text-decoration: none;
    transition: background .15s;
  }
  .pr-trial-bar-cta:hover { background: rgba(16,185,129,.25); }

  .pr-hero { text-align: center; padding: 80px 24px 30px; max-width: 720px; margin: 0 auto; }
  .pr-kicker { font-family: ${fonts.mono}; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: ${colors.accentHover}; margin-bottom: 14px; }
  .pr-title { font-family: ${fonts.display}; font-size: clamp(34px, 5vw, 56px); font-weight: 700; letter-spacing: -0.02em; margin: 0; color: ${colors.text}; }
  .pr-sub { color: ${colors.textSecondary}; font-size: 17px; line-height: 1.6; margin: 20px auto 0; max-width: 540px; }

  .pr-toggle-wrap { display: inline-flex; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 3px; margin-top: 28px; gap: 2px; }
  .pr-toggle-btn { background: none; border: none; border-radius: 8px; padding: 8px 20px; font-size: 14px; font-weight: 600; font-family: ${fonts.sans}; color: ${colors.textMuted}; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 7px; }
  .pr-toggle-btn.active { background: var(--accent); color: #fff; }
  .pr-toggle-badge { font-size: 10px; font-weight: 700; border-radius: 999px; padding: 2px 7px; background: rgba(16,185,129,.15); color: #10B981; border: 1px solid rgba(16,185,129,.35); }
  .pr-toggle-btn.active .pr-toggle-badge { background: rgba(255,255,255,.25); color: #fff; border-color: rgba(255,255,255,.3); }

  .pr-grid-wrap { max-width: 1080px; margin: 0 auto; padding: 40px 40px 60px; }
  .pr-grid { display: grid; gap: 20px; align-items: stretch; }
  .pr-grid-1 { grid-template-columns: minmax(0, 480px); justify-content: center; }
  .pr-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .pr-grid-3 { grid-template-columns: repeat(3, 1fr); }

  .pr-card { position: relative; display: flex; flex-direction: column; border-radius: ${radius.lg}; padding: 32px 28px; ${glassCss} }
  .pr-card.highlighted { border-color: rgba(16,185,129,0.5); border-top-color: rgba(52,211,153,0.6); box-shadow: 0 20px 60px rgba(16,185,129,0.18); }
  .pr-badge { position: absolute; top: -12px; left: 28px; font-family: ${fonts.mono}; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #fff; background: ${gradients.brand}; padding: 5px 12px; border-radius: ${radius.pill}; box-shadow: 0 6px 18px rgba(16,185,129,0.4); }
  .pr-plan-name { font-family: ${fonts.display}; font-size: 20px; font-weight: 700; color: ${colors.text}; }
  .pr-trial-badge { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border: 1px solid rgba(16,185,129,.25); border-radius: 999px; padding: 3px 10px; }
  .pr-price { display: flex; align-items: baseline; gap: 6px; margin: 14px 0 4px; }
  .pr-price-amt { font-family: ${fonts.display}; font-size: 44px; font-weight: 700; letter-spacing: -0.02em; color: ${colors.text}; }
  .pr-price-per { color: ${colors.textMuted}; font-size: 14px; }
  .pr-discount-badge { display: inline-block; font-size: 11px; font-weight: 600; color: #22C55E; background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.25); border-radius: 999px; padding: 3px 10px; margin-bottom: 4px; }
  .pr-tagline { color: ${colors.textSecondary}; font-size: 14px; line-height: 1.55; margin: 8px 0 22px; min-height: 42px; }
  .pr-features { list-style: none; margin: 0 0 26px; padding: 0; display: flex; flex-direction: column; gap: 13px; flex: 1; }
  .pr-features li { display: flex; align-items: flex-start; gap: 11px; font-size: 14px; color: ${colors.text}; line-height: 1.4; }
  .pr-tick { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; border-radius: 999px; background: ${colors.accentSoft}; color: ${colors.accentHover}; font-size: 11px; }
  .pr-cta { display: inline-flex; align-items: center; justify-content: center; height: 46px; border-radius: ${radius.sm}; font-weight: 600; font-size: 15px; font-family: ${fonts.sans}; cursor: pointer; border: 1px solid transparent; transition: all .15s ease; text-decoration: none; }
  .pr-cta-solid { background: ${gradients.brand}; color: #fff; box-shadow: 0 4px 18px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.22); }
  .pr-cta-solid:hover { transform: translateY(-1px); filter: brightness(1.08); }
  .pr-cta-outline { background: transparent; color: ${colors.textSecondary}; border-color: var(--border); }
  .pr-cta-outline:hover { border-color: var(--accent); color: var(--accent); }

  @media (max-width: 860px) { .pr-grid-2, .pr-grid-3 { grid-template-columns: 1fr; } .pr-grid-wrap { padding: 30px 22px 40px; } }
`;

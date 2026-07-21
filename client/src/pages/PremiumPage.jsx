import { colors, fonts, radius } from "../theme";

const CONTACT_EMAIL = "connect@thinkvest.in";

const FEATURES = [
  {
    icon: "📊",
    title: "Detailed Stock Analysis",
    desc: "Deep-dive fundamental analysis per company — margins, ratios, valuations, and score breakdowns pulled directly from screener data.",
  },
  {
    icon: "🧭",
    title: "Logical Comparison Dashboard",
    desc: "Side-by-side analysis of 2–6 companies with radar charts, percentile rankings, sector benchmarking, and leaderboard scoring.",
  },
  {
    icon: "🔔",
    title: "Alerts for Critical News",
    desc: "Real-time notifications on material events — earnings, downgrades, regulatory filings, and macro signals affecting your tracked stocks.",
  },
  {
    icon: "⭐",
    title: "Custom Stock Watchlist",
    desc: "Build and manage personal watchlists. Track price, key KPIs, and movement across your curated universe of companies.",
  },
  {
    icon: "📢",
    title: "Daily Company Announcements",
    desc: "Automated real-time feed of BSE/NSE announcements, results, board meetings, and exchange disclosures for any listed company.",
  },
  {
    icon: "📈",
    title: "Historical Data",
    desc: "Access multi-year OHLCV price history and fundamental time-series data to back-test theses and track KPI trends over time.",
  },
  {
    icon: "🤖",
    title: "AI Interpretation Engine",
    desc: "Run a large language model directly on your ranked dataset. Get accurate, reliable interpretation of scores, outliers, and sector trends — plain-language insights grounded in your own data.",
    highlight: true,
  },
];

export default function PremiumPage() {
  return (
    <div style={{
      minHeight: "100vh", background: colors.canvas,
      fontFamily: fonts.sans, padding: "0 0 60px",
    }}>
      <style>{`
        .pm-hero {
          text-align: center;
          padding: 56px 24px 40px;
          border-bottom: 1px solid ${colors.border};
        }
        .pm-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--accent-soft); color: var(--accent);
          font-size: 11px; font-weight: 700; letter-spacing: .07em;
          text-transform: uppercase; padding: 4px 12px;
          border-radius: 999px; margin-bottom: 18px;
        }
        .pm-title {
          font-size: clamp(24px, 5vw, 38px); font-weight: 800;
          color: ${colors.text}; margin: 0 0 12px; line-height: 1.15;
        }
        .pm-title span { color: var(--accent); }
        .pm-sub {
          font-size: 15px; color: ${colors.textSecondary};
          max-width: 520px; margin: 0 auto 28px; line-height: 1.6;
        }
        .pm-cta-wrap {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; flex-wrap: wrap;
        }
        .pm-cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--accent); color: #fff;
          padding: 11px 26px; border-radius: ${radius.md};
          font-size: 14px; font-weight: 600;
          text-decoration: none; transition: opacity .15s;
          border: none; cursor: pointer;
        }
        .pm-cta-primary:hover { opacity: .88; }
        .pm-cta-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          color: ${colors.textSecondary}; font-size: 13px;
          background: none; border: none; cursor: default;
        }

        .pm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px; max-width: 1000px; margin: 40px auto 0;
          padding: 0 24px;
        }
        .pm-card {
          background: ${colors.card}; border: 1px solid ${colors.border};
          border-radius: ${radius.lg}; padding: 24px 22px;
          transition: border-color .15s, transform .15s;
          position: relative; overflow: hidden;
        }
        .pm-card:hover {
          border-color: var(--accent); transform: translateY(-2px);
        }
        .pm-card.highlight {
          border-color: var(--accent);
          background: linear-gradient(135deg, ${colors.card} 70%, var(--accent-soft) 100%);
        }
        .pm-card.highlight::before {
          content: "FLAGSHIP";
          position: absolute; top: 12px; right: 14px;
          font-size: 9px; font-weight: 700; letter-spacing: .1em;
          color: var(--accent); opacity: .7;
        }
        .pm-icon {
          font-size: 28px; margin-bottom: 12px; display: block;
        }
        .pm-feat-title {
          font-size: 14px; font-weight: 700; color: ${colors.text};
          margin: 0 0 8px;
        }
        .pm-feat-desc {
          font-size: 13px; color: ${colors.textSecondary};
          line-height: 1.6; margin: 0;
        }

        .pm-contact {
          max-width: 560px; margin: 48px auto 0; padding: 0 24px;
          text-align: center;
        }
        .pm-contact-box {
          background: ${colors.card}; border: 1px solid ${colors.border};
          border-radius: ${radius.lg}; padding: 32px 28px;
        }
        .pm-contact-title {
          font-size: 18px; font-weight: 700; color: ${colors.text}; margin: 0 0 8px;
        }
        .pm-contact-sub {
          font-size: 13px; color: ${colors.textSecondary}; margin: 0 0 20px; line-height: 1.6;
        }
        .pm-email-link {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--accent-soft); color: var(--accent);
          font-size: 14px; font-weight: 600; padding: 10px 22px;
          border-radius: ${radius.md}; text-decoration: none;
          transition: background .15s;
        }
        .pm-email-link:hover { background: var(--focus-glow); }
        .pm-contact-note {
          font-size: 11px; color: ${colors.textMuted}; margin-top: 14px;
        }

        @media (max-width: 600px) {
          .pm-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="pm-hero">
        <div className="pm-badge">⚡ Premium</div>
        <h1 className="pm-title">
          Unlock the full power of <span>ThinkVest</span>
        </h1>
        <p className="pm-sub">
          Everything in the free plan, plus advanced analytics, real-time alerts,
          watchlists, and AI-driven interpretation of your ranked datasets.
        </p>
        <div className="pm-cta-wrap">
          <a href={`mailto:${CONTACT_EMAIL}`} className="pm-cta-primary">
            ✉ Contact us to upgrade
          </a>
          <span className="pm-cta-secondary">📧 {CONTACT_EMAIL}</span>
        </div>
      </div>

      {/* ── Feature grid ── */}
      <div className="pm-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className={`pm-card${f.highlight ? " highlight" : ""}`}>
            <span className="pm-icon">{f.icon}</span>
            <p className="pm-feat-title">{f.title}</p>
            <p className="pm-feat-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Contact box ── */}
      <div className="pm-contact">
        <div className="pm-contact-box">
          <p className="pm-contact-title">Ready to upgrade?</p>
          <p className="pm-contact-sub">
            Reach out to our team and we'll get you set up with the right plan
            for your workflow. Typically respond within 24 hours.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="pm-email-link">
            ✉ {CONTACT_EMAIL}
          </a>
          <p className="pm-contact-note">
            You can also reach us at support@thinkvest.in
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getUser, logOut } from "../auth";
import { useNavigate } from "react-router-dom";
import { colors, fonts, radius } from "../theme";
import { apiUrl } from "../api";
import PaymentButton from "../components/PaymentButton";

const CONTACT_EMAIL = "connect@thinkvest.in";

const FALLBACK_PLAN = {
  features: [
    "Full ranking pipeline (format → map → rank)",
    "Column mapper & KPI library editor",
    "Results dashboard & Excel export",
    "Screener with advanced DSL filters",
    "Company comparison dashboard",
  ],
  monthlyPrice: 499,
  yearlyPrice: 4999,
  yearlyDiscountPct: 17,
};

export default function UpgradePage() {
  const user = getUser();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(FALLBACK_PLAN);

  useEffect(() => {
    fetch(apiUrl("/plans"))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const standard = data.find((p) => p.id === "standard") || data[0];
          if (standard) setPlan(standard);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveTrialEnd = (() => {
    if (user.trialEndsAt) return new Date(user.trialEndsAt);
    if (user.plan === "standard" && user.createdAt) {
      return new Date(new Date(user.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000);
    }
    return null;
  })();

  // Redirect users who already have active access away from this page
  const paidActive = user.paidUntil && new Date(user.paidUntil) > new Date();
  const trialActive = effectiveTrialEnd && effectiveTrialEnd > new Date();
  useEffect(() => {
    if (paidActive || trialActive || user.planOverrideFree) {
      navigate("/app", { replace: true });
    }
  }, [paidActive, trialActive, user.planOverrideFree, navigate]);
  const trialEndDate = effectiveTrialEnd
    ? effectiveTrialEnd.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const handleLogout = async () => {
    await logOut();
    navigate("/");
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="up-page">

          <div className="up-body">

          {/* Icon */}
          <div className="up-icon-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>

          {/* Headline */}
          <div className="up-eyebrow">Trial ended</div>
          <h1 className="up-title">Your free trial has expired</h1>
          <p className="up-sub">
            {trialEndDate
              ? <>Your 90-day free trial ended on <strong style={{ color: colors.text }}>{trialEndDate}</strong>. To continue using ThinkVest, please contact our team to activate a paid plan.</>
              : <>Your free trial period has ended. Contact our team to continue using ThinkVest.</>
            }
          </p>

          {/* Payment card */}
          <div className="up-contact-card">
            <div className="up-contact-label">Activate your plan</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              <PaymentButton
                period="monthly"
                user={user}
                label="Pay Monthly"
                priceLabel={
                  plan.monthlyDiscountedPrice > 0 ? (
                    <><s>₹{plan.monthlyPrice?.toLocaleString("en-IN")} / month</s>{" "}<span style={{ color: "#10B981", fontWeight: 700 }}>₹{plan.monthlyDiscountedPrice.toLocaleString("en-IN")} / month</span></>
                  ) : plan.monthlyPrice ? `₹${plan.monthlyPrice.toLocaleString("en-IN")} / month` : ""
                }
                onSuccess={() => navigate("/app")}
              />
              <PaymentButton
                period="yearly"
                user={user}
                label="Pay Yearly"
                priceLabel={
                  plan.yearlyDiscountedPrice > 0 ? (
                    <><s>₹{plan.yearlyPrice?.toLocaleString("en-IN")} / year</s>{" "}<span style={{ color: "#10B981", fontWeight: 700 }}>₹{plan.yearlyDiscountedPrice.toLocaleString("en-IN")} / year</span></>
                  ) : plan.yearlyPrice ? `₹${plan.yearlyPrice.toLocaleString("en-IN")} / year` : ""
                }
                discountLabel={
                  plan.yearlyDiscountedPrice > 0
                    ? `Save ₹${(plan.yearlyPrice - plan.yearlyDiscountedPrice).toLocaleString("en-IN")}`
                    : plan.yearlyDiscountPct ? `Save ${plan.yearlyDiscountPct}%` : ""
                }
                onSuccess={() => navigate("/app")}
              />
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
              Or email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: colors.textSecondary, textDecoration: "underline" }}>
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* What you get */}
          <div className="up-features-card">
            <div className="up-features-title">What you'll get with a paid plan</div>
            <div className="up-features-list">
              {(plan.features || []).map((f) => (
                <div key={f} className="up-feature-row">
                  <span className="up-feature-check">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <a href="/app/premium" className="up-premium-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              View all Premium features
            </a>
          </div>

          <p className="up-account-note">
            You can still access your{" "}
            <a href="/app/account" className="up-inline-link">account settings</a>
            {" "}and{" "}
            <button className="up-inline-btn" onClick={handleLogout}>sign out</button>.
          </p>
        </div>
      </div>
    </>
  );
}

const CSS = `
  .up-page {
    min-height: 100vh; background: var(--canvas);
    display: flex; flex-direction: column;
    font-family: ${fonts.sans};
  }

  .up-body {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    padding: 60px 24px 80px; text-align: center;
  }

  .up-icon-wrap {
    width: 72px; height: 72px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.3);
    margin-bottom: 20px;
  }

  .up-eyebrow {
    font-family: ${fonts.mono}; font-size: 11px; letter-spacing: .2em;
    text-transform: uppercase; color: #F59E0B; margin-bottom: 10px;
  }
  .up-title {
    font-family: 'Space Grotesk', ${fonts.sans};
    font-size: 30px; font-weight: 800; letter-spacing: -0.02em;
    color: ${colors.text}; margin: 0 0 14px;
  }
  .up-sub {
    font-size: 15px; color: ${colors.textSecondary}; max-width: 480px;
    line-height: 1.65; margin: 0 0 32px;
  }

  .up-contact-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 24px 32px; width: 100%; max-width: 420px;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    margin-bottom: 16px;
  }
  .up-contact-label {
    font-size: 11px; font-family: ${fonts.mono}; letter-spacing: .15em;
    text-transform: uppercase; color: ${colors.textMuted};
  }
  .up-contact-email {
    font-size: 16px; font-weight: 700; color: ${colors.text};
    text-decoration: none; letter-spacing: -0.01em;
  }
  .up-contact-email:hover { color: #10B981; }
  .up-cta-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg,#10B981 0%,#1E3A8A 100%);
    border: none; border-radius: ${radius.sm}; color: #fff;
    font-size: 14px; font-weight: 600; font-family: ${fonts.sans};
    padding: 11px 24px; cursor: pointer; text-decoration: none;
    box-shadow: 0 4px 20px rgba(16,185,129,.35); transition: opacity .15s;
    margin-top: 4px;
  }
  .up-cta-btn:hover { opacity: .88; }

  .up-features-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 20px 28px; width: 100%; max-width: 420px;
    text-align: left; margin-bottom: 28px;
  }
  .up-features-title {
    font-size: 12px; font-family: ${fonts.mono}; letter-spacing: .12em;
    text-transform: uppercase; color: ${colors.textMuted}; margin-bottom: 14px;
  }
  .up-features-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .up-feature-row {
    display: flex; align-items: flex-start; gap: 10px;
    font-size: 13px; color: ${colors.textSecondary};
  }
  .up-feature-check { color: #10B981; flex-shrink: 0; margin-top: 1px; }
  .up-premium-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: #A78BFA; text-decoration: none;
    background: rgba(124,108,255,.1); border: 1px solid rgba(124,108,255,.25);
    border-radius: 999px; padding: 5px 14px; transition: all .15s;
  }
  .up-premium-link:hover { background: rgba(124,108,255,.2); }

  .up-account-note {
    font-size: 13px; color: ${colors.textMuted}; margin: 0;
  }
  .up-inline-link { color: ${colors.textSecondary}; text-decoration: underline; }
  .up-inline-link:hover { color: ${colors.text}; }
  .up-inline-btn {
    background: none; border: none; padding: 0; cursor: pointer;
    font-family: ${fonts.sans}; font-size: 13px;
    color: ${colors.textSecondary}; text-decoration: underline;
  }
  .up-inline-btn:hover { color: #EF4444; }

  @media (max-width: 480px) {
    .up-body { padding: 40px 16px 60px; }
    .up-title { font-size: 24px; }
    .up-contact-card, .up-features-card { padding: 18px 20px; }
  }
`;

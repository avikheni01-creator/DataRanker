// PaymentButton - Razorpay payment trigger.
//
// Lazy-loads checkout.js on first click so it doesn't block page load.
// Creates a server-side order via POST /payment/create-order, opens the
// Razorpay modal, then verifies the payment via POST /payment/verify.
// Calls onSuccess(updatedUser) on completion; silent on modal dismiss.

import { useState } from "react";
import { apiFetch } from "../api";
import { saveUser } from "../auth";
import { fonts, radius } from "../theme";

function loadCheckoutScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PaymentButton({
  period,        // "monthly" | "yearly"
  user,          // current user object (for prefill)
  label,         // button text e.g. "Pay Monthly"
  priceLabel,    // shown below button e.g. "₹499 / month"
  discountLabel, // optional badge e.g. "Save 17%"
  onSuccess,     // (updatedUser) => void - called after verify succeeds
  buttonStyle,   // optional style overrides for the <button>
}) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setError("");
    setBusy(true);
    try {
      const loaded = await loadCheckoutScript();
      if (!loaded) throw new Error("Payment gateway failed to load. Check your internet connection.");

      const { orderId, amount, currency, key } = await apiFetch("/payment/create-order", {
        method: "POST",
        body:   JSON.stringify({ period }),
      });

      await new Promise((resolve, reject) => {
        let paymentAttempted = false;

        const rzp = new window.Razorpay({
          key,
          amount,
          currency,
          order_id:    orderId,
          name:        "ThinkVest",
          description: `Standard Plan - ${period === "yearly" ? "Yearly" : "Monthly"}`,
          theme:       { color: "#10B981" },
          prefill:     { name: user.name || "", email: user.email || "" },

          handler: async (response) => {
            paymentAttempted = true;
            try {
              const { user: updated } = await apiFetch("/payment/verify", {
                method: "POST",
                body:   JSON.stringify({ ...response, period }),
              });
              saveUser(updated);
              onSuccess(updated);
              resolve();
            } catch (err) {
              reject(err);
            }
          },

          modal: {
            // ondismiss fires when the user closes the modal without paying.
            // If payment was already attempted (handler ran), do nothing -
            // the handler already resolved or rejected the promise.
            ondismiss: () => { if (!paymentAttempted) resolve(); },
          },
        });

        rzp.open();
      });
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
      <button
        onClick={handleClick}
        disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "linear-gradient(135deg,#10B981 0%,#1E3A8A 100%)",
          border: "none", borderRadius: radius.sm, color: "#fff",
          fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
          padding: "10px 22px", cursor: busy ? "not-allowed" : "pointer",
          boxShadow: "0 4px 14px rgba(16,185,129,.28)",
          opacity: busy ? 0.7 : 1, transition: "opacity .15s",
          whiteSpace: "nowrap",
          ...buttonStyle,
        }}
      >
        {busy && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: "rzp-spin 1s linear infinite" }}
            aria-hidden="true">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        )}
        {busy ? "Processing…" : label}
      </button>

      {(priceLabel || discountLabel) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 2 }}>
          {priceLabel && (
            <span style={{ fontSize: 12, color: "var(--text-muted, #94A3B8)", fontFamily: fonts.sans }}>
              {priceLabel}
            </span>
          )}
          {discountLabel && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#22C55E",
              background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.25)",
              borderRadius: 999, padding: "2px 8px",
            }}>
              {discountLabel}
            </span>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "#EF4444", fontFamily: fonts.sans, lineHeight: 1.4, maxWidth: 240 }}>
          {error}
        </div>
      )}

      <style>{`@keyframes rzp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

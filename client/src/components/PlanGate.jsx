import { Link } from "react-router-dom";
import { getUser } from "../auth";

export default function PlanGate({ feature, description, children }) {
  const user = getUser();
  const hasAccess = user.plan !== "free" || user.isAdmin;
  if (hasAccess) return children;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center",
      padding: "64px 32px", gap: 16, minHeight: 360,
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(245,158,11,0.10)",
        border: "1px solid rgba(245,158,11,0.25)", fontSize: 30,
      }}>
        🔒
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
          {feature}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
          color: "#F59E0B", background: "rgba(245,158,11,.12)",
          border: "1px solid rgba(245,158,11,.3)", borderRadius: 999, padding: "3px 9px",
        }}>
          Premium
        </span>
      </div>

      {description && (
        <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.65 }}>
          {description}
        </div>
      )}

      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
        You're on the <strong style={{ color: "var(--text)" }}>Free plan</strong>.
        Contact your admin to upgrade your account.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/pricing" style={{
          padding: "11px 26px", borderRadius: 999, color: "#fff", fontSize: 14, fontWeight: 600,
          background: "linear-gradient(135deg,#F59E0B,#D97706)",
          boxShadow: "0 4px 14px rgba(245,158,11,.30)", textDecoration: "none",
        }}>
          View Plans
        </Link>
      </div>
    </div>
  );
}

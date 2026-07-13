export default function EmptyState({ icon, title, description, actions, minHeight = 320 }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center",
      padding: "64px 32px", gap: 16, minHeight,
    }}>
      {icon && (
        <div style={{
          width: 68, height: 68, borderRadius: 20, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(124,108,255,0.10)",
          border: "1px solid rgba(124,108,255,0.22)", fontSize: 30,
        }}>
          {icon}
        </div>
      )}
      <div style={{
        fontFamily: "'Space Grotesk','Inter',sans-serif",
        fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0,
      }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize: 14, color: "var(--text-secondary)",
          maxWidth: 400, lineHeight: 1.65, margin: 0,
        }}>
          {description}
        </div>
      )}
      {actions && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function PrimaryBtn({ to, onClick, children }) {
  const style = {
    display: "inline-block", padding: "11px 26px", borderRadius: 999,
    color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
    background: "linear-gradient(135deg,#7C6CFF,#4F46E5)",
    boxShadow: "0 4px 18px rgba(124,108,255,0.30)", border: "none", cursor: "pointer",
    fontFamily: "inherit",
  };
  if (to) {
    const { Link } = require("react-router-dom");
    return <Link to={to} style={style}>{children}</Link>;
  }
  return <button onClick={onClick} style={style}>{children}</button>;
}

export function GhostBtn({ to, onClick, children }) {
  const style = {
    display: "inline-block", padding: "11px 26px", borderRadius: 999,
    color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none",
    background: "transparent", border: "1px solid var(--border)", cursor: "pointer",
    fontFamily: "inherit",
  };
  if (to) {
    const { Link } = require("react-router-dom");
    return <Link to={to} style={style}>{children}</Link>;
  }
  return <button onClick={onClick} style={style}>{children}</button>;
}

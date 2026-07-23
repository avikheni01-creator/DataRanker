import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getUser } from "../auth";
import { colors, fonts, radius } from "../theme";

const ACTION_META = {
  payment_monthly: { label: "Payment · Monthly", color: "#22C55E" },
  payment_yearly:  { label: "Payment · Yearly",  color: "#A78BFA" },
  plan_change:     { label: "Plan changed",       color: "#3B82F6" },
  admin_toggle:    { label: "Admin toggled",      color: "#F59E0B" },
  free_override:   { label: "Free override",      color: "#06B6D4" },
  trial_date_edit: { label: "Trial date edited",  color: "#F97316" },
  paid_until_edit: { label: "Paid until edited",  color: "#10B981" },
  user_delete:     { label: "User deleted",       color: "#EF4444" },
};

function Badge({ action }) {
  const meta = ACTION_META[action] || { label: action, color: "#94A3B8" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
      color: meta.color, background: `${meta.color}18`,
      border: `1px solid ${meta.color}44`,
      borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

export default function AdminLogsPage() {
  const user = getUser();
  if (!user?.isAdmin) return <Navigate to="/app" replace />;
  return <LogsTable />;
}

function LogsTable() {
  const [logs, setLogs]         = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, setError]       = useState("");

  useEffect(() => {
    apiFetch("/admin/logs?limit=200")
      .then(({ logs: l, paymentCount, adminLogCount }) => {
        setLogs(l);
        setStats({ paymentCount, adminLogCount });
      })
      .catch((err) => setError(err.message || "Failed to load logs"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => {
    if (typeFilter === "payment" && l.type !== "payment") return false;
    if (typeFilter === "admin"   && l.type !== "admin_action") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.targetEmail.toLowerCase().includes(q) ||
      l.targetName.toLowerCase().includes(q)  ||
      (l.actorEmail || "").toLowerCase().includes(q) ||
      (l.detail || "").toLowerCase().includes(q)     ||
      (l.razorpayPaymentId || "").toLowerCase().includes(q)
    );
  });

  const totalRevenue = logs
    .filter((l) => l.type === "payment")
    .reduce((s, l) => s + (l.amount || 0), 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="al-page">
        <div className="al-header">
          <div className="al-eyebrow">Admin</div>
          <h1 className="al-title">Activity Logs</h1>
          <p className="al-sub">Payment transactions and admin actions, newest first.</p>
        </div>

        {/* Stats */}
        <div className="al-stats">
          {[
            { label: "Payments",      value: stats.paymentCount  ?? 0 },
            { label: "Admin actions", value: stats.adminLogCount ?? 0 },
            { label: "Total events",  value: logs.length },
            { label: "Revenue",       value: `₹${(totalRevenue / 100).toLocaleString("en-IN")}` },
          ].map(({ label, value }) => (
            <div key={label} className="al-stat">
              <div className="al-stat-value">{value}</div>
              <div className="al-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="al-toolbar">
          <input
            type="search" className="al-search"
            placeholder="Search by user, admin, detail, payment ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <div className="al-tabs">
            {[["all","All"],["payment","Payments"],["admin","Admin actions"]].map(([val, lbl]) => (
              <button
                key={val}
                className={`al-tab${typeFilter === val ? " active" : ""}`}
                onClick={() => setTypeFilter(val)}
              >{lbl}</button>
            ))}
          </div>
          <span className="al-count">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="al-table-wrap">
          {loading ? (
            <div className="al-empty">Loading…</div>
          ) : error ? (
            <div className="al-empty" style={{ color: "#EF4444" }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div className="al-empty">{search ? "No records match." : "No logs yet."}</div>
          ) : (
            <table className="al-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>User</th>
                  <th>By (admin)</th>
                  <th>Detail</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => <LogRow key={log.id} log={log} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function LogRow({ log }) {
  const date = new Date(log.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const initial = (log.targetName || log.targetEmail || "?").trim().charAt(0).toUpperCase();

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Action badge */}
      <td style={{ padding: "12px 16px" }}>
        <Badge action={log.action} />
      </td>

      {/* Affected user */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#10B981,#1E3A8A)",
            color: "#fff", fontSize: 11, fontWeight: 700,
          }}>{initial}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{log.targetName}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{log.targetEmail}</div>
          </div>
        </div>
      </td>

      {/* Admin who did it */}
      <td style={{ padding: "12px 16px", fontSize: 12, color: colors.textMuted }}>
        {log.actorEmail || <span style={{ color: "var(--border)" }}>—</span>}
      </td>

      {/* Detail */}
      <td style={{ padding: "12px 16px", fontSize: 12, color: colors.textSecondary, maxWidth: 280 }}>
        {log.razorpayPaymentId
          ? <code style={{ fontSize: 11, background: "var(--inset)", padding: "2px 6px", borderRadius: 4 }}>{log.razorpayPaymentId}</code>
          : log.detail || "—"
        }
      </td>

      {/* Date */}
      <td style={{ padding: "12px 16px", fontSize: 12, color: colors.textMuted, whiteSpace: "nowrap" }}>
        {date}
      </td>
    </tr>
  );
}

const CSS = `
  .al-page {
    max-width: 1100px; margin: 0 auto;
    padding: 36px 32px 64px; font-family: ${fonts.sans};
  }
  .al-header { margin-bottom: 24px; }
  .al-eyebrow {
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .2em; text-transform: uppercase;
    color: #10B981; margin-bottom: 8px;
  }
  .al-title {
    font-family: 'Space Grotesk', ${fonts.sans};
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: ${colors.text}; margin: 0 0 6px;
  }
  .al-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; }

  .al-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  .al-stat {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 20px;
  }
  .al-stat-value { font-size: 26px; font-weight: 700; color: ${colors.text}; }
  .al-stat-label { font-size: 12px; color: ${colors.textMuted}; margin-top: 2px; }

  .al-toolbar {
    display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
  }
  .al-search {
    flex: 1; min-width: 200px; padding: 9px 14px;
    background: var(--inset); border: 1px solid var(--border);
    border-radius: ${radius.sm}; color: ${colors.text};
    font-family: ${fonts.sans}; font-size: 13px; outline: none;
  }
  .al-search:focus { border-color: #10B981; box-shadow: 0 0 0 2px rgba(16,185,129,.2); }
  .al-search::placeholder { color: ${colors.textMuted}; }

  .al-tabs { display: flex; gap: 4px; }
  .al-tab {
    background: var(--inset); border: 1px solid var(--border);
    border-radius: ${radius.sm}; color: ${colors.textMuted};
    font-family: ${fonts.sans}; font-size: 12px; font-weight: 500;
    padding: 6px 12px; cursor: pointer; transition: all .15s;
  }
  .al-tab:hover { color: ${colors.text}; }
  .al-tab.active {
    background: rgba(16,185,129,.12); border-color: #10B981;
    color: #10B981; font-weight: 700;
  }
  .al-count { font-size: 12px; color: ${colors.textMuted}; white-space: nowrap; }

  .al-table-wrap {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; overflow-x: auto;
  }
  .al-table { width: max-content; min-width: 100%; border-collapse: collapse; }
  .al-table thead tr { background: var(--inset); border-bottom: 1px solid var(--border); }
  .al-table th {
    padding: 10px 16px; text-align: left;
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .12em; text-transform: uppercase;
    color: ${colors.textMuted}; font-weight: 600; white-space: nowrap;
  }
  .al-table tbody tr:last-child { border-bottom: none; }
  .al-table tbody tr:hover { background: rgba(255,255,255,.02); }
  .al-empty {
    padding: 48px; text-align: center;
    font-size: 14px; color: ${colors.textMuted};
  }

  @media (max-width: 640px) {
    .al-page { padding: 24px 16px 48px; }
    .al-stats { grid-template-columns: repeat(2, 1fr); }
  }
`;

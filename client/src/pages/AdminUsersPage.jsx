import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getUser } from "../auth";
import { colors, fonts, radius } from "../theme";

const PLANS = ["free", "premium", "enterprise"];
const PLAN_COLORS = { free: "#94A3B8", premium: "#F59E0B", enterprise: "#7C6CFF" };

// ── Tiny shared components ────────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "capitalize",
      color, background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: 36, height: 20, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <span style={{
        position: "absolute", inset: 0, borderRadius: 999,
        background: checked ? "#7C6CFF" : "var(--border)", transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", width: 14, height: 14, left: 3, top: 3,
          background: "#fff", borderRadius: "50%", transition: "transform .2s",
          transform: checked ? "translateX(16px)" : "none",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        }} />
      </span>
    </label>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  const color = type === "error" ? "#EF4444" : "#22C55E";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "var(--card)", border: `1px solid ${color}55`,
      borderLeft: `3px solid ${color}`, borderRadius: radius.sm,
      padding: "12px 18px", fontSize: 13, color: colors.text,
      boxShadow: "0 8px 24px rgba(0,0,0,.25)", maxWidth: 340,
    }}>
      {msg}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ user, isSelf, onUpdate, onDelete }) {
  const [busy, setBusy] = useState(false);

  const patch = async (updates) => {
    setBusy(true);
    try {
      const { user: updated } = await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      onUpdate(updated);
    } catch (err) {
      onUpdate(null, err.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${user.name || user.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
      onDelete(user.id);
    } catch (err) {
      onUpdate(null, err.message || "Delete failed");
      setBusy(false);
    }
  };

  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", opacity: busy ? .6 : 1, transition: "opacity .15s" }}>
      {/* Avatar + name/email */}
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#7C6CFF,#4F46E5)", color: "#fff",
            fontSize: 13, fontWeight: 700,
          }}>{initial}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{user.name || "—"}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{user.email}</div>
          </div>
        </div>
      </td>

      {/* Plan */}
      <td style={{ padding: "14px 16px" }}>
        <select
          value={user.plan}
          disabled={isSelf || busy}
          onChange={(e) => patch({ plan: e.target.value })}
          style={{
            background: "var(--inset)", border: "1px solid var(--border)",
            borderRadius: radius.sm, color: PLAN_COLORS[user.plan] || colors.text,
            fontFamily: fonts.sans, fontSize: 12, fontWeight: 700,
            padding: "4px 8px", cursor: isSelf ? "not-allowed" : "pointer",
          }}
        >
          {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </td>

      {/* Admin toggle */}
      <td style={{ padding: "14px 16px", textAlign: "center" }}>
        <Toggle
          checked={user.isAdmin}
          disabled={isSelf || busy}
          onChange={(v) => patch({ isAdmin: v })}
        />
      </td>

      {/* Email verified */}
      <td style={{ padding: "14px 16px", textAlign: "center" }}>
        {user.emailVerified
          ? <Badge label="Verified" color="#22C55E" />
          : <Badge label="Unverified" color="#F59E0B" />}
      </td>

      {/* Joined */}
      <td style={{ padding: "14px 16px", fontSize: 12, color: colors.textMuted, whiteSpace: "nowrap" }}>
        {joined}
      </td>

      {/* Actions */}
      <td style={{ padding: "14px 16px", textAlign: "right" }}>
        {isSelf ? (
          <span style={{ fontSize: 11, color: colors.textMuted }}>You</span>
        ) : (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)",
              borderRadius: radius.sm, color: "#EF4444",
              fontSize: 12, fontWeight: 600, padding: "5px 12px",
              cursor: busy ? "not-allowed" : "pointer", transition: "background .15s",
            }}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const self = getUser();
  if (!self?.isAdmin) return <Navigate to="/app" replace />;

  return <UsersTable selfId={self.id} />;
}

function UsersTable({ selfId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "success" });

  useEffect(() => {
    apiFetch("/admin/users")
      .then(({ users: u }) => setUsers(u))
      .catch((err) => setToast({ msg: err.message || "Failed to load users", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? users.filter((u) => (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
  }, [users, search]);

  const handleUpdate = (updated, errMsg) => {
    if (errMsg) { setToast({ msg: errMsg, type: "error" }); return; }
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setToast({ msg: "User updated.", type: "success" });
  };

  const handleDelete = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setToast({ msg: "User deleted.", type: "success" });
  };

  return (
    <>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast((t) => ({ ...t, msg: "" }))} />

      <div className="au-page">
        <div className="au-header">
          <div className="au-eyebrow">Admin</div>
          <h1 className="au-title">User Management</h1>
          <p className="au-sub">Manage accounts, plans, and admin access. Changes apply immediately.</p>
        </div>

        {/* Stats strip */}
        <div className="au-stats">
          {[
            { label: "Total users", value: users.length },
            { label: "Admins", value: users.filter((u) => u.isAdmin).length },
            { label: "Verified", value: users.filter((u) => u.emailVerified).length },
            { label: "Premium +", value: users.filter((u) => u.plan !== "free").length },
          ].map(({ label, value }) => (
            <div key={label} className="au-stat">
              <div className="au-stat-value">{value}</div>
              <div className="au-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="au-toolbar">
          <input
            type="search" className="au-search" placeholder="Search by name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <span className="au-count">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="au-table-wrap">
          {loading ? (
            <div className="au-empty">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="au-empty">{search ? "No users match your search." : "No users yet."}</div>
          ) : (
            <table className="au-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th style={{ textAlign: "center" }}>Admin</th>
                  <th style={{ textAlign: "center" }}>Email</th>
                  <th>Joined</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={user.id === selfId}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

const CSS = `
  .au-page {
    max-width: 960px; margin: 0 auto;
    padding: 36px 32px 64px;
    font-family: ${fonts.sans};
  }
  .au-header { margin-bottom: 24px; }
  .au-eyebrow {
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .2em; text-transform: uppercase;
    color: ${colors.accentHover}; margin-bottom: 8px;
  }
  .au-title {
    font-family: 'Space Grotesk', ${fonts.sans};
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: ${colors.text}; margin: 0 0 6px;
  }
  .au-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; }

  .au-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  .au-stat {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 20px;
  }
  .au-stat-value { font-size: 28px; font-weight: 700; color: ${colors.text}; }
  .au-stat-label { font-size: 12px; color: ${colors.textMuted}; margin-top: 2px; }

  .au-toolbar {
    display: flex; align-items: center; gap: 12; margin-bottom: 12px;
  }
  .au-search {
    flex: 1; padding: 9px 14px;
    background: var(--inset); border: 1px solid var(--border);
    border-radius: ${radius.sm}; color: ${colors.text};
    font-family: ${fonts.sans}; font-size: 13px;
    outline: none;
  }
  .au-search:focus { border-color: #7C6CFF; box-shadow: 0 0 0 2px rgba(124,108,255,.2); }
  .au-search::placeholder { color: ${colors.textMuted}; }
  .au-count { font-size: 12px; color: ${colors.textMuted}; white-space: nowrap; margin-left: 12px; }

  .au-table-wrap {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
  }
  .au-table { width: 100%; border-collapse: collapse; }
  .au-table thead tr { background: var(--inset); border-bottom: 1px solid var(--border); }
  .au-table th {
    padding: 10px 16px; text-align: left;
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .12em; text-transform: uppercase;
    color: ${colors.textMuted}; font-weight: 600;
  }
  .au-table tbody tr:last-child { border-bottom: none; }
  .au-table tbody tr:hover { background: rgba(255,255,255,.02); }

  .au-empty {
    padding: 48px; text-align: center;
    font-size: 14px; color: ${colors.textMuted};
  }

  @media (max-width: 760px) {
    .au-page { padding: 24px 16px 48px; }
    .au-stats { grid-template-columns: repeat(2, 1fr); }
    .au-table th:nth-child(4), .au-table td:nth-child(4),
    .au-table th:nth-child(5), .au-table td:nth-child(5) { display: none; }
  }
`;

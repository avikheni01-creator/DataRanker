import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getUser } from "../auth";
import { colors, fonts, radius } from "../theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    }}>{msg}</div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: 36, height: 20, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <span style={{
        position: "absolute", inset: 0, borderRadius: 999,
        background: checked ? "#10B981" : "var(--border)", transition: "background .2s",
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

// ── Plan Modal ────────────────────────────────────────────────────────────────

const EMPTY = {
  planId: "", name: "", tagline: "", features: "",
  monthlyPrice: 0, yearlyPrice: 0, yearlyDiscountPct: 0,
  trialDays: 0, isActive: true, highlighted: false, cta: "Get started", order: 0,
};

function PlanModal({ plan, onSave, onClose }) {
  const isEdit = Boolean(plan);
  const [form, setForm] = useState(() =>
    isEdit
      ? { ...plan, features: (plan.features || []).join("\n") }
      : { ...EMPTY }
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.planId.trim() || !form.name.trim()) { setErr("Plan ID and Name are required."); return; }
    setBusy(true); setErr("");
    try {
      const body = {
        ...form,
        planId: form.planId.toLowerCase().trim(),
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        monthlyPrice: Number(form.monthlyPrice) || 0,
        yearlyPrice: Number(form.yearlyPrice) || 0,
        yearlyDiscountPct: Number(form.yearlyDiscountPct) || 0,
        trialDays: Number(form.trialDays) || 0,
        order: Number(form.order) || 0,
      };
      const url = isEdit ? `/admin/plans/${plan.planId}` : "/admin/plans";
      const method = isEdit ? "PUT" : "POST";
      const { plan: saved } = await apiFetch(url, { method, body: JSON.stringify(body) });
      onSave(saved, !isEdit);
    } catch (ex) {
      setErr(ex.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const field = (label, key, type = "text", extra = {}) => (
    <div className="apl-field">
      <label className="apl-label">{label}</label>
      <input
        type={type} value={form[key]} className="apl-input"
        onChange={(e) => set(key, e.target.value)} {...extra}
      />
    </div>
  );

  return (
    <div className="apl-overlay" onClick={onClose}>
      <div className="apl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apl-modal-head">
          <span className="apl-modal-title">{isEdit ? `Edit — ${plan.name}` : "New Plan"}</span>
          <button className="apl-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="apl-modal-body">
          <div className="apl-grid-2">
            <div className="apl-field">
              <label className="apl-label">Plan ID (slug) *</label>
              <input className="apl-input" value={form.planId} disabled={isEdit}
                onChange={(e) => set("planId", e.target.value)}
                placeholder="e.g. premium" />
              {isEdit && <span className="apl-hint">Cannot change ID after creation</span>}
            </div>
            {field("Display Name *", "name", "text", { placeholder: "e.g. Premium" })}
          </div>

          {field("Tagline", "tagline", "text", { placeholder: "One-line description shown on pricing page" })}

          <div className="apl-field">
            <label className="apl-label">Features (one per line)</label>
            <textarea className="apl-input apl-textarea" value={form.features}
              onChange={(e) => set("features", e.target.value)}
              placeholder={"Full ranking pipeline\nCompany comparison dashboard\nAI interpretation engine"} />
          </div>

          <div className="apl-grid-3">
            {field("Monthly Price (₹)", "monthlyPrice", "number", { min: 0 })}
            {field("Yearly Price (₹)", "yearlyPrice", "number", { min: 0 })}
            {field("Yearly Discount %", "yearlyDiscountPct", "number", { min: 0, max: 100 })}
          </div>

          <div className="apl-grid-3">
            {field("Trial Days", "trialDays", "number", { min: 0 })}
            {field("CTA Button Text", "cta", "text")}
            {field("Display Order", "order", "number", { min: 0 })}
          </div>

          <div className="apl-toggles">
            <div className="apl-toggle-row">
              <div>
                <div className="apl-toggle-label">Active</div>
                <div className="apl-toggle-sub">Visible on the Pricing page</div>
              </div>
              <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} />
            </div>
            <div className="apl-toggle-row">
              <div>
                <div className="apl-toggle-label">Highlighted</div>
                <div className="apl-toggle-sub">Show as recommended / featured</div>
              </div>
              <Toggle checked={form.highlighted} onChange={(v) => set("highlighted", v)} />
            </div>
          </div>

          {err && <div className="apl-err">{err}</div>}

          <div className="apl-modal-foot">
            <button type="button" className="apl-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="apl-btn-primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/plans/${plan.planId}`, { method: "DELETE" });
      onDelete(plan.planId);
    } catch (err) {
      alert(err.message || "Delete failed");
      setDeleting(false);
    }
  };

  const fmt = (n) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : "Free";

  return (
    <div className={`apl-card${plan.highlighted ? " apl-card-hl" : ""}`}>
      <div className="apl-card-head">
        <div>
          <span className="apl-plan-id">{plan.planId}</span>
          <span className={`apl-status ${plan.isActive ? "on" : "off"}`}>
            {plan.isActive ? "Active" : "Inactive"}
          </span>
          {plan.highlighted && <span className="apl-hl-badge">★ Featured</span>}
        </div>
        <div className="apl-card-actions">
          <button className="apl-btn-sm" onClick={() => onEdit(plan)}>Edit</button>
          <button className="apl-btn-sm apl-btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="apl-plan-name">{plan.name}</div>
      <div className="apl-plan-tagline">{plan.tagline || "—"}</div>

      <div className="apl-price-row">
        <div className="apl-price-cell">
          <div className="apl-price-val">{fmt(plan.monthlyPrice)}</div>
          <div className="apl-price-label">/ month</div>
        </div>
        <div className="apl-price-cell">
          <div className="apl-price-val">{fmt(plan.yearlyPrice)}</div>
          <div className="apl-price-label">/ year</div>
        </div>
        {plan.yearlyDiscountPct > 0 && (
          <div className="apl-price-cell">
            <div className="apl-price-val apl-discount">{plan.yearlyDiscountPct}% off</div>
            <div className="apl-price-label">yearly saving</div>
          </div>
        )}
        {plan.trialDays > 0 && (
          <div className="apl-price-cell">
            <div className="apl-price-val">{plan.trialDays}d</div>
            <div className="apl-price-label">trial</div>
          </div>
        )}
      </div>

      {plan.features?.length > 0 && (
        <ul className="apl-features">
          {plan.features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const self = getUser();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | plan object
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const notify = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    if (!self?.isAdmin) return;
    apiFetch("/admin/plans")
      .then(({ plans: p }) => setPlans(p || []))
      .catch((err) => notify(err.message || "Failed to load plans", "error"))
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!self?.isAdmin) return <Navigate to="/app" replace />;

  const handleSave = (saved, isNew) => {
    setPlans((prev) =>
      isNew ? [...prev, saved] : prev.map((p) => (p.planId === saved.planId ? saved : p))
    );
    setModal(null);
    notify(isNew ? "Plan created." : "Plan updated.");
  };

  const handleDelete = (planId) => {
    setPlans((prev) => prev.filter((p) => p.planId !== planId));
    notify("Plan deleted.");
  };

  return (
    <>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast((t) => ({ ...t, msg: "" }))} />

      {modal && (
        <PlanModal
          plan={modal === "new" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <div className="apl-page">
        <div className="apl-page-head">
          <div>
            <div className="apl-eyebrow">Admin</div>
            <h1 className="apl-title">Plan Management</h1>
            <p className="apl-sub">Create and manage subscription plans, pricing, trials, and offers.</p>
          </div>
          <button className="apl-btn-primary" onClick={() => setModal("new")}>+ New Plan</button>
        </div>

        <div className="apl-stats">
          {[
            { label: "Total plans", value: plans.length },
            { label: "Active", value: plans.filter((p) => p.isActive).length },
            { label: "With trial", value: plans.filter((p) => p.trialDays > 0).length },
            { label: "Featured", value: plans.filter((p) => p.highlighted).length },
          ].map(({ label, value }) => (
            <div key={label} className="apl-stat">
              <div className="apl-stat-value">{value}</div>
              <div className="apl-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="apl-empty">Loading…</div>
        ) : plans.length === 0 ? (
          <div className="apl-empty">
            <p>No plans yet.</p>
            <button className="apl-btn-primary" onClick={() => setModal("new")}>Create your first plan</button>
          </div>
        ) : (
          <div className="apl-cards">
            {plans.map((p) => (
              <PlanCard key={p.planId} plan={p} onEdit={setModal} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  .apl-page { max-width: 960px; margin: 0 auto; padding: 36px 32px 64px; font-family: ${fonts.sans}; }
  .apl-page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .apl-eyebrow { font-family: ${fonts.mono}; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: ${colors.accentHover}; margin-bottom: 8px; }
  .apl-title { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: ${colors.text}; margin: 0 0 6px; }
  .apl-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; }

  .apl-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .apl-stat { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; }
  .apl-stat-value { font-size: 28px; font-weight: 700; color: ${colors.text}; }
  .apl-stat-label { font-size: 12px; color: ${colors.textMuted}; margin-top: 2px; }

  .apl-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

  .apl-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
  .apl-card-hl { border-color: rgba(124,108,255,.45); box-shadow: 0 0 0 1px rgba(124,108,255,.2); }
  .apl-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .apl-card-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .apl-plan-id { font-family: ${fonts.mono}; font-size: 11px; color: ${colors.textMuted}; margin-right: 8px; }
  .apl-status { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .apl-status.on { background: rgba(34,197,94,.12); color: #22C55E; border: 1px solid rgba(34,197,94,.3); }
  .apl-status.off { background: rgba(148,163,184,.1); color: ${colors.textMuted}; border: 1px solid var(--border); }
  .apl-hl-badge { font-size: 10px; font-weight: 700; color: #A78BFA; margin-left: 6px; }

  .apl-plan-name { font-size: 18px; font-weight: 700; color: ${colors.text}; margin-bottom: 4px; }
  .apl-plan-tagline { font-size: 12px; color: ${colors.textSecondary}; margin-bottom: 14px; min-height: 16px; }

  .apl-price-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; padding: 12px; background: var(--inset); border-radius: 8px; }
  .apl-price-cell { text-align: center; }
  .apl-price-val { font-size: 15px; font-weight: 700; color: ${colors.text}; }
  .apl-price-label { font-size: 10px; color: ${colors.textMuted}; margin-top: 2px; }
  .apl-discount { color: #22C55E; }

  .apl-features { margin: 0; padding: 0 0 0 16px; list-style: disc; }
  .apl-features li { font-size: 12px; color: ${colors.textSecondary}; margin-bottom: 3px; }

  /* Buttons */
  .apl-btn-primary { background: var(--accent); color: #fff; border: none; border-radius: ${radius.sm}; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: ${fonts.sans}; transition: opacity .15s; }
  .apl-btn-primary:hover { opacity: .88; }
  .apl-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .apl-btn-ghost { background: none; border: 1px solid var(--border); color: ${colors.textSecondary}; border-radius: ${radius.sm}; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: ${fonts.sans}; transition: border-color .15s; }
  .apl-btn-ghost:hover { border-color: ${colors.accent}; color: ${colors.text}; }
  .apl-btn-sm { background: var(--inset); border: 1px solid var(--border); color: ${colors.textSecondary}; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: ${fonts.sans}; transition: all .12s; }
  .apl-btn-sm:hover { border-color: ${colors.accent}; color: ${colors.text}; }
  .apl-btn-danger:hover { border-color: #EF4444; color: #EF4444; background: rgba(239,68,68,.08); }

  /* Modal */
  .apl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .apl-modal { background: var(--canvas); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,.4); }
  .apl-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .apl-modal-title { font-size: 15px; font-weight: 700; color: ${colors.text}; }
  .apl-modal-close { background: none; border: none; font-size: 16px; color: ${colors.textMuted}; cursor: pointer; padding: 2px 6px; }
  .apl-modal-close:hover { color: ${colors.text}; }
  .apl-modal-body { overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .apl-modal-foot { display: flex; gap: 10px; justify-content: flex-end; padding-top: 8px; flex-shrink: 0; }

  .apl-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .apl-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .apl-field { display: flex; flex-direction: column; gap: 5px; }
  .apl-label { font-size: 11px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: .06em; }
  .apl-input { background: var(--inset); border: 1px solid var(--border); border-radius: ${radius.sm}; color: ${colors.text}; font-family: ${fonts.sans}; font-size: 13px; padding: 8px 10px; outline: none; transition: border-color .15s; }
  .apl-input:focus { border-color: var(--accent); }
  .apl-input:disabled { opacity: .5; cursor: not-allowed; }
  .apl-textarea { min-height: 90px; resize: vertical; }
  .apl-hint { font-size: 10px; color: ${colors.textMuted}; }

  .apl-toggles { display: flex; flex-direction: column; gap: 10px; background: var(--inset); border-radius: 10px; padding: 14px; }
  .apl-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .apl-toggle-label { font-size: 13px; font-weight: 600; color: ${colors.text}; }
  .apl-toggle-sub { font-size: 11px; color: ${colors.textMuted}; }

  .apl-err { font-size: 12px; color: #EF4444; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25); border-radius: 6px; padding: 8px 12px; }

  .apl-empty { text-align: center; padding: 48px; font-size: 14px; color: ${colors.textMuted}; display: flex; flex-direction: column; align-items: center; gap: 16px; }

  @media (max-width: 600px) {
    .apl-page { padding: 20px 16px 48px; }
    .apl-stats { grid-template-columns: repeat(2, 1fr); }
    .apl-grid-2, .apl-grid-3 { grid-template-columns: 1fr; }
    .apl-cards { grid-template-columns: 1fr; }
  }
`;

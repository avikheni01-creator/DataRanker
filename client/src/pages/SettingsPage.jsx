import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getUser } from "../auth";
import { colors, fonts, radius } from "../theme";
import { useAppConfig, useRefreshAppConfig } from "../AppConfigContext";

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="st-toggle" aria-label="Toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="st-slider" />
    </label>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="st-row">
      <div className="st-row-text">
        <div className="st-row-label">{label}</div>
        {description && <div className="st-row-desc">{description}</div>}
      </div>
      <div className="st-row-control">{children}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="st-card">
      <div className="st-card-head">{title}</div>
      <div className="st-card-body">{children}</div>
    </div>
  );
}

function Banner({ type, children }) {
  const bg = type === "success"
    ? "rgba(34,197,94,0.10)" : type === "error"
    ? "rgba(239,68,68,0.10)" : "rgba(124,108,255,0.10)";
  const border = type === "success" ? "rgba(34,197,94,0.4)" : type === "error" ? "rgba(239,68,68,0.4)" : "rgba(124,108,255,0.4)";
  const color = type === "success" ? "#22C55E" : type === "error" ? "#EF4444" : colors.accentHover;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: radius.sm, padding: "12px 16px", fontSize: 13, color, marginBottom: 20 }}>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const user = getUser();
  const appConfig = useAppConfig();

  // Non-admins get redirected immediately
  if (!user?.isAdmin) return <Navigate to="/app" replace />;

  return <SettingsForm initialValues={appConfig} />;
}

function SettingsForm({ initialValues }) {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error", msg }
  const refreshAppConfig = useRefreshAppConfig();

  // Sync when initialValues load from context (first fetch)
  useEffect(() => { setForm(initialValues); }, [initialValues]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      // Push the saved values back into the context so changes apply immediately.
      refreshAppConfig();
      setStatus({ type: "success", msg: "Settings saved and applied." });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="st-page">
        <div className="st-header">
          <div className="st-eyebrow">Admin</div>
          <h1 className="st-title">App Settings</h1>
          <p className="st-sub">Control features and pipeline behaviour for all users. Changes are applied globally.</p>
        </div>

        {status && <Banner type={status.type}>{status.msg}</Banner>}

        <div className="st-grid">

          {/* Pipeline Mode */}
          <Card title="Pipeline Mode">
            <SettingRow
              label="Allow Custom CSV Upload"
              description="When on, users can upload their own Screener.in export on the Pipeline page. Turn off to force all users through the Screener page."
            >
              <Toggle checked={form.allowCustomUpload} onChange={(v) => set("allowCustomUpload", v)} />
            </SettingRow>
            {!form.allowCustomUpload && (
              <div className="st-info-chip">
                Pipeline page will show a message directing users to the Screener page.
              </div>
            )}
          </Card>

          {/* Feature Flags */}
          <Card title="Features">
            <SettingRow
              label="Screener Page"
              description="Show the Screener page in the nav. When off, users are redirected to the Pipeline page."
            >
              <Toggle checked={form.screenerEnabled} onChange={(v) => set("screenerEnabled", v)} />
            </SettingRow>
            <SettingRow
              label="Comparison Page"
              description="Show the company comparison dashboard in the nav."
            >
              <Toggle checked={form.comparisonEnabled} onChange={(v) => set("comparisonEnabled", v)} />
            </SettingRow>
            <SettingRow
              label="Lock KPI Editor"
              description="When on, regular users can view but not save changes to their KPI library. Admins are unaffected."
            >
              <Toggle checked={form.kpiEditorLocked} onChange={(v) => set("kpiEditorLocked", v)} />
            </SettingRow>
          </Card>

          {/* Guardrails */}
          <Card title="Guardrails">
            <SettingRow
              label="Screener Pipeline Row Limit"
              description="Maximum rows from the Screener page that can be sent to the pipeline in one run. Set to 0 for no limit."
            >
              <input
                type="number"
                className="st-number"
                value={form.screenerMaxRows}
                min={0}
                step={50}
                onChange={(e) => set("screenerMaxRows", Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </SettingRow>
            {form.screenerMaxRows > 0 && (
              <div className="st-info-chip">
                Pipeline runs from the Screener page will be capped at {form.screenerMaxRows} rows.
              </div>
            )}
          </Card>

          {/* Maintenance */}
          <Card title="Maintenance">
            <SettingRow
              label="Banner Message"
              description="Shown at the top of the app for all logged-in users. Leave empty to hide."
            >
              <input
                type="text"
                className="st-text"
                placeholder="e.g. Scheduled maintenance on Sunday 2am–4am IST"
                value={form.maintenanceBanner}
                onChange={(e) => set("maintenanceBanner", e.target.value)}
              />
            </SettingRow>
            {form.maintenanceBanner && (
              <div className="st-banner-preview">
                <span className="st-banner-preview-label">Preview:</span>
                {form.maintenanceBanner}
              </div>
            )}
          </Card>

        </div>

        <div className="st-footer">
          <button className="st-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </>
  );
}

const CSS = `
  .st-page {
    max-width: 780px; margin: 0 auto;
    padding: 36px 32px 64px;
    font-family: ${fonts.sans};
  }

  .st-header { margin-bottom: 28px; }
  .st-eyebrow {
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .2em; text-transform: uppercase;
    color: ${colors.accentHover}; margin-bottom: 8px;
  }
  .st-title {
    font-family: 'Space Grotesk', ${fonts.sans};
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: ${colors.text}; margin: 0 0 6px;
  }
  .st-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; line-height: 1.55; }

  .st-grid { display: flex; flex-direction: column; gap: 16px; }

  .st-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
  }
  .st-card-head {
    font-family: ${fonts.mono}; font-size: 10px;
    letter-spacing: .16em; text-transform: uppercase;
    color: ${colors.textMuted};
    padding: 12px 20px; border-bottom: 1px solid var(--border);
    background: var(--inset);
  }
  .st-card-body { padding: 4px 20px; }

  .st-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px; padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }
  .st-row:last-of-type { border-bottom: none; }
  .st-row-text { flex: 1; min-width: 0; }
  .st-row-label { font-size: 14px; font-weight: 600; color: ${colors.text}; }
  .st-row-desc { font-size: 12px; color: ${colors.textMuted}; margin-top: 3px; line-height: 1.5; }
  .st-row-control { flex-shrink: 0; }

  /* Toggle switch */
  .st-toggle { position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; }
  .st-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .st-slider {
    position: absolute; inset: 0;
    background: var(--border); border-radius: 999px;
    transition: background .2s;
  }
  .st-toggle input:checked + .st-slider { background: #7C6CFF; }
  .st-slider::before {
    content: ""; position: absolute;
    width: 18px; height: 18px; left: 3px; bottom: 3px;
    background: #fff; border-radius: 50%;
    transition: transform .2s;
    box-shadow: 0 1px 3px rgba(0,0,0,.25);
  }
  .st-toggle input:checked + .st-slider::before { transform: translateX(20px); }
  .st-toggle input:disabled + .st-slider { opacity: .5; cursor: not-allowed; }

  /* Number input */
  .st-number {
    width: 90px; padding: 8px 12px;
    background: var(--inset); border: 1px solid var(--border);
    border-radius: ${radius.sm}; color: ${colors.text};
    font-family: ${fonts.mono}; font-size: 13px;
    text-align: right;
  }
  .st-number:focus { outline: none; border-color: #7C6CFF; box-shadow: 0 0 0 2px rgba(124,108,255,.2); }

  /* Text input */
  .st-text {
    width: 340px; max-width: 100%; padding: 8px 12px;
    background: var(--inset); border: 1px solid var(--border);
    border-radius: ${radius.sm}; color: ${colors.text};
    font-family: ${fonts.sans}; font-size: 13px;
  }
  .st-text:focus { outline: none; border-color: #7C6CFF; box-shadow: 0 0 0 2px rgba(124,108,255,.2); }
  .st-text::placeholder { color: ${colors.textMuted}; }

  /* Info chips */
  .st-info-chip {
    margin: 0 0 14px;
    padding: 8px 12px;
    background: rgba(124,108,255,.08); border: 1px solid rgba(124,108,255,.22);
    border-radius: ${radius.sm};
    font-size: 12px; color: ${colors.accentHover}; line-height: 1.45;
  }

  /* Banner preview */
  .st-banner-preview {
    margin: 0 0 14px;
    padding: 10px 14px;
    background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.35);
    border-radius: ${radius.sm};
    font-size: 12px; color: #F59E0B; line-height: 1.5;
  }
  .st-banner-preview-label {
    font-weight: 700; margin-right: 8px; text-transform: uppercase;
    font-size: 10px; letter-spacing: .1em;
  }

  /* Footer */
  .st-footer { margin-top: 28px; display: flex; justify-content: flex-end; }
  .st-save-btn {
    padding: 12px 28px;
    background: linear-gradient(135deg, #7C6CFF 0%, #4F46E5 100%);
    border: none; border-radius: ${radius.sm};
    color: #fff; font-size: 14px; font-weight: 600;
    font-family: ${fonts.sans}; cursor: pointer;
    box-shadow: 0 4px 14px rgba(124,108,255,.32);
    transition: all .18s ease;
  }
  .st-save-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
  .st-save-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }

  @media (max-width: 640px) {
    .st-page { padding: 24px 16px 48px; }
    .st-row { flex-direction: column; align-items: flex-start; gap: 10px; }
    .st-text { width: 100%; }
  }
`;

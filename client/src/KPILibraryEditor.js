import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { apiUrl, getAuthHeaders } from "./api";
import { useAppConfig } from "./AppConfigContext";
import { getUser } from "./auth";

// ── Initial data (Tier 1 from KPI_Library.xlsx) ──────────────────────────────
const INITIAL_TIER1 = [
  { template: "Lending Template", kpi: "ROA", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Lending Template", kpi: "ROE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Lending Template", kpi: "PAT Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Lending Template", kpi: "Debt/Equity", category: "Capital", weight: 15, direction: "Lower" },
  { template: "Insurance Template", kpi: "ROE", category: "Profitability", weight: 30, direction: "Higher" },
  { template: "Insurance Template", kpi: "Revenue Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Insurance Template", kpi: "PAT Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Insurance Template", kpi: "Debt/Equity", category: "Capital", weight: 15, direction: "Lower" },
  { template: "Asset Management Template", kpi: "Revenue Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Asset Management Template", kpi: "EBITDA Margin", category: "Profitability", weight: 20, direction: "Higher" },
  { template: "Asset Management Template", kpi: "ROE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Asset Management Template", kpi: "PAT Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Technology Template", kpi: "Revenue Growth", category: "Growth", weight: 25, direction: "Higher" },
  { template: "Technology Template", kpi: "EBITDA Margin", category: "Profitability", weight: 20, direction: "Higher" },
  { template: "Technology Template", kpi: "ROCE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Technology Template", kpi: "PAT Growth", category: "Growth", weight: 15, direction: "Higher" },
  { template: "Consumer Brand Template", kpi: "Revenue Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Consumer Brand Template", kpi: "EBITDA Margin", category: "Profitability", weight: 20, direction: "Higher" },
  { template: "Consumer Brand Template", kpi: "ROCE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Retail Template", kpi: "Revenue Growth", category: "Growth", weight: 25, direction: "Higher" },
  { template: "Retail Template", kpi: "ROCE", category: "Profitability", weight: 20, direction: "Higher" },
  { template: "Retail Template", kpi: "EBITDA Margin", category: "Profitability", weight: 15, direction: "Higher" },
  { template: "Manufacturing Template", kpi: "Revenue Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Manufacturing Template", kpi: "EBITDA Margin", category: "Profitability", weight: 20, direction: "Higher" },
  { template: "Manufacturing Template", kpi: "ROCE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Commodity Template", kpi: "Revenue Growth", category: "Growth", weight: 15, direction: "Higher" },
  { template: "Commodity Template", kpi: "EBITDA Margin", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Commodity Template", kpi: "ROCE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Commodity Template", kpi: "Debt/Equity", category: "Capital", weight: 20, direction: "Lower" },
  { template: "Utility Template", kpi: "ROE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Utility Template", kpi: "ROCE", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "Utility Template", kpi: "Debt/Equity", category: "Capital", weight: 25, direction: "Lower" },
  { template: "Utility Template", kpi: "Revenue Growth", category: "Growth", weight: 10, direction: "Higher" },
];

// Tier 2 rows (read-only for now — not in column mapping)
const TIER2_ROWS = [
  { template: "Banking", kpi: "ROA", category: "Profitability", weight: 15, direction: "Higher" },
  { template: "Banking", kpi: "ROE", category: "Profitability", weight: 15, direction: "Higher" },
  { template: "Banking", kpi: "NIM", category: "Profitability", weight: 15, direction: "Higher" },
  { template: "Banking", kpi: "Loan Growth", category: "Growth", weight: 10, direction: "Higher" },
  { template: "Banking", kpi: "Deposit Growth", category: "Growth", weight: 10, direction: "Higher" },
  { template: "Banking", kpi: "GNPA", category: "Asset Quality", weight: 15, direction: "Lower" },
  { template: "Banking", kpi: "NNPA", category: "Asset Quality", weight: 10, direction: "Lower" },
  { template: "Banking", kpi: "CAR", category: "Capital", weight: 10, direction: "Higher" },
  { template: "NBFC/HFC", kpi: "AUM Growth", category: "Growth", weight: 15, direction: "Higher" },
  { template: "NBFC/HFC", kpi: "ROA", category: "Profitability", weight: 15, direction: "Higher" },
  { template: "NBFC/HFC", kpi: "ROE", category: "Profitability", weight: 15, direction: "Higher" },
  { template: "Life Insurance", kpi: "APE Growth", category: "Growth", weight: 20, direction: "Higher" },
  { template: "Life Insurance", kpi: "VNB Growth", category: "Growth", weight: 15, direction: "Higher" },
  { template: "Life Insurance", kpi: "VNB Margin", category: "Profitability", weight: 20, direction: "Higher" },
  { template: "IT Services", kpi: "Revenue Growth", category: "Growth", weight: 25, direction: "Higher" },
  { template: "IT Services", kpi: "EBIT Margin", category: "Profitability", weight: 25, direction: "Higher" },
  { template: "IT Services", kpi: "ROCE", category: "Profitability", weight: 20, direction: "Higher" },
];

// ── Download as XLSX (with ColumnMapping sheet) ───────────────────────────────
function downloadAsXlsx(tier1Rows, tier2Rows, columnMapping) {
  const wb = XLSX.utils.book_new();

  // ── Tier1 sheet ────────────────────────────────────────────────────────────
  const tier1Data = [
    [],
    ["Tier 1 - KPI Library for level 2 screening"],
    [],
    ["Template", "KPI", "Category", "Weight %", "Higher/Lower Better"],
    ...tier1Rows.map(({ template, kpi, category, weight, direction }) => [
      template, kpi, category, weight, direction,
    ]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(tier1Data);
  ws1["!cols"] = [
    { wch: 32 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Tier1");

  // ── Tier2 sheet ────────────────────────────────────────────────────────────
  const tier2Data = [
    [],
    ["Tier 2 KPI Library for Deep Research"],
    [],
    ["KPI Template", "KPI", "Category", "Weight %", "Higher/Lower Better"],
    ...tier2Rows.map(({ template, kpi, category, weight, direction }) => [
      template, kpi, category, weight, direction,
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(tier2Data);
  ws2["!cols"] = [
    { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Tier2");

  // ── ColumnMapping sheet (NEW) ──────────────────────────────────────────────
  // Saved so customer can re-upload this file to restore mapping without
  // redoing manual mapping. Do NOT edit this sheet manually.
  const mappingData = [
    [],
    ["Column Mapping — re-upload this file to restore your configuration"],
    [],
    ["KPI Name", "Source Column"],
    ...Object.entries(columnMapping).map(([kpi, col]) => [
      kpi,
      Array.isArray(col) ? col.join(", ") : col,
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(mappingData);
  ws3["!cols"] = [{ wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws3, "ColumnMapping");

  XLSX.writeFile(wb, "KPI_Library.xlsx");
}


// ── Helpers ──────────────────────────────────────────────────────────────────
function groupByTemplate(rows) {
  return rows.reduce((acc, row, idx) => {
    if (!acc[row.template]) acc[row.template] = [];
    acc[row.template].push({ ...row, _idx: idx });
    return acc;
  }, {});
}

function totalWeight(rows) {
  return rows.reduce((s, r) => s + Number(r.weight), 0);
}

const CATEGORY_COLORS = {
  Profitability: "#3b82f6",
  Growth: "#10b981",
  Capital: "#f59e0b",
  Efficiency: "#8b5cf6",
  "Asset Quality": "#ec4899",
  Other: "#6b7280",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function WeightBar({ used, max = 100 }) {
  const pct = Math.min((used / max) * 100, 100);
  const over = used > max;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: over ? "#EF4444" : used === max ? "#22C55E" : "#7C6CFF",
          transition: "width 0.2s",
        }} />
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 600,
        color: over ? "#EF4444" : used === max ? "#22C55E" : "var(--text-secondary)",
        minWidth: 60, textAlign: "right",
      }}>
        {used}/{max}%{over && " ⚠"}
      </span>
    </div>
  );
}

function KPIRow({ row, onWeightChange, onDirectionToggle, onRemove }) {
  const color = CATEGORY_COLORS[row.category] || "var(--text-secondary)";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 110px 100px 36px",
      alignItems: "center", gap: 10, padding: "10px 12px",
      borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{row.kpi}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
          background: color + "20", color, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>{row.category}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number" min={1} max={100} value={row.weight}
          onChange={(e) => onWeightChange(Number(e.target.value))}
          style={{
            width: 54, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)",
            background: "var(--elevated)", color: "var(--text)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, fontWeight: 600, textAlign: "right", outline: "none",
          }}
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>%</span>
      </div>
      <button onClick={onDirectionToggle} style={{
        padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
        background: row.direction === "Higher" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: row.direction === "Higher" ? "var(--positive)" : "var(--negative)",
      }}>
        {row.direction === "Higher" ? "↑ Higher" : "↓ Lower"}
      </button>
      <button onClick={onRemove} title="Remove KPI" style={{
        width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(239,68,68,0.12)",
        background: "transparent", cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#EF4444",
        fontSize: 14, fontWeight: 700,
      }}>×</button>
    </div>
  );
}

function AddKPIRow({ usedKPIs, onAdd, AVAILABLE_KPI_KEYS, COLUMN_MAPPING }) {
  const [selected, setSelected] = useState("");
  const available = AVAILABLE_KPI_KEYS.filter((k) => !usedKPIs.includes(k));

  if (available.length === 0) return (
    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, textAlign: "center" }}>
      All mapped KPIs assigned to this template.
    </p>
  );
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{
        flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px dashed var(--border)",
        fontSize: 13, color: selected ? "var(--text)" : "var(--text-muted)", background: "var(--elevated)", outline: "none",
      }}>
        <option value="">Add a KPI from mapped data…</option>
        {available.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <button disabled={!selected} onClick={() => { if (selected) { onAdd(selected); setSelected(""); } }}
        style={{
          padding: "6px 16px", borderRadius: 8, border: "none",
          background: selected ? "#7C6CFF" : "var(--elevated)",
          color: selected ? "var(--text)" : "var(--text-muted)",
          fontWeight: 600, fontSize: 13, cursor: selected ? "pointer" : "not-allowed",
        }}>+ Add</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KPILibraryEditor() {
  const { kpiEditorLocked } = useAppConfig();
  const currentUser = getUser();
  const canSave = !kpiEditorLocked || currentUser.isAdmin;

  const [activeTab, setActiveTab]       = useState("tier1");
  const [tier1Rows, setTier1Rows]       = useState(INITIAL_TIER1);
  const [toast, setToast]               = useState(null);
  const [COLUMN_MAPPING, setCOLUMN_MAPPING] = useState({});
  const [activeTemplate, setActiveTemplate] = useState("");

  useEffect(() => {
    fetch(apiUrl('/column-mapping'), { credentials: "include", headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setCOLUMN_MAPPING(data);
      })
      .catch(() => {
        setToast({ msg: "Backend not reachable — mapped columns unavailable", type: "error" });
        setTimeout(() => setToast(null), 4000);
      });
  }, []);

  // Load this user's saved KPI library (server seeds defaults on first call).
  useEffect(() => {
    fetch(apiUrl('/kpi-library'), { credentials: "include", headers: getAuthHeaders() })
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(data => {
        if (data && Array.isArray(data.rows) && data.rows.length) {
          setTier1Rows(data.rows);
        }
      })
      .catch(() => {
        setToast({ msg: "Could not load your KPI library — showing defaults", type: "error" });
        setTimeout(() => setToast(null), 4000);
      });
  }, []);

  const IDENTIFIER_COLUMNS = ["Symbol", "Description", "Sector", "Industry"];
  const AVAILABLE_KPI_KEYS = Object.keys(COLUMN_MAPPING).filter(
    key => !IDENTIFIER_COLUMNS.includes(key)
  );

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // ── Restore ColumnMapping sheet if present (NEW) ──────────────────────
      const mappingSheet = workbook.Sheets["ColumnMapping"];
      if (mappingSheet) {
        const mappingJson = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 });
        const restoredMapping = {};
        mappingJson
          .slice(3) // skip: blank + title + blank + headers
          .filter(r => r.length >= 2)
          .forEach(([kpi, col]) => {
            restoredMapping[kpi] = col;
          });

        if (Object.keys(restoredMapping).length > 0) {
          // Warn if the restored mapping differs from the live server mapping
          const serverKeys = Object.keys(COLUMN_MAPPING).sort().join(",");
          const fileKeys = Object.keys(restoredMapping).sort().join(",");
          if (serverKeys && serverKeys !== fileKeys) {
            showToast("⚠ Uploaded mapping differs from server — using file version", "error");
          } else {
            showToast("Column mapping restored from file ✓");
          }
          setCOLUMN_MAPPING(restoredMapping);
        }
      }

      // ── Read Tier 1 sheet ─────────────────────────────────────────────────
      const sheet = workbook.Sheets["Tier1"];
      if (!sheet) {
        showToast("Could not find 'Tier1' sheet in uploaded file", "error");
        return;
      }
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // find actual data rows (skip title/header rows)
      const rows = json
        .slice(3) // skip: blank + title + blank + headers
        .filter(r => r.length >= 5)
        .map((r) => ({
          template: r[0],
          kpi: r[1],
          category: r[2],
          weight: Number(r[3]),
          direction: r[4],
        }));

      setTier1Rows(rows);
      showToast("KPI Library loaded successfully");
    };

    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-uploaded if needed
    e.target.value = "";
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const updateRow = useCallback((idx, field, value) => {
    setTier1Rows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const removeRow = useCallback((idx) => {
    setTier1Rows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addKPI = useCallback((templateName, kpi) => {
    const guessCategory = (k) => {
      if (["ROA", "ROE", "ROCE", "EBITDA Margin"].includes(k)) return "Profitability";
      if (["PAT Growth", "Revenue Growth"].includes(k)) return "Growth";
      if (["Debt/Equity"].includes(k)) return "Capital";
      return "Other";
    };
    setTier1Rows((prev) => [
      ...prev,
      { template: templateName, kpi, category: guessCategory(kpi), weight: 10, direction: "Higher" },
    ]);
  }, []);

  const templates    = groupByTemplate(tier1Rows);
  const templateNames = Object.keys(templates);

  // Resolve: if activeTemplate is not in the list (e.g. first load), fall back to first.
  const resolvedTemplate  = templateNames.includes(activeTemplate) ? activeTemplate : (templateNames[0] || "");
  const activeTemplateRows = templates[resolvedTemplate] || [];
  const activeTotalWeight  = totalWeight(activeTemplateRows);
  const allValid = templateNames.every((n) => totalWeight(templates[n]) === 100);

  const handleDownloadXlsx = () => {
    downloadAsXlsx(tier1Rows, TIER2_ROWS, COLUMN_MAPPING);
    showToast("KPI_Library.xlsx downloaded");
  };

  const handleSave = async () => {
    if (!allValid) { showToast("Fix weight totals (must be 100%) before saving", "error"); return; }
    try {
      const res = await fetch(apiUrl('/kpi-library'), {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rows: tier1Rows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Save failed (${res.status})`);
      }
      showToast("KPI library saved");
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    }
  };

  const pgBtn = {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
    color: "var(--text-secondary)", padding: "7px 12px", cursor: "pointer",
    fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .kpi-tmpl-btn { transition: background .12s, color .12s; }
        .kpi-tmpl-btn:hover { background: var(--elevated) !important; }
        button:disabled { opacity: .38 !important; cursor: default !important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Top bar (full width) ── */}
        <div style={{
          padding: "0 24px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 12,
          background: "var(--card)", flexShrink: 0, height: 56,
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>KPI Library Editor</span>
          </div>

          {!allValid
            ? <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "var(--negative)", border: "1px solid rgba(239,68,68,0.12)", whiteSpace: "nowrap" }}>Weight errors</span>
            : <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "var(--positive)", border: "1px solid rgba(34,197,94,0.12)", whiteSpace: "nowrap" }}>All valid</span>
          }

          <button onClick={handleDownloadXlsx} style={pgBtn}>⬇ Download</button>
          <label style={{ ...pgBtn, cursor: "pointer" }}>
            📂 Upload
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
          <button onClick={handleSave} disabled={!allValid || !canSave} title={!canSave ? "KPI editor is locked by the admin" : undefined} style={{
            ...pgBtn,
            background: (allValid && canSave) ? "#7C6CFF" : "var(--elevated)",
            color: (allValid && canSave) ? "#fff" : "var(--text-muted)",
            border: "none", fontWeight: 700,
          }}>{canSave ? "Save" : "🔒 Locked"}</button>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Static template sidebar ── */}
          <div style={{
            width: 220, flexShrink: 0,
            background: "var(--card)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column", overflowY: "auto",
          }}>
            <div style={{ padding: "16px 16px 8px" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--text-muted)" }}>TEMPLATES</div>
            </div>

            {templateNames.map((name) => {
              const rows  = templates[name];
              const total = totalWeight(rows);
              const over  = total > 100;
              const exact = total === 100;
              const isActive = name === resolvedTemplate;
              return (
                <button key={name} className="kpi-tmpl-btn" onClick={() => setActiveTemplate(name)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "10px 16px",
                  background: isActive ? "var(--elevated)" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${isActive ? "#7C6CFF" : "transparent"}`,
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? "var(--accent-hover)" : "var(--text-secondary)", marginBottom: 2 }}>
                    {name}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: over ? "var(--negative)" : exact ? "var(--positive)" : "var(--text-muted)" }}>
                    {rows.length} KPI{rows.length !== 1 ? "s" : ""} · {total}%{over ? " ⚠" : exact ? " ✓" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Main content ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Tier tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--card)", padding: "0 24px", flexShrink: 0 }}>
              {[
                { id: "tier1", label: "Tier 1 — Screening" },
                { id: "tier2", label: "Tier 2 — Deep Research" },
              ].map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "12px 18px", border: "none", cursor: "pointer", background: "transparent",
                  borderBottom: activeTab === t.id ? "2px solid #7C6CFF" : "2px solid transparent",
                  fontWeight: activeTab === t.id ? 700 : 500, fontSize: 14,
                  color: activeTab === t.id ? "var(--accent-hover)" : "var(--text-secondary)",
                }}>{t.label}</button>
              ))}
            </div>

            {/* Mapped columns strip — single scrollable line */}
            {activeTab === "tier1" && AVAILABLE_KPI_KEYS.length > 0 && (
              <div style={{
                background: "rgba(124,108,255,0.06)", borderBottom: "1px solid var(--border)",
                padding: "6px 24px", display: "flex", alignItems: "center", gap: 8,
                flexShrink: 0, overflowX: "auto",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-hover)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                  Mapped
                </span>
                {AVAILABLE_KPI_KEYS.map((k) => (
                  <span key={k} className="mono" style={{ fontSize: 10, color: "var(--text-secondary)", background: "rgba(124,108,255,0.10)", borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {k}
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
              {activeTab === "tier1" ? (
                <div>
                  {/* Weight summary bar */}
                  {resolvedTemplate && (
                    <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{resolvedTemplate}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {activeTemplateRows.length} KPI{activeTemplateRows.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <WeightBar used={activeTotalWeight} />
                    </div>
                  )}

                  {activeTotalWeight > 100 && (
                    <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)", fontSize: 13, color: "var(--negative)", fontWeight: 500 }}>
                      ⚠ Total weight is {activeTotalWeight}% — reduce by {activeTotalWeight - 100}% before saving.
                    </div>
                  )}
                  {activeTotalWeight > 0 && activeTotalWeight < 100 && (
                    <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", fontSize: 13, color: "#d97706", fontWeight: 500 }}>
                      Total is {activeTotalWeight}% — needs {100 - activeTotalWeight}% more.
                    </div>
                  )}

                  {/* Column headers */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 110px 100px 36px",
                    gap: 10, padding: "0 12px 6px",
                  }}>
                    {["KPI / Category", "Weight", "Direction", ""].map((h, i) => (
                      <span key={i} className="mono" style={{ fontSize: 9, letterSpacing: ".1em", color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
                    ))}
                  </div>

                  {activeTemplateRows.map((row) => (
                    <KPIRow
                      key={row.kpi} row={row}
                      onWeightChange={(val) => updateRow(row._idx, "weight", val)}
                      onDirectionToggle={() => updateRow(row._idx, "direction", row.direction === "Higher" ? "Lower" : "Higher")}
                      onRemove={() => removeRow(row._idx)}
                    />
                  ))}

                  <div style={{ marginTop: 12 }}>
                    <AddKPIRow
                      usedKPIs={activeTemplateRows.map((r) => r.kpi)}
                      onAdd={(kpi) => addKPI(resolvedTemplate, kpi)}
                      AVAILABLE_KPI_KEYS={AVAILABLE_KPI_KEYS}
                      COLUMN_MAPPING={COLUMN_MAPPING}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 600 }}>
                    Tier 2 templates use sector-specific KPIs (NIM, GNPA, AUM Growth, etc.) that require additional column mapping in the backend config before they can be edited here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "12px 18px", borderRadius: 10,
          background: toast.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
          border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)"}`,
          color: toast.type === "error" ? "var(--negative)" : "var(--positive)",
          fontWeight: 600, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 300,
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
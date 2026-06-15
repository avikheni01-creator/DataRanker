import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { apiUrl } from "./api";

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
    ...Object.entries(columnMapping).map(([kpi, col]) => [kpi, col]),
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
      display: "grid", gridTemplateColumns: "1fr 100px 90px 32px",
      alignItems: "center", gap: 10, padding: "8px 12px",
      borderRadius: 8, background: "var(--inset)", border: "1px solid var(--elevated)", marginBottom: 6,
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

function TemplateCard({ templateName, rows, onUpdate, onAddKPI, onRemoveKPI, AVAILABLE_KPI_KEYS, COLUMN_MAPPING }) {
  const [expanded, setExpanded] = useState(true);
  const total = totalWeight(rows);
  const over = total > 100;
  const exact = total === 100;
  const usedKPIs = rows.map((r) => r.kpi);

  return (
    <div style={{
      border: `1px solid ${over ? "rgba(239,68,68,0.12)" : exact ? "rgba(34,197,94,0.12)" : "var(--border)"}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 12, background: "var(--card)",
    }}>
      <div onClick={() => setExpanded((p) => !p)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", cursor: "pointer",
        background: over ? "rgba(239,68,68,0.12)" : exact ? "rgba(34,197,94,0.12)" : "var(--card)", userSelect: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{templateName}</span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{rows.length} KPI{rows.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ flex: 1, maxWidth: 260 }}><WeightBar used={total} /></div>
        <span style={{ marginLeft: 12, color: "var(--text-secondary)", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "12px 16px 16px" }}>
          {rows.map((row) => (
            <KPIRow
              key={row.kpi} row={row}
              onWeightChange={(val) => onUpdate(row._idx, "weight", val)}
              onDirectionToggle={() => onUpdate(row._idx, "direction", row.direction === "Higher" ? "Lower" : "Higher")}
              onRemove={() => onRemoveKPI(row._idx)}
            />
          ))}
          <AddKPIRow usedKPIs={usedKPIs} onAdd={(kpi) => onAddKPI(templateName, kpi)} AVAILABLE_KPI_KEYS={AVAILABLE_KPI_KEYS} COLUMN_MAPPING={COLUMN_MAPPING} />
          {over && (
            <div style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 8,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.12)",
              fontSize: 12, color: "var(--negative)", fontWeight: 500,
            }}>
              ⚠ Total weight is {total}% — reduce by {total - 100}% before saving.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tier2 read-only card ──────────────────────────────────────────────────────
function Tier2Card({ templateName, rows }) {
  const [expanded, setExpanded] = useState(false);
  const total = totalWeight(rows);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 12, background: "var(--card)" }}>
      <div onClick={() => setExpanded((p) => !p)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", cursor: "pointer", background: "var(--card)", userSelect: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{templateName}</span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{rows.length} KPIs</span>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(245,158,11,0.12)", color: "#F59E0B", fontWeight: 600 }}>
            Read-only
          </span>
        </div>
        <div style={{ flex: 1, maxWidth: 260 }}><WeightBar used={total} /></div>
        <span style={{ marginLeft: 12, color: "var(--text-secondary)", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "12px 16px 16px" }}>
          {rows.map((row) => {
            const color = CATEGORY_COLORS[row.category] || "var(--text-secondary)";
            return (
              <div key={row.kpi} style={{
                display: "grid", gridTemplateColumns: "1fr 100px 90px",
                alignItems: "center", gap: 10, padding: "8px 12px",
                borderRadius: 8, background: "var(--inset)", border: "1px solid var(--elevated)", marginBottom: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-secondary)" }}>{row.kpi}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: color + "20", color, textTransform: "uppercase" }}>{row.category}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-secondary)", textAlign: "right" }}>{row.weight}%</span>
                <span style={{
                  padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, textAlign: "center",
                  background: row.direction === "Higher" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: row.direction === "Higher" ? "var(--positive)" : "var(--negative)",
                }}>
                  {row.direction === "Higher" ? "↑ Higher" : "↓ Lower"}
                </span>
              </div>
            );
          })}
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "8px 0 0", textAlign: "center" }}>
            Tier 2 KPIs use sector-specific columns not in the current column mapping. Editing will be enabled once those columns are mapped.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KPILibraryEditor() {
  const [activeTab, setActiveTab] = useState("tier1");
  const [tier1Rows, setTier1Rows] = useState(INITIAL_TIER1);
  const [toast, setToast] = useState(null);
  const [COLUMN_MAPPING, setCOLUMN_MAPPING] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/column-mapping'), { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setCOLUMN_MAPPING(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setToast({ msg: "Backend not reachable — mapped columns unavailable", type: "error" });
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

  const templates = groupByTemplate(tier1Rows);
  // const tier2Groups = groupByTemplate(TIER2_ROWS);
  const allValid = Object.values(templates).every((rows) => totalWeight(rows) === 100);

  const handleDownloadXlsx = () => {
    // Pass COLUMN_MAPPING so it's saved into the ColumnMapping sheet
    downloadAsXlsx(tier1Rows, TIER2_ROWS, COLUMN_MAPPING);
    showToast("KPI_Library.xlsx downloaded");
  };

  const handleSave = () => {
    if (!allValid) { showToast("Fix weight totals (must be 100%) before saving", "error"); return; }
    // Replace with: await fetch('/api/kpi-library', { method: 'POST', body: JSON.stringify(tier1Rows) })
    showToast("Saved — ready to run pipeline");
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* Top bar */}
      <div style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #7C6CFF, #4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>📊</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>KPI Library Editor</span>
          {!allValid
            ? <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "var(--negative)", border: "1px solid rgba(239,68,68,0.12)" }}>Weight errors</span>
            : <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "var(--positive)", border: "1px solid rgba(34,197,94,0.12)" }}>All valid</span>
          }
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleDownloadXlsx} style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--elevated)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ⬇ Download .xlsx
          </button>
          <label style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--elevated)",
            color: "var(--text-secondary)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            📂 Upload .xlsx
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={handleSave} disabled={!allValid} style={{
            padding: "7px 16px", borderRadius: 8, border: "none",
            background: allValid ? "#7C6CFF" : "var(--elevated)",
            color: allValid ? "var(--text)" : "var(--text-muted)",
            fontWeight: 700, fontSize: 13, cursor: allValid ? "pointer" : "not-allowed",
          }}>
            Save & Run Pipeline
          </button>
        </div>
      </div>

      {/* Mapping legend */}
      <div style={{
        background: "rgba(124,108,255,0.12)", borderBottom: "1px solid var(--border)",
        padding: "9px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-hover)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
          Mapped columns
        </span>
        {AVAILABLE_KPI_KEYS.map((k) => (
          <span key={k} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-secondary)", background: "rgba(124,108,255,0.12)", borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>
            <strong>{k}</strong> → {COLUMN_MAPPING[k]}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--card)", padding: "0 24px" }}>
        {[
          { id: "tier1", label: "Tier 1 — Screening" },
          { id: "tier2", label: "Tier 2 — Deep Research" },
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "12px 18px",
            borderBottom: activeTab === t.id ? "2px solid #7C6CFF" : "2px solid transparent",
            background: "transparent", border: "none",
            fontWeight: activeTab === t.id ? 700 : 500, fontSize: 14,
            color: activeTab === t.id ? "var(--accent-hover)" : "var(--text-secondary)", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
        {activeTab === "tier1" ? (
          <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Edit weights, toggle Higher/Lower Better, add or remove KPIs. Each template must total exactly 100%.
              </p>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {Object.keys(templates).length} templates · {tier1Rows.length} KPIs
              </span>
            </div>
            {Object.entries(templates).map(([name, rows]) => (
              <TemplateCard
                key={name} templateName={name} rows={rows}
                onUpdate={updateRow} onAddKPI={addKPI} onRemoveKPI={removeRow} AVAILABLE_KPI_KEYS={AVAILABLE_KPI_KEYS}
              />
            ))}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Tier 2 templates use sector-specific KPIs (NIM, GNPA, AUM Growth, etc.) that require additional column mapping in the backend config before they can be edited here.
              </p>
            </div>
            {/* {Object.entries(tier2Groups).map(([name, rows]) => (
              <Tier2Card key={name} templateName={name} rows={rows} AVAILABLE_KPI_KEYS={AVAILABLE_KPI_KEYS} />
            ))} */}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "12px 18px", borderRadius: 10,
          background: toast.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
          border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)"}`,
          color: toast.type === "error" ? "var(--negative)" : "var(--positive)",
          fontWeight: 600, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 100,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
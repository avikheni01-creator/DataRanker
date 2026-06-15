import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────

// Columns that are never shown as toggleable KPI metric columns
const SYSTEM_COLS = new Set([
  "Symbol", "Description", "Name", "Sector", "Industry",
  "mapped_industry", "SCS_Sector", "KPI_Template", "Exchange",
  "Company_Rank", "Total_Final_Score",
]);

const SYSTEM_SUFFIX = ["_Rank", "_Percentile_Slab", "_Metric_Score"];

// Fixed table columns always shown (not toggleable)
const FIXED_COLS = ["Rank", "Company", "Sector", "Score"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSystemCol(key) {
  if (SYSTEM_COLS.has(key)) return true;
  return SYSTEM_SUFFIX.some(s => key.endsWith(s));
}

/** Extract raw KPI keys from a row array */
function extractKpiKeys(rows) {
  if (!rows?.length) return [];
  const allKeys = Object.keys(rows[0]);
  return allKeys.filter(k => !isSystemCol(k));
}

function medal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function rankColor(rank, total) {
  const pct = rank / total;
  if (pct <= 0.1)  return "#22C55E";
  if (pct <= 0.25) return "#4ADE80";
  if (pct <= 0.5)  return "#F59E0B";
  if (pct <= 0.75) return "#FB923C";
  return "#EF4444";
}

function scoreBarPct(score, max) {
  return max > 0 ? Math.min((score / max) * 100, 100) : 0;
}

function fmt(val, key) {
  const v = parseFloat(val);
  if (isNaN(v)) return "—";
  const pctKeys = ["Growth", "Margin", "ROE", "ROCE", "Return", "Yield"];
  const addPct = pctKeys.some(p => key.includes(p));
  return v.toFixed(2) + (addPct ? "%" : "");
}

// ── Column Picker ─────────────────────────────────────────────────────────────

function ColumnPicker({ allKpiKeys, visibleKpiKeys, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (key) => {
    if (visibleKpiKeys.includes(key)) {
      onChange(visibleKpiKeys.filter(k => k !== key));
    } else {
      // preserve original order
      onChange(allKpiKeys.filter(k => visibleKpiKeys.includes(k) || k === key));
    }
  };

  const selectAll   = () => onChange([...allKpiKeys]);
  const clearAll    = () => onChange([]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: open ? "var(--elevated)" : "var(--card)",
          border: `1px solid ${open ? "var(--accent-hover)" : "var(--border)"}`,
          borderRadius: 8, color: "var(--text-secondary)", padding: "8px 12px",
          cursor: "pointer", fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
          transition: "all .15s",
        }}
      >
        <span style={{ fontSize: 13 }}>⊞</span>
        Columns
        <span style={{
          background: "rgba(124,108,255,0.12)", color: "var(--accent-hover)", fontSize: 9,
          borderRadius: 4, padding: "1px 5px", fontWeight: 700,
        }}>
          {visibleKpiKeys.length}/{allKpiKeys.length}
        </span>
        <span style={{ opacity: .5, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "12px 0", minWidth: 220, maxHeight: 360, overflowY: "auto",
          boxShadow: "0 16px 48px rgba(0,0,0,.6)",
        }}>
          {/* Quick actions */}
          <div style={{
            display: "flex", gap: 6, padding: "0 12px 10px",
            borderBottom: "1px solid var(--elevated)",
          }}>
            <button onClick={selectAll} style={quickBtnStyle("#22C55E")}>All</button>
            <button onClick={clearAll}  style={quickBtnStyle("#EF4444")}>None</button>
          </div>

          {/* Checkboxes */}
          {allKpiKeys.map(key => {
            const checked = visibleKpiKeys.includes(key);
            return (
              <label key={key} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 14px", cursor: "pointer",
                transition: "background .1s",
                background: checked ? "var(--elevated)" : "transparent",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--elevated)"}
                onMouseLeave={e => e.currentTarget.style.background = checked ? "var(--elevated)" : "transparent"}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${checked ? "var(--accent-hover)" : "var(--border)"}`,
                  background: checked ? "#7C6CFF" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}>
                  {checked && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                </span>
                <input type="checkbox" checked={checked} onChange={() => toggle(key)} style={{ display: "none" }} />
                <span style={{
                  fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                  color: checked ? "var(--accent-hover)" : "var(--text-secondary)",
                }}>
                  {key}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function quickBtnStyle(color) {
  return {
    flex: 1, padding: "4px 0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
    background: "transparent", border: `1px solid ${color}22`,
    color, borderRadius: 5, cursor: "pointer",
  };
}

// ── Company Drawer ────────────────────────────────────────────────────────────

function CompanyDrawer({ company, allCompanies, onClose }) {
  if (!company) return null;

  const metricScoreKeys = Object.keys(company).filter(k => k.endsWith("_Metric_Score"));
  const radarData = metricScoreKeys.map(k => ({
    kpi: k.replace("_Metric_Score", ""),
    score: parseFloat(company[k]) || 0,
  }));

  const kpiKeys = extractKpiKeys([company]);

  const peers = allCompanies
    .filter(c => c.KPI_Template === company.KPI_Template && c.Symbol !== company.Symbol)
    .sort((a, b) => a.Company_Rank - b.Company_Rank)
    .slice(0, 5);

  const maxScore = Math.max(...allCompanies.map(c => parseFloat(c.Total_Final_Score) || 0));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
      pointerEvents: "none",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.55)", pointerEvents: "all",
      }} />
      <div style={{
        position: "relative", pointerEvents: "all",
        width: "min(480px, 100vw)", height: "100vh",
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        overflowY: "auto", padding: "32px 28px",
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--accent-hover)", letterSpacing: ".12em", marginBottom: 6 }}>
              {company.KPI_Template}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-.02em" }}>
              {company.Symbol}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{company.Description}</div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--elevated)", border: "none", color: "var(--text-secondary)",
            fontSize: 18, width: 36, height: 36, borderRadius: 8,
            cursor: "pointer", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Rank + Score */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Company Rank", value: `#${Math.round(company.Company_Rank)}`, color: rankColor(company.Company_Rank, allCompanies.length) },
            { label: "Total Score",  value: parseFloat(company.Total_Final_Score).toFixed(1), color: "var(--accent-hover)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "var(--elevated)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Score bar */}
        <div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 8 }}>SCORE VS PEERS</div>
          <div style={{ background: "var(--elevated)", borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 6, transition: "width .6s ease",
              width: `${scoreBarPct(company.Total_Final_Score, maxScore)}%`,
              background: "linear-gradient(90deg,#7C6CFF,#22C55E)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>0</span>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>{maxScore.toFixed(0)}</span>
          </div>
        </div>

        {/* KPI Breakdown bar chart */}
        {radarData.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 12 }}>KPI BREAKDOWN</div>
            <ResponsiveContainer width="100%" height={Math.max(160, radarData.length * 32)}>
              <BarChart data={radarData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide domain={[0, 10]} />
                <YAxis type="category" dataKey="kpi"
                  tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }} width={130} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}
                  labelStyle={{ color: "var(--text)" }}
                  itemStyle={{ color: "var(--accent-hover)" }}
                />
                <Bar dataKey="score" radius={4}>
                  {radarData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${235 + i * 14},75%,65%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* All raw KPI financials — dynamic */}
        {kpiKeys.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 10 }}>FINANCIALS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {kpiKeys
                .filter(k => company[k] != null && company[k] !== "")
                .map(k => (
                  <div key={k} style={{ background: "var(--elevated)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", marginBottom: 4 }}>{k.toUpperCase()}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>{fmt(company[k], k)}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Peers */}
        {peers.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 10 }}>TOP PEERS IN TEMPLATE</div>
            {peers.map(p => (
              <div key={p.Symbol} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "var(--elevated)", borderRadius: 8,
                marginBottom: 6, border: "1px solid var(--border)",
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>{p.Symbol}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>
                    {p.Description?.slice(0, 22)}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: rankColor(p.Company_Rank, allCompanies.length) }}>
                  #{Math.round(p.Company_Rank)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function StockDashboard({ resultFile }) {
  const [error, setError]                     = useState(null);
  const [sheets, setSheets]                   = useState({});
  const [activeTemplate, setActiveTemplate]   = useState(null);
  const [search, setSearch]                   = useState("");
  const [sortKey, setSortKey]                 = useState("Company_Rank");
  const [sortDir, setSortDir]                 = useState("asc");
  const [selectedCompany, setSelectedCompany] = useState(null);

  // visibleKpiKeys: per-template map { templateName: [key, ...] }
  const [visibleKpiMap, setVisibleKpiMap] = useState({});

  // ── Parse file ──
  useEffect(() => {
    if (!resultFile) return;
    const run = async () => {
      try {
        const ab = await resultFile.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        const parsed = {};
        wb.SheetNames.forEach(name => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (rows.length) parsed[name] = rows;
        });
        setSheets(parsed);
        setActiveTemplate(Object.keys(parsed)[0]);

        // Initialise visibleKpiMap with ALL kpi keys per template
        const initMap = {};
        Object.entries(parsed).forEach(([name, rows]) => {
          initMap[name] = extractKpiKeys(rows);
        });
        setVisibleKpiMap(initMap);
      } catch (e) {
        setError(e.message);
      }
    };
    run();
  }, [resultFile]);

  // ── Derived ──
  const allInTemplate  = sheets[activeTemplate] || [];
  const allKpiKeys     = extractKpiKeys(allInTemplate);          // all possible KPI cols for this template
  const visibleKpiKeys = visibleKpiMap[activeTemplate] || [];    // currently shown KPI cols
  const maxScore       = allInTemplate.length ? Math.max(...allInTemplate.map(c => parseFloat(c.Total_Final_Score) || 0)) : 0;
  const templates      = Object.keys(sheets);

  const rows = allInTemplate
    .filter(r =>
      !search ||
      r.Symbol?.toLowerCase().includes(search.toLowerCase()) ||
      r.Description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = parseFloat(a[sortKey]) || 0;
      const bv = parseFloat(b[sortKey]) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });

  const templateSummary = templates.map(t => ({
    name: t,
    count: sheets[t].length,
    top: sheets[t].find(r => r.Company_Rank === 1)?.Symbol || "—",
  }));

  const handleTemplateChange = (name) => {
    setActiveTemplate(name);
    setSearch("");
    setSelectedCompany(null);
    setSortKey("Company_Rank");
  };

  const handleVisibleKpiChange = (keys) => {
    setVisibleKpiMap(prev => ({ ...prev, [activeTemplate]: keys }));
  };

  // ── Sort by a KPI col ──
  const handleColSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc"); // default desc for KPIs (higher = better)
    }
  };

  const sortArrow = (key) => {
    if (sortKey !== key) return <span style={{ opacity: .25 }}>↕</span>;
    return <span style={{ color: "var(--accent-hover)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // Empty state — no pipeline output yet (all hooks already declared above).
  if (!resultFile) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(124,108,255,0.12)", border: "1px solid rgba(124,108,255,0.3)", fontSize: 24,
        }}>📊</div>
        <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
          No results yet
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.6 }}>
          Run the ranking pipeline first — once it completes, your ranked companies will appear here.
        </div>
        <Link to="/app" style={{
          marginTop: 8, padding: "12px 24px", borderRadius: 999, color: "#fff", fontSize: 14, fontWeight: 600,
          background: "linear-gradient(135deg, #7C6CFF, #4F46E5)",
          boxShadow: "0 4px 18px rgba(124,108,255,0.3)",
        }}>
          Go to Pipeline →
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--card); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .fade-in { animation: fadeIn .3s ease forwards; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .row-hover:hover { background: var(--elevated) !important; cursor: pointer; }
        input[type=text] { outline: none; }
        input[type=text]::placeholder { color: var(--text-muted); }
        th { user-select: none; }
        .th-sortable { cursor: pointer; }
        .th-sortable:hover { color: var(--accent-hover) !important; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 220, flexShrink: 0, background: "var(--card)",
          borderRight: "1px solid var(--border)", overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "20px 16px 12px" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: ".16em", color: "var(--text-muted)", marginBottom: 4 }}>STOCK RANKER</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Dashboard</div>
          </div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--text-muted)", padding: "0 16px 8px" }}>TEMPLATES</div>
          {templateSummary.map(t => (
            <button key={t.name} onClick={() => handleTemplateChange(t.name)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 16px",
              background: activeTemplate === t.name ? "var(--elevated)" : "transparent",
              border: "none",
              borderLeft: `2px solid ${activeTemplate === t.name ? "#7C6CFF" : "transparent"}`,
              cursor: "pointer", transition: "all .15s",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: activeTemplate === t.name ? "var(--accent-hover)" : "var(--text-secondary)", marginBottom: 2 }}>
                {t.name}
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--text-muted)" }}>
                {t.count} cos · top: {t.top}
              </div>
            </button>
          ))}
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar */}
          <div style={{
            padding: "14px 24px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--card)", flexShrink: 0, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{activeTemplate}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{allInTemplate.length} companies ranked</div>
            </div>

            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "8px 12px",
            }}>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>⌕</span>
              <input type="text" placeholder="Search symbol or name…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", width: 180 }} />
            </div>

            {/* Sort dir toggle */}
            <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} style={{
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
              color: "var(--text-secondary)", padding: "8px 12px", cursor: "pointer", fontSize: 13,
            }}>
              {sortDir === "asc" ? "↑" : "↓"}
            </button>

            {/* ── Column Picker ── */}
            <ColumnPicker
              allKpiKeys={allKpiKeys}
              visibleKpiKeys={visibleKpiKeys}
              onChange={handleVisibleKpiChange}
            />
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {[
              { label: "Companies",  value: allInTemplate.length },
              { label: "Top Ranked", value: allInTemplate.find(r => r.Company_Rank === 1)?.Symbol || "—" },
              {
                label: "Avg Score",
                value: allInTemplate.length
                  ? (allInTemplate.reduce((s, r) => s + (parseFloat(r.Total_Final_Score) || 0), 0) / allInTemplate.length).toFixed(1)
                  : "—",
              },
              { label: "Max Score",  value: maxScore.toFixed(1) },
              { label: "KPI Cols",   value: `${visibleKpiKeys.length} / ${allKpiKeys.length}` },
            ].map(({ label, value }, i) => (
              <div key={i} style={{ flex: 1, padding: "10px 20px", borderRight: i < 4 ? "1px solid var(--border)" : "none" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: ".12em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-hover)" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "12px 24px", background: "rgba(239,68,68,0.12)", borderBottom: "1px solid #EF4444", color: "var(--negative)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}

          {/* ── Table ── */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: "var(--card)", position: "sticky", top: 0, zIndex: 10 }}>
                  {/* Fixed cols */}
                  {["Rank", "Company", "Sector", "Score"].map(col => (
                    <th key={col}
                      className={col === "Score" || col === "Rank" ? "th-sortable" : ""}
                      onClick={() => col === "Score" ? handleColSort("Total_Final_Score") : col === "Rank" ? handleColSort("Company_Rank") : null}
                      style={thStyle}>
                      {col.toUpperCase()}
                      {col === "Score" && <> {sortArrow("Total_Final_Score")}</>}
                      {col === "Rank"  && <> {sortArrow("Company_Rank")}</>}
                    </th>
                  ))}

                  {/* Dynamic KPI cols */}
                  {visibleKpiKeys.map(key => (
                    <th key={key} className="th-sortable" onClick={() => handleColSort(key)} style={thStyle}>
                      {key.toUpperCase()} {sortArrow(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const rank  = Math.round(r.Company_Rank);
                  const score = parseFloat(r.Total_Final_Score) || 0;
                  const pct   = scoreBarPct(score, maxScore);

                  return (
                    <tr key={r.Symbol || idx}
                      className="row-hover fade-in"
                      onClick={() => setSelectedCompany(r)}
                      style={{ borderBottom: "1px solid var(--elevated)", background: idx % 2 === 0 ? "var(--canvas)" : "var(--card)" }}>

                      {/* Rank */}
                      <td style={tdStyle}>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: rankColor(rank, allInTemplate.length) }}>
                          {medal(rank) || `#${rank}`}
                        </span>
                      </td>

                      {/* Company */}
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.Description || r.Name || ""}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1, fontFamily: "'JetBrains Mono',monospace" }}>
                          {r.Symbol}
                          
                        </div>
                      </td>

                      {/* Sector */}
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 9, fontFamily: "'JetBrains Mono',monospace", padding: "2px 7px",
                          background: "rgba(124,108,255,0.12)", color: "var(--accent-hover)", borderRadius: 4, whiteSpace: "nowrap",
                        }}>
                          {r.Sector || r.SCS_Sector || "—"}
                        </span>
                      </td>

                      {/* Score bar */}
                      <td style={{ ...tdStyle, minWidth: 130 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: "var(--elevated)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: "linear-gradient(90deg,#7C6CFF,#22C55E)", borderRadius: 3,
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: 11, color: "var(--accent-hover)", minWidth: 36, textAlign: "right" }}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* Dynamic KPI cols */}
                      {visibleKpiKeys.map(key => {
                        const raw = r[key];
                        const v   = parseFloat(raw);
                        const isGood = !isNaN(v) && v > 0;
                        return (
                          <td key={key} style={tdStyle}>
                            <span className="mono" style={{
                              fontSize: 11,
                              color: isNaN(v) ? "var(--text-muted)" : isGood ? "var(--positive)" : "var(--negative)",
                            }}>
                              {isNaN(v) ? (raw || "—") : fmt(v, key)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={FIXED_COLS.length + visibleKpiKeys.length} style={{
                      padding: 48, textAlign: "center",
                      color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                    }}>
                      {search ? `No results for "${search}"` : "No data"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Company Drawer */}
      <CompanyDrawer
        company={selectedCompany}
        allCompanies={allInTemplate}
        onClose={() => setSelectedCompany(null)}
      />
    </>
  );
}

// ── Shared cell styles ────────────────────────────────────────────────────────

const thStyle = {
  padding: "10px 14px", textAlign: "left", fontSize: 9,
  fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)",
  letterSpacing: ".12em", borderBottom: "1px solid var(--border)",
  fontWeight: 500, whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "11px 14px", whiteSpace: "nowrap",
};

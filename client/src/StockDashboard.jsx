import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { apiUrl, getAuthHeaders, apiFetch } from "./api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { loadResult } from "./lib/resultStore";

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

// Columns treated as company identifiers — shown right after the fixed columns,
// before any KPI columns. Matched by output column name after COLUMN_MAPPING.
const IDENTIFIER_COLS = new Set(["BSE Code", "ISIN Code", "NSE Code"]);
const DEFAULT_HIDDEN_COLS = new Set(["BSE Code", "ISIN Code"]);

/**
 * Split non-system keys into three ordered groups:
 *   identifiers — BSE Code, ISIN Code, NSE Code (shown first, before KPIs)
 *   scored      — columns with a _Metric_Score sibling (template KPIs)
 *   other       — all remaining pass-through data columns
 * Returns { identifiers: [], scored: [], other: [] }
 */
function partitionKpiKeys(rows) {
  if (!rows?.length) return { identifiers: [], scored: [], other: [] };
  const keySet = new Set(Object.keys(rows[0]));
  const kpiKeys = Object.keys(rows[0]).filter(k => !isSystemCol(k));
  const identifiers = kpiKeys.filter(k => IDENTIFIER_COLS.has(k));
  const identifierSet = new Set(identifiers);
  const scored = kpiKeys.filter(k => !identifierSet.has(k) && keySet.has(`${k}_Metric_Score`));
  const other = kpiKeys.filter(k => !identifierSet.has(k) && !keySet.has(`${k}_Metric_Score`));
  return { identifiers, scored, other };
}

function medal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function rankColor(rank, total) {
  const pct = rank / total;
  if (pct <= 0.1) return "var(--positive)";
  if (pct <= 0.25) return "#4ADE80";
  if (pct <= 0.5) return "var(--warning)";
  if (pct <= 0.75) return "#FB923C";
  return "var(--negative)";
}

function scoreBarPct(score, max) {
  return max > 0 ? Math.min((score / max) * 100, 100) : 0;
}

function scoreColor(pct) {
  // pct = 0–100 (score as % of template max); higher is better
  if (pct >= 80) return "var(--positive)";
  if (pct >= 60) return "#4ADE80";
  if (pct >= 40) return "var(--warning)";
  if (pct >= 20) return "#FB923C";
  return "var(--negative)";
}

function fmt(val, key) {
  const v = parseFloat(val);
  if (isNaN(v)) return "—";
  const pctKeys = ["Growth", "Margin", "ROE", "ROCE", "Return", "Yield"];
  const addPct = pctKeys.some(p => key.includes(p));
  return v.toFixed(2) + (addPct ? "%" : "");
}

function fmtPrice(val, currency) {
  if (val == null) return "—";
  const sym = currency === "INR" ? "₹" : (currency ? `${currency} ` : "");
  return `${sym}${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMarketCap(val, currency) {
  if (val == null) return "—";
  const sym = currency === "INR" ? "₹" : (currency ? `${currency} ` : "");
  if (val >= 1e12) return `${sym}${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e7)  return `${sym}${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5)  return `${sym}${(val / 1e5).toFixed(2)} L`;
  return `${sym}${val.toLocaleString("en-IN")}`;
}

// ── Column Picker ─────────────────────────────────────────────────────────────

function ColumnPicker({ allKpiKeys, visibleKpiKeys, onChange, identifierKeys = [], scoredKeys = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const identifierSet = new Set(identifierKeys);
  const scoredSet = new Set(scoredKeys);

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

  const selectAll = () => onChange([...allKpiKeys]);
  const clearAll = () => onChange([]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Column picker — ${visibleKpiKeys.length} of ${allKpiKeys.length} visible`}
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
          background: "var(--accent-soft)", color: "var(--accent-hover)", fontSize: 9,
          borderRadius: 4, padding: "1px 5px", fontWeight: 700,
        }}>
          {visibleKpiKeys.length}/{allKpiKeys.length}
        </span>
        <span style={{ opacity: .5, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div role="listbox" aria-multiselectable="true" aria-label="Visible columns" style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "12px 0", minWidth: 220, maxHeight: 360, overflowY: "auto",
          boxShadow: "var(--shadow-elevated)",
        }}>
          {/* Quick actions */}
          <div style={{
            display: "flex", gap: 6, padding: "0 12px 10px",
            borderBottom: "1px solid var(--elevated)",
          }}>
            <button onClick={selectAll} style={quickBtnStyle("var(--positive)")}>All</button>
            <button onClick={clearAll} style={quickBtnStyle("var(--negative)")}>None</button>
          </div>

          {/* Grouped checkboxes — identifiers → scored KPIs → other data */}
          {(() => {
            const identifiers = allKpiKeys.filter(k => identifierSet.has(k));
            const scored = allKpiKeys.filter(k => scoredSet.has(k));
            const other = allKpiKeys.filter(k => !identifierSet.has(k) && !scoredSet.has(k));

            const renderKey = (key) => {
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
                    background: checked ? "var(--accent)" : "transparent",
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
            };

            const sectionLabel = (text) => (
              <div style={{
                padding: "6px 14px 4px",
                fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: ".12em", color: "var(--text-muted)",
                borderTop: "1px solid var(--elevated)",
                marginTop: 4,
              }}>
                {text}
              </div>
            );

            return (
              <>
                {identifiers.length > 0 && sectionLabel("IDENTIFIERS")}
                {identifiers.map(renderKey)}
                {scored.length > 0 && sectionLabel("TEMPLATE KPIs")}
                {scored.map(renderKey)}
                {other.length > 0 && sectionLabel("OTHER DATA")}
                {other.map(renderKey)}
              </>
            );
          })()}
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
  const navigate = useNavigate();
  const [liveQuote, setLiveQuote] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);

  // Use ISIN as the trigger key — it's always unique even when two companies share
  // the same rank or have an empty Symbol field.
  const companyKey = company?.["ISIN Code"] || company?.Symbol || company?.Description;

  useEffect(() => {
    // Always clear stale data first, regardless of whether Symbol is available.
    setLiveQuote(null);
    setLiveError(null);
    setLiveLoading(false);

    const isin   = company?.["ISIN Code"];
    const symbol = company?.Symbol;
    if (!isin && !symbol) return;

    // Prefer ISIN — it's always unique and doesn't depend on exchange suffix guessing.
    const path = isin
      ? `/company/isin/${encodeURIComponent(isin)}`
      : `/company/${encodeURIComponent(symbol)}`;

    let cancelled = false;
    setLiveLoading(true);
    apiFetch(path)
      .then(data => { if (!cancelled) { setLiveQuote(data); setLiveLoading(false); } })
      .catch(err => { if (!cancelled) { setLiveError(err.message); setLiveLoading(false); } });
    return () => { cancelled = true; };
  }, [companyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!company) return null;

  const metricScoreKeys = Object.keys(company).filter(k => k.endsWith("_Metric_Score"));
  const radarData = metricScoreKeys.map(k => ({
    kpi: k.replace("_Metric_Score", ""),
    score: parseFloat(company[k]) || 0,
  }));

  // Per-KPI comparison of this company against the template average.
  const comparisonData = metricScoreKeys.map(k => {
    const vals = allCompanies.map(c => parseFloat(c[k])).filter(v => !isNaN(v));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return {
      kpi: k.replace("_Metric_Score", ""),
      company: parseFloat(company[k]) || 0,
      average: Math.round(avg * 100) / 100,
    };
  });

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
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{company.Description || company.Name || ""}</div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--elevated)", border: "none", color: "var(--text-secondary)",
            fontSize: 18, width: 36, height: 36, borderRadius: 8,
            cursor: "pointer", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Live Market Data */}
        <div style={{ background: "var(--elevated)", borderRadius: 12, padding: "16px 18px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 12 }}>
            LIVE MARKET DATA
          </div>
          {liveLoading && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Fetching…</div>
          )}
          {liveError && (
            <div style={{ fontSize: 12, color: "var(--negative)" }}>Could not load live data</div>
          )}
          {liveQuote && (
            <>
              {/* Price + change */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>
                  {fmtPrice(liveQuote.price, liveQuote.currency)}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: liveQuote.change >= 0 ? "var(--positive)" : "var(--negative)",
                }}>
                  {liveQuote.change >= 0 ? "+" : ""}{liveQuote.change?.toFixed(2)}{" "}
                  ({liveQuote.change >= 0 ? "+" : ""}{liveQuote.changePct?.toFixed(2)}%)
                </span>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", marginLeft: "auto" }}>
                  {liveQuote.marketState}
                </span>
              </div>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Market Cap", value: fmtMarketCap(liveQuote.marketCap, liveQuote.currency) },
                  { label: "P/E Ratio",  value: liveQuote.peRatio != null ? liveQuote.peRatio.toFixed(2) : "—" },
                  { label: "52W High",   value: fmtPrice(liveQuote.week52High, liveQuote.currency) },
                  { label: "52W Low",    value: fmtPrice(liveQuote.week52Low, liveQuote.currency) },
                  { label: "Volume",     value: liveQuote.volume != null ? liveQuote.volume.toLocaleString("en-IN") : "—" },
                  { label: "Div Yield",  value: liveQuote.dividendYield != null ? `${(liveQuote.dividendYield * 100).toFixed(2)}%` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--card)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
                {liveQuote.longName || liveQuote.shortName} · {liveQuote.exchange}
              </div>
              {/* View Full Analysis CTA */}
              <button
                onClick={() => {
                  const sym = liveQuote.symbol || company?.Symbol;
                  if (sym) navigate(`/app/company/${encodeURIComponent(sym)}`, { state: { company } });
                }}
                style={{
                  marginTop: 14, width: "100%", padding: "10px 0",
                  background: "var(--accent)", color: "#fff", border: "none",
                  borderRadius: 8, fontSize: 12, fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace", cursor: "pointer",
                  letterSpacing: ".04em",
                }}
              >
                View Full Analysis →
              </button>
            </>
          )}
        </div>

        {/* Rank + Score */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Company Rank", value: `#${Math.round(company.Company_Rank)}`, color: rankColor(company.Company_Rank, allCompanies.length) },
            { label: "Total Score", value: parseFloat(company.Total_Final_Score).toFixed(1), color: "var(--accent-hover)" },
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
              background: "linear-gradient(90deg,var(--accent),var(--positive))",
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

        {/* Comparison: company vs template average across KPI scores */}
        {comparisonData.length >= 3 && (
          <div>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", letterSpacing: ".1em", marginBottom: 4 }}>VS TEMPLATE AVERAGE</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.5 }}>
              {company.Symbol} vs the average of all {allCompanies.length} companies in {company.KPI_Template} (scores 0–10).
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={comparisonData} outerRadius="70%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="kpi" tick={{ fill: "var(--text-secondary)", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar name={company.Symbol} dataKey="company" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.4} />
                <Radar name="Template avg" dataKey="average" stroke="var(--positive)" fill="var(--positive)" fillOpacity={0.12} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}
                  labelStyle={{ color: "var(--text)" }}
                />
              </RadarChart>
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
                    {(p.Description || p.Name || "").slice(0, 22)}
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
  const [error, setError] = useState(null);
  const [sheets, setSheets] = useState({});
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("Company_Rank");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSectorChart, setShowSectorChart] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  // visibleKpiKeys: per-template map { templateName: [key, ...] }
  const [visibleKpiMap, setVisibleKpiMap] = useState({});
  // kpiOrderMap: { templateName: { scored: [], other: [] } } — set once at parse time, never mutated
  const [kpiOrderMap, setKpiOrderMap] = useState({});
  // kpiDirectionMap: { kpiName: "higher" | "lower" } — fetched from KPI library
  const [kpiDirectionMap, setKpiDirectionMap] = useState({});

  useEffect(() => {
    apiFetch("/kpi-library").then(data => {
      const map = {};
      (data?.rows || []).forEach(row => { if (row.kpi) map[row.kpi] = (row.direction || "higher").toLowerCase(); });
      setKpiDirectionMap(map);
    }).catch(() => {});
  }, []);

  // Persisted result: if we arrived without an in-memory result (page refresh or
  // deep-link), hydrate the last run from IndexedDB.
  const [storedFile, setStoredFile] = useState(null);
  const [hydrating, setHydrating] = useState(!resultFile);
  useEffect(() => {
    if (resultFile) { setHydrating(false); return; }
    let cancelled = false;
    loadResult().then((blob) => {
      if (cancelled) return;
      if (blob) setStoredFile(blob);
      setHydrating(false);
    });
    return () => { cancelled = true; };
  }, [resultFile]);

  const effectiveFile = resultFile || storedFile;

  // ── Parse file ──
  useEffect(() => {
    if (!effectiveFile) return;
    const run = async () => {
      try {
        const ab = await effectiveFile.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        const parsed = {};
        wb.SheetNames.forEach(name => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (rows.length) parsed[name] = rows;
        });
        setSheets(parsed);
        setActiveTemplate(Object.keys(parsed)[0]);

        // Partition keys into scored (template KPIs) and other (pass-through data)
        // and initialise both maps with scored-first order.
        const initVisible = {};
        const initOrder = {};
        Object.entries(parsed).forEach(([name, rows]) => {
          const { identifiers, scored, other } = partitionKpiKeys(rows);
          initOrder[name] = { identifiers, scored, other };
          initVisible[name] = [...identifiers, ...scored, ...other].filter(k => !DEFAULT_HIDDEN_COLS.has(k));
        });
        setKpiOrderMap(initOrder);
        setVisibleKpiMap(initVisible);
      } catch (e) {
        setError(e.message);
      }
    };
    run();
  }, [effectiveFile]);

  // ── Derived ──
  const allInTemplate = sheets[activeTemplate] || [];
  const { identifiers: identifierKpiKeys = [], scored: scoredKpiKeys = [], other: otherKpiKeys = [] } = kpiOrderMap[activeTemplate] || {};
  const allKpiKeys = [...identifierKpiKeys, ...scoredKpiKeys, ...otherKpiKeys]; // identifiers → scored KPIs → other data
  const visibleKpiKeys = visibleKpiMap[activeTemplate] || [];    // currently shown KPI cols
  const maxScore = allInTemplate.length ? Math.max(...allInTemplate.map(c => parseFloat(c.Total_Final_Score) || 0)) : 0;
  const templates = Object.keys(sheets);


  const rows = allInTemplate
    .filter(r =>
      !search ||
      r.Symbol?.toLowerCase().includes(search.toLowerCase()) ||
      r.Description?.toLowerCase().includes(search.toLowerCase()) ||
      r.Name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = parseFloat(a[sortKey]) || 0;
      const bv = parseFloat(b[sortKey]) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const templateSummary = templates.map(t => ({
    name: t,
    count: sheets[t].length,
    top: sheets[t].find(r => r.Company_Rank === 1)?.Symbol || "—",
  }));

  // Sector distribution for the active template
  const sectorData = useMemo(() => {
    const counts = {};
    allInTemplate.forEach(r => {
      const s = r.Sector || r.SCS_Sector || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: allInTemplate.length ? Math.round((count / allInTemplate.length) * 100) : 0 }));
  }, [allInTemplate]);

  const handleEmailResults = async () => {
    if (!Object.keys(sheets).length || emailSending) return;
    setEmailSending(true);
    setEmailMsg("");
    try {
      const templates = Object.entries(sheets).map(([template, companies]) => ({
        template,
        companies: [...companies]
          .sort((a, b) => (a.Company_Rank || 0) - (b.Company_Rank || 0))
          .slice(0, 10)
          .map(c => ({
            rank: Math.round(c.Company_Rank || 0),
            symbol: c.Symbol || "",
            name: c.Description || c.Name || c.Symbol || "",
            sector: c.Sector || c.SCS_Sector || "—",
            score: parseFloat(c.Total_Final_Score || 0).toFixed(1),
          })),
      }));
      const res = await fetch(apiUrl("/results/email-summary"), {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ templates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send");
      setEmailMsg(`Sent to ${data.sentTo}`);
      setTimeout(() => setEmailMsg(""), 5000);
    } catch (err) {
      setEmailMsg(`Error: ${err.message}`);
      setTimeout(() => setEmailMsg(""), 6000);
    } finally {
      setEmailSending(false);
    }
  };

  const handleExportPDF = () => {
    const top10 = [...allInTemplate].sort((a, b) => a.Company_Rank - b.Company_Rank).slice(0, 10);
    const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const rows = top10.map((r, i) => `
      <tr>
        <td class="rank">#${Math.round(r.Company_Rank)}</td>
        <td class="company"><strong>${r.Description || r.Name || r.Symbol || ""}</strong><br/><span class="sym">${r.Symbol || ""}</span></td>
        <td class="sector">${r.Sector || r.SCS_Sector || "—"}</td>
        <td class="score">${parseFloat(r.Total_Final_Score || 0).toFixed(1)}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>ThinkVest — ${activeTemplate} Rankings</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#0f1117; background:#fff; padding:40px 48px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:3px solid #10B981; padding-bottom:16px; }
        .brand { font-size:24px; font-weight:800; letter-spacing:-.02em; color:#10B981; }
        .meta { font-size:11px; color:#6b7280; text-align:right; }
        .template-name { font-size:18px; font-weight:700; margin-bottom:4px; color:#0f1117; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { text-align:left; padding:10px 14px; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#6b7280; border-bottom:2px solid #e5e7eb; }
        td { padding:12px 14px; border-bottom:1px solid #f3f4f6; }
        tr:nth-child(even) td { background:#fafafa; }
        .rank { font-weight:800; color:#10B981; font-size:15px; }
        .company strong { font-size:13px; }
        .sym { font-size:10px; color:#6b7280; font-family:monospace; }
        .sector { font-size:11px; color:#1E3A8A; background:#ECFDF5; padding:2px 8px; border-radius:999px; display:inline-block; }
        .score { font-weight:700; font-size:14px; color:#059669; }
        .footer { margin-top:32px; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:12px; }
        @media print { body { padding:20px 28px; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="brand">ThinkVest</div>
          <div class="template-name">${activeTemplate}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">${allInTemplate.length} companies ranked</div>
        </div>
        <div class="meta">
          <div>Top 10 Rankings</div>
          <div>${date}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Rank</th><th>Company</th><th>Sector</th><th>Score</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Generated by ThinkVest equity ranking platform · ${date}</div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  // Reset to page 1 on any filter/sort/template change
  useEffect(() => { setPage(1); }, [activeTemplate, search, sortKey, sortDir, pageSize]);

  const handleTemplateChange = (name) => {
    setActiveTemplate(name);
    setSearch("");
    setSelectedCompany(null);
    setSortKey("Company_Rank");
    setDrawerOpen(false);
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

  // Still checking IndexedDB for a persisted result (avoids an empty-state flash).
  if (!effectiveFile && hydrating) {
    return (
      <div style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
      }}>
        Loading saved results…
      </div>
    );
  }

  // Empty state — no pipeline output yet (all hooks already declared above).
  if (!effectiveFile) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center",
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--accent-soft)", border: "1px solid var(--focus-glow)", fontSize: 30,
        }}>📊</div>
        <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
          No results yet
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.65 }}>
          Run the ranking pipeline to score and rank your equity universe by industry-specific KPIs.
          Results are saved automatically and will reappear here on your next visit.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
          <Link to="/app/screener" style={{
            padding: "11px 26px", borderRadius: 999, color: "#fff", fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg,var(--accent),var(--accent-deep))",
            boxShadow: "0 4px 18px var(--focus-glow)", textDecoration: "none",
          }}>
            Run from Screener
          </Link>
          <Link to="/app" style={{
            padding: "11px 26px", borderRadius: 999,
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
            background: "transparent", border: "1px solid var(--border)", textDecoration: "none",
          }}>
            Upload CSV
          </Link>
        </div>
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
        button:disabled { opacity: .35 !important; cursor: default !important; }
        button:not(:disabled):hover { background: var(--card) !important; color: var(--text) !important; }

        .tmpl-drawer {
          position: fixed; top: 0; left: 0; height: 100vh; width: 240px; z-index: 200;
          background: var(--card); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow-y: auto;
          transform: translateX(-100%); transition: transform .22s cubic-bezier(.4,0,.2,1);
          box-shadow: 4px 0 24px rgba(0,0,0,.35);
        }
        .tmpl-drawer.open { transform: translateX(0); }
        .tmpl-backdrop {
          position: fixed; inset: 0; z-index: 199;
          background: rgba(0,0,0,.45);
          opacity: 0; pointer-events: none;
          transition: opacity .22s ease;
        }
        .tmpl-backdrop.open { opacity: 1; pointer-events: all; }
        .tmpl-toggle {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
          background: var(--card); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; transition: all .15s;
        }
        .tmpl-toggle:hover { background: var(--elevated) !important; color: var(--text) !important; border-color: var(--accent) !important; }

        @media (max-width: 640px) {
          .sd-topbar { padding: 10px 12px !important; flex-wrap: wrap; gap: 8px !important; }
          .sd-stats  { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .sd-stat-cell { padding: 8px 12px !important; min-width: 80px; }

          /* Compact table — halve horizontal padding to fit more columns */
          .sd-table-wrap td { padding: 7px 8px !important; font-size: 10.5px; }
          .sd-table-wrap th { padding: 7px 8px !important; font-size: 8px !important; }
        }
      `}</style>

      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* ── Template drawer backdrop ── */}
        <div className={`tmpl-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />

        {/* ── Template drawer ── */}
        <div className={`tmpl-drawer${drawerOpen ? " open" : ""}`}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 12px" }}>
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: ".16em", color: "var(--text-muted)", marginBottom: 4 }}>STOCK RANKER</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Templates</div>
            </div>
            <button className="tmpl-toggle" onClick={() => setDrawerOpen(false)} title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--text-muted)", padding: "0 16px 8px" }}>
            {templateSummary.length} template{templateSummary.length !== 1 ? "s" : ""}
          </div>

          {templateSummary.map(t => (
            <button key={t.name} onClick={() => handleTemplateChange(t.name)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 16px",
              background: activeTemplate === t.name ? "var(--elevated)" : "transparent",
              border: "none",
              borderLeft: `2px solid ${activeTemplate === t.name ? "var(--accent)" : "transparent"}`,
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

        {/* ── Main (full width now that sidebar is a drawer) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar */}
          <div className="sd-topbar" style={{
            padding: "14px 24px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--card)", flexShrink: 0, flexWrap: "wrap",
          }}>
            {/* Template drawer toggle */}
            <button className="tmpl-toggle" onClick={() => setDrawerOpen(true)} title="Switch template">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

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
              identifierKeys={identifierKpiKeys}
              scoredKeys={scoredKpiKeys}
            />

            {/* Sector breakdown toggle */}
            <button
              onClick={() => setShowSectorChart(v => !v)}
              title="Sector breakdown"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: showSectorChart ? "var(--accent-soft)" : "var(--card)",
                border: `1px solid ${showSectorChart ? "var(--accent-hover)" : "var(--border)"}`,
                borderRadius: 8, color: showSectorChart ? "var(--accent-hover)" : "var(--text-secondary)",
                padding: "8px 12px", cursor: "pointer", fontSize: 11,
                fontFamily: "'JetBrains Mono',monospace", transition: "all .15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
              </svg>
              Sectors
            </button>

            {/* PDF export */}
            <button
              onClick={handleExportPDF}
              title="Export PDF summary"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text-secondary)",
                padding: "8px 12px", cursor: "pointer", fontSize: 11,
                fontFamily: "'JetBrains Mono',monospace", transition: "all .15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              PDF
            </button>

            {/* Email results */}
            <button
              onClick={handleEmailResults}
              disabled={emailSending}
              title={emailSending ? "Sending…" : "Email results to your inbox"}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 8, color: emailMsg.startsWith("Sent") ? "var(--positive)" : "var(--text-secondary)",
                padding: "8px 12px", cursor: emailSending ? "wait" : "pointer", fontSize: 11,
                fontFamily: "'JetBrains Mono',monospace", transition: "all .15s",
                opacity: emailSending ? .6 : 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              {emailSending ? "Sending…" : emailMsg ? emailMsg : "Email me"}
            </button>
          </div>

          {/* Stats strip */}
          <div className="sd-stats" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {[
              { label: "Companies", value: allInTemplate.length },
              { label: "Top Ranked", value: allInTemplate.find(r => r.Company_Rank === 1)?.Symbol || "—" },
              {
                label: "Avg Score",
                value: allInTemplate.length
                  ? (allInTemplate.reduce((s, r) => s + (parseFloat(r.Total_Final_Score) || 0), 0) / allInTemplate.length).toFixed(1)
                  : "—",
              },
              { label: "Max Score", value: maxScore.toFixed(1) },
              { label: "KPI Cols", value: `${visibleKpiKeys.length} / ${allKpiKeys.length}` },
            ].map(({ label, value }, i) => (
              <div key={i} className="sd-stat-cell" style={{ flex: 1, minWidth: 0, padding: "10px 20px", borderRight: i < 4 ? "1px solid var(--border)" : "none" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: ".12em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-hover)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Sector breakdown panel */}
          {showSectorChart && sectorData.length > 0 && (
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid var(--border)",
              background: "var(--card)", flexShrink: 0,
            }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--text-muted)", marginBottom: 10 }}>SECTOR BREAKDOWN — {activeTemplate}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sectorData.map(({ name, count, pct }, i) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-secondary)", flex: "0 0 140px", width: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ flex: 1, height: 6, background: "var(--elevated)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`, borderRadius: 3,
                        background: `hsl(${235 + i * 22},70%,${65 - i * 3}%)`,
                        transition: "width .5s ease",
                      }} />
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 50, textAlign: "right" }}>{count} · {pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: "12px 24px", background: "var(--negative-soft)", borderBottom: "1px solid var(--negative)", color: "var(--negative)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}

          {/* ── Table ── */}
          <div className="sd-table-wrap" style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
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
                      {col === "Rank" && <> {sortArrow("Company_Rank")}</>}
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
                {pagedRows.map((r, idx) => {
                  const rank = Math.round(r.Company_Rank);
                  const score = parseFloat(r.Total_Final_Score) || 0;
                  const pct = scoreBarPct(score, maxScore);

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
                          background: "var(--accent-soft)", color: "var(--accent-hover)", borderRadius: 4, whiteSpace: "nowrap",
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
                              background: scoreColor(pct), borderRadius: 3,
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: 11, color: scoreColor(pct), minWidth: 36, textAlign: "right" }}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* Dynamic KPI cols */}
                      {visibleKpiKeys.map(key => {
                        const raw = r[key];
                        const v = parseFloat(raw);
                        const isKpi = scoredKpiKeys.includes(key);
                        let color;
                        if (isNaN(v) || raw == null) {
                          color = "var(--text-muted)";
                        } else if (isKpi) {
                          const lowerIsBetter = kpiDirectionMap[key] === "lower";
                          const bad = lowerIsBetter ? v > 0 : v < 0;
                          color = bad ? "var(--negative)" : "var(--positive)";
                        } else {
                          color = "var(--text-secondary)";
                        }
                        return (
                          <td key={key} style={tdStyle}>
                            <span className="mono" style={{ fontSize: 11, color }}>
                              {isNaN(v) ? (raw || "—") : fmt(v, key)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {pagedRows.length === 0 && (
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

          {/* ── Pagination bar ── */}
          {rows.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap",
              padding: "10px 20px", borderTop: "1px solid var(--border)",
              background: "var(--card)", flexShrink: 0,
            }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} of ${rows.length}`}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => setPage(1)} disabled={page === 1} style={pgBtn}>«</button>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={pgBtn}>‹</button>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", padding: "0 8px", whiteSpace: "nowrap" }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} style={pgBtn}>›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn}>»</button>
              </div>

              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                style={{
                  padding: "4px 8px", borderRadius: 7,
                  border: "1px solid var(--border)", background: "var(--elevated)",
                  color: "var(--text-secondary)", fontSize: 11,
                  fontFamily: "'JetBrains Mono',monospace", cursor: "pointer", outline: "none",
                }}
              >
                {[25, 50, 100, 200].map(n => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
          )}
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

const pgBtn = {
  width: 28, height: 28, borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--elevated)",
  color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  transition: "all .12s", lineHeight: 1,
  opacity: 1,
};

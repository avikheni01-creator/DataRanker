import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis,
  ReferenceLine,
} from "recharts";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../api";
import { colors, fonts, radius } from "../theme";
import { useAppConfig } from "../AppConfigContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_COMPANIES   = 6;
const MAX_RADAR_AXES  = 8;
const MAX_MULTI_BAR   = 12;
const MAX_PERCENTILE  = 10;
const PALETTE = ["#1E3A8A", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];
const MEDALS  = ["🥇", "🥈", "🥉", "4th", "5th", "6th"];

// Index-based data keys prevent collision when two company names truncate identically
const ck = (i) => `c${i}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function findNameCol(columns) {
  const patterns = [/^name$/i, /company.?name/i, /^company$/i, /name/i, /ticker/i, /symbol/i];
  for (const p of patterns) {
    const c = columns.find((col) => p.test(col));
    if (c) return c;
  }
  return columns[0];
}

// Columns that look numeric but are actually identifiers — exclude from all charts
const IDENTIFIER_COL_RE = /\b(code|isin|cin|cusip|sedol|figi|id|no\.?|number|serial)\b/i;

function detectNumericCols(snapshot) {
  if (!snapshot) return [];
  return snapshot.columns.filter((col) => {
    if (IDENTIFIER_COL_RE.test(col)) return false;
    const nonNull = snapshot.rows.filter(
      (r) => r[col] !== null && r[col] !== undefined && r[col] !== ""
    );
    if (nonNull.length < 3) return false;
    const numCount = nonNull.filter(
      (r) => !isNaN(Number(r[col])) && isFinite(Number(r[col]))
    ).length;
    return numCount / nonNull.length >= 0.7;
  });
}

// Sort numeric cols by coefficient of variation across selected companies — most differentiating first
function sortByCV(numericCols, companies) {
  if (companies.length < 2) return numericCols;
  return [...numericCols]
    .map((col) => {
      const vals = companies.map((c) => Number(c[col]) || 0);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
      const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : Math.sqrt(variance);
      return { col, cv };
    })
    .sort((a, b) => b.cv - a.cv)
    .map((s) => s.col);
}

function pickRadarMetrics(numericCols, companies) {
  return sortByCV(numericCols, companies).slice(0, MAX_RADAR_AXES);
}

function shortName(name, max = 16) {
  const s = String(name || "—");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function formatNum(val) {
  if (val === null || val === undefined || val === "") return "—";
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return String(val);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

// Normalize a set of values to 0–100 range
function normalize(vals) {
  const defined = vals.filter((v) => v !== null && !isNaN(v) && isFinite(v));
  if (!defined.length) return vals.map(() => 0);
  const min = Math.min(...defined);
  const max = Math.max(...defined);
  const range = max - min;
  return vals.map((v) =>
    v === null || isNaN(v) ? 0 : range === 0 ? 50 : Math.round(((v - min) / range) * 100)
  );
}

// Build radar chart data (normalized per metric).
// Missing values are left as undefined so Recharts skips drawing those spokes
// rather than plotting them at 0 (which looks like data but isn't).
function buildRadarData(companies, metrics, nameCol) {
  return metrics.map((metric) => {
    const vals = companies.map((c) => {
      const v = Number(c[metric]);
      return isNaN(v) || !isFinite(v) ? null : v;
    });
    const defined = vals.filter((v) => v !== null);
    const entry = { subject: metric.length > 14 ? metric.slice(0, 12) + "…" : metric, fullName: metric };
    if (!defined.length) {
      companies.forEach((_, i) => { entry[ck(i)] = undefined; entry[`${ck(i)}r`] = null; });
      return entry;
    }
    const min = Math.min(...defined);
    const max = Math.max(...defined);
    const range = max - min;
    // 20–100 floor: weakest company still shows a polygon (0 collapses to center)
    companies.forEach((_, i) => {
      const v = vals[i];
      entry[ck(i)]       = v === null ? undefined : range === 0 ? 60 : Math.round(20 + ((v - min) / range) * 80);
      entry[`${ck(i)}r`] = v; // raw value for tooltip
    });
    return entry;
  });
}

// Build multi-metric grouped bar data.
// Bar height reflects ACTUAL proportional difference, not rank within selected companies.
// Strategy:
//   all-positive  → proportion of max: v/max*100  (half the max = half the bar)
//   all-negative  → proportion of most-negative: v/min*100 (least negative = tallest bar)
//   mixed         → zero-centred at 50, scaled by largest absolute value
//   identical     → all bars at 60 (no meaningful difference to show)
// A 3% visual floor prevents truly small bars from being invisible.
function buildMultiBarData(companies, metrics) {
  return metrics.map((metric) => {
    const vals = companies.map((c) => {
      const v = Number(c[metric]);
      return isNaN(v) || !isFinite(v) ? null : v;
    });
    const defined = vals.filter((v) => v !== null);
    const entry = {
      metric: metric.length > 15 ? metric.slice(0, 13) + "…" : metric,
      fullMetric: metric,
    };
    if (!defined.length) {
      companies.forEach((_, i) => { entry[ck(i)] = undefined; entry[`${ck(i)}r`] = null; });
      return entry;
    }

    const max = Math.max(...defined);
    const min = Math.min(...defined);

    const toBar = (() => {
      if (max === min)         return () => 60;                            // all identical
      if (min >= 0)            return (v) => (v / max) * 100;             // all positive
      if (max <= 0)            return (v) => (v / min) * 100;             // all negative
      const absMax = Math.max(Math.abs(max), Math.abs(min));
      return (v) => 50 + (v / absMax) * 50;                               // mixed
    })();

    companies.forEach((_, i) => {
      const v = vals[i];
      entry[ck(i)]       = v === null ? undefined : Math.max(3, Math.round(toBar(v)));
      entry[`${ck(i)}r`] = v;
    });
    return entry;
  });
}

// Calculate each company's percentile in the full dataset for each metric
function calcPercentiles(companies, metrics, allRows, nameCol) {
  return metrics.map((metric) => {
    const allVals = allRows
      .map((r) => Number(r[metric]))
      .filter((v) => !isNaN(v) && isFinite(v))
      .sort((a, b) => a - b);

    const entry = {
      metric: metric.length > 14 ? metric.slice(0, 12) + "…" : metric,
      fullMetric: metric,
    };
    companies.forEach((co, i) => {
      const val = Number(co[metric]);
      if (isNaN(val) || !isFinite(val) || !allVals.length) {
        entry[ck(i)] = undefined; entry[`${ck(i)}r`] = null;
        return;
      }
      const below = allVals.filter((v) => v < val).length;
      const pct = Math.round((below / allVals.length) * 100);
      entry[ck(i)]       = Math.max(3, pct); // visual floor so 0th-percentile bar is still visible
      entry[`${ck(i)}r`] = pct;              // actual percentile for tooltip
    });
    return entry;
  });
}

// Build leaderboard: for each metric rank companies, compute composite
function buildLeaderboard(companies, metrics, nameCol) {
  const scores = companies.map((co, i) => ({
    name: shortName(co[nameCol], 20),
    color: PALETTE[i],
    wins: [],
    points: 0,
  }));

  metrics.forEach((metric) => {
    const vals = companies.map((co) => {
      const v = Number(co[metric]);
      return isNaN(v) || !isFinite(v) ? null : v;
    });
    // Only rank companies that have actual data for this metric
    const withData = vals
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v !== null)
      .sort((a, b) => b.v - a.v);
    withData.forEach(({ i }, rank) => {
      scores[i].points += companies.length - rank;
      if (rank === 0) scores[i].wins.push(metric);
    });
  });

  return scores
    .map((s, i) => ({ ...s, originalIndex: i }))
    .sort((a, b) => b.points - a.points);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = (colors, fonts, radius) => `
  .cmp-page {
    padding: 28px 32px 64px; min-height: 100%;
    font-family: ${fonts.sans}; color: ${colors.text};
  }

  /* ── Page header ─── */
  .cmp-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: ${colors.text}; }
  .cmp-sub   { font-size: 13px; color: ${colors.textMuted}; margin: 0 0 20px; }

  /* ── Company picker ─── */
  .cmp-picker {
    background: ${colors.card}; border: 1px solid ${colors.border};
    border-radius: 14px; padding: 16px 18px;
  }
  .cmp-picker-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .cmp-search-wrap { position: relative; flex: 1; min-width: 220px; }
  .cmp-search-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: ${colors.textMuted}; pointer-events: none;
  }
  .cmp-search-input {
    width: 100%; padding: 9px 12px 9px 36px;
    border-radius: ${radius.sm}; border: 1px solid ${colors.border};
    background: ${colors.inset}; color: ${colors.text};
    font-size: 13px; font-family: ${fonts.sans}; outline: none; transition: border-color .15s;
  }
  .cmp-search-input::placeholder { color: ${colors.textMuted}; }
  .cmp-search-input:focus { border-color: ${colors.accent}; box-shadow: 0 0 0 3px ${colors.accentSoft}; }
  .cmp-count { font-size: 12px; color: ${colors.textMuted}; white-space: nowrap; }

  /* Dropdown */
  .cmp-dd-wrap { position: relative; flex: 1; min-width: 220px; }
  .cmp-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 40;
    background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: ${radius.md};
    box-shadow: 0 8px 32px rgba(0,0,0,0.35); max-height: 240px; overflow-y: auto;
  }
  .cmp-dd-item {
    padding: 10px 14px; font-size: 13px; cursor: pointer; color: ${colors.text};
    border-bottom: 1px solid ${colors.borderSubtle}; transition: background .1s;
  }
  .cmp-dd-item:last-child { border-bottom: none; }
  .cmp-dd-item:hover { background: ${colors.inset}; }
  .cmp-dd-item.already { opacity: .4; cursor: default; pointer-events: none; }
  .cmp-dd-empty { padding: 12px 14px; font-size: 13px; color: ${colors.textMuted}; }

  /* Pills */
  .cmp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .cmp-pill {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 10px 5px 8px; border-radius: 999px;
    font-size: 12px; font-weight: 500; color: ${colors.text};
    background: ${colors.elevated}; border: 1px solid ${colors.border};
  }
  .cmp-pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .cmp-pill-rm {
    background: none; border: none; cursor: pointer; color: ${colors.textMuted};
    font-size: 15px; line-height: 1; padding: 0 2px; border-radius: 3px; transition: color .12s;
  }
  .cmp-pill-rm:hover { color: ${colors.negative}; }

  /* ── Dashboard sections ─── */
  .cmp-section { margin-top: 20px; }
  .cmp-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: ${colors.textMuted}; margin-bottom: 12px; padding-left: 2px;
  }
  .cmp-row { display: grid; gap: 16px; margin-bottom: 16px; }
  .cmp-row-2 { grid-template-columns: 1fr 1fr; }
  .cmp-row-3 { grid-template-columns: 1fr 1fr 1fr; }
  @media (max-width: 900px) { .cmp-row-2, .cmp-row-3 { grid-template-columns: 1fr; } }

  /* ── Stat strip ─── */
  .cmp-stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .cmp-stat {
    background: ${colors.card}; border: 1px solid ${colors.border};
    border-radius: 10px; padding: 12px 18px; flex: 1; min-width: 110px;
  }
  .cmp-stat-val { font-size: 22px; font-weight: 700; color: ${colors.text}; line-height: 1; }
  .cmp-stat-label { font-size: 10px; color: ${colors.textMuted}; margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }

  /* ── Card ─── */
  .cmp-card {
    background: ${colors.card}; border: 1px solid ${colors.border};
    border-radius: 14px; overflow: hidden;
  }
  .cmp-card-head {
    padding: 13px 18px; border-bottom: 1px solid ${colors.border};
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  }
  .cmp-card-title { font-size: 13px; font-weight: 600; color: ${colors.text}; }
  .cmp-card-sub   { font-size: 11px; color: ${colors.textMuted}; }
  .cmp-card-body  { padding: 14px 10px 16px; }
  .cmp-card-body-pad { padding: 14px 18px; }

  /* ── Metric toggle chips ─── */
  .cmp-chips { display: flex; gap: 6px; overflow-x: auto; padding: 10px 18px; }
  .cmp-chips::-webkit-scrollbar { height: 3px; }
  .cmp-chip {
    padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 500;
    border: 1px solid ${colors.border}; background: ${colors.inset};
    color: ${colors.textSecondary}; cursor: pointer; white-space: nowrap;
    flex-shrink: 0; transition: all .12s;
  }
  .cmp-chip:hover { border-color: ${colors.accent}; color: ${colors.text}; }
  .cmp-chip.on { background: rgba(16,185,129,.15); border-color: ${colors.accent}; color: ${colors.accentHover}; }

  /* ── Axis selectors (scatter) ─── */
  .cmp-axis-row { display: flex; gap: 12px; padding: 10px 18px; flex-wrap: wrap; }
  .cmp-axis-group { display: flex; align-items: center; gap: 8px; }
  .cmp-axis-label { font-size: 11px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: .06em; }
  .cmp-axis-select {
    padding: 5px 28px 5px 10px; border-radius: ${radius.sm};
    border: 1px solid ${colors.border}; background: ${colors.inset}; color: ${colors.text};
    font-size: 12px; font-family: ${fonts.sans}; outline: none; cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2398A2BC' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 9px center;
    transition: border-color .15s;
  }
  .cmp-axis-select:focus { border-color: ${colors.accent}; }

  /* ── Recharts overrides ─── */
  .recharts-polar-angle-axis-tick text { font-size: 10px !important; fill: ${colors.textMuted} !important; }
  .recharts-cartesian-axis-tick text   { font-size: 11px !important; fill: ${colors.textMuted} !important; }
  .recharts-legend-item-text           { font-size: 11px !important; }
  .recharts-tooltip-wrapper            { z-index: 50 !important; }

  /* ── Leaderboard ─── */
  .cmp-leader { display: flex; flex-direction: column; gap: 8px; }
  .cmp-leader-row {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 14px; border-radius: 10px;
    border: 1px solid ${colors.border}; background: ${colors.inset};
  }
  .cmp-leader-medal { font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 2px; }
  .cmp-leader-name { font-size: 13px; font-weight: 600; color: ${colors.text}; }
  .cmp-leader-pts { font-size: 11px; color: ${colors.textMuted}; }
  .cmp-leader-wins { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .cmp-win-chip {
    font-size: 10px; padding: 2px 7px; border-radius: 999px;
    background: rgba(16,185,129,.12); color: ${colors.accentHover}; border: 1px solid rgba(16,185,129,.25);
  }
  .cmp-leader-row:first-child { background: rgba(16,185,129,.06); border-color: rgba(16,185,129,.3); }

  /* ── Comparison table ─── */
  .cmp-table-wrap { overflow-x: auto; }
  .cmp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
  .cmp-table thead th {
    padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase; color: ${colors.textMuted};
    background: ${colors.card}; border-bottom: 1px solid ${colors.border};
  }
  .cmp-table thead th:first-child { position: sticky; left: 0; z-index: 2; min-width: 160px; }
  .cmp-table td {
    padding: 8px 16px; color: ${colors.textSecondary};
    border-bottom: 1px solid ${colors.borderSubtle};
    font-variant-numeric: tabular-nums; text-align: right;
  }
  .cmp-table td:first-child {
    text-align: left; color: ${colors.text}; font-weight: 500;
    position: sticky; left: 0; background: ${colors.canvas}; z-index: 1;
  }
  .cmp-table tbody tr:last-child td { border-bottom: none; }
  .cmp-table tbody tr:hover td { background: ${colors.inset}; }
  .cmp-table tbody tr:hover td:first-child { background: ${colors.inset}; }
  .cmp-table td.best  { color: #22C55E; font-weight: 600; background: rgba(34,197,94,.06); }
  .cmp-table td.worst { color: ${colors.textMuted}; }
  .cmp-note { font-size: 11px; color: ${colors.textMuted}; }

  /* ── Percentile column picker ─── */
  .pct-picker-wrap { position: relative; padding: 10px 14px; border-bottom: 1px solid ${colors.borderSubtle}; }
  .pct-picker-trigger {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 7px 12px; border-radius: ${radius.sm};
    border: 1px solid ${colors.border}; background: ${colors.inset};
    cursor: pointer; font-size: 12px; color: ${colors.text};
    font-family: ${fonts.sans}; width: 100%; text-align: left;
    transition: border-color .15s;
  }
  .pct-picker-trigger:hover { border-color: ${colors.accent}; }
  .pct-picker-trigger-label { flex: 1; }
  .pct-picker-trigger-count {
    font-size: 11px; color: ${colors.textMuted};
    background: ${colors.elevated}; padding: 1px 7px; border-radius: 999px;
  }
  .pct-picker-chevron { color: ${colors.textMuted}; font-size: 11px; transition: transform .15s; }
  .pct-picker-chevron.open { transform: rotate(180deg); }
  .pct-picker-panel {
    position: absolute; top: calc(100% - 2px); left: 14px; right: 14px; z-index: 30;
    background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: ${radius.md};
    box-shadow: 0 8px 32px rgba(0,0,0,.4); max-height: 280px; display: flex; flex-direction: column;
  }
  .pct-picker-search {
    padding: 8px 12px; border-bottom: 1px solid ${colors.borderSubtle};
    flex-shrink: 0;
  }
  .pct-picker-search input {
    width: 100%; padding: 6px 10px; border-radius: ${radius.sm};
    border: 1px solid ${colors.border}; background: ${colors.inset};
    color: ${colors.text}; font-size: 12px; font-family: ${fonts.sans}; outline: none;
  }
  .pct-picker-search input:focus { border-color: ${colors.accent}; }
  .pct-picker-actions {
    display: flex; gap: 8px; padding: 6px 12px; border-bottom: 1px solid ${colors.borderSubtle};
    flex-shrink: 0;
  }
  .pct-picker-action {
    font-size: 11px; color: ${colors.accent}; background: none; border: none;
    cursor: pointer; padding: 0; font-family: ${fonts.sans};
  }
  .pct-picker-action:hover { color: ${colors.accentHover}; }
  .pct-picker-list { overflow-y: auto; flex: 1; }
  .pct-picker-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; cursor: pointer; font-size: 12px; color: ${colors.textSecondary};
    border-bottom: 1px solid ${colors.borderSubtle}; transition: background .1s;
  }
  .pct-picker-item:last-child { border-bottom: none; }
  .pct-picker-item:hover { background: ${colors.inset}; color: ${colors.text}; }
  .pct-picker-item.checked { color: ${colors.text}; }
  .pct-picker-checkbox {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid ${colors.border};
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    background: ${colors.inset}; font-size: 9px; transition: all .12s;
  }
  .pct-picker-item.checked .pct-picker-checkbox {
    background: ${colors.accent}; border-color: ${colors.accent}; color: #fff;
  }

  /* ── Empty / prompt ─── */
  .cmp-prompt {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 48px 24px; text-align: center;
    background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 14px;
    color: ${colors.textMuted}; font-size: 14px;
  }
  .cmp-prompt-icon { font-size: 36px; opacity: .5; }
  .cmp-prompt strong { color: ${colors.text}; display: block; font-size: 15px; margin-bottom: 4px; }

  @media (max-width: 600px) {
    .cmp-page { padding: 18px 14px 48px; }
    .cmp-stats { flex-direction: column; }
  }
`;

// ── Shared tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 5, color: "var(--text)", fontSize: 11 }}>
        {payload[0]?.payload?.fullMetric || payload[0]?.payload?.fullName || label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color || p.stroke, marginBottom: 2 }}>
          <span style={{ color: "var(--text-muted)", marginRight: 4 }}>{p.name}:</span>
          {typeof p.value === "number" ? (suffix ? p.value + suffix : formatNum(p.value)) : p.value}
        </div>
      ))}
    </div>
  );
}

// Tooltip for multi-metric bar: shows actual raw value, not the normalized bar height
function MultiBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text)", fontSize: 11 }}>
        {row?.fullMetric || label}
      </div>
      {payload.map((p, i) => {
        const rawKey = `${p.dataKey}r`;
        const rawVal = row?.[rawKey];
        return (
          <div key={i} style={{ color: p.fill, marginBottom: 3, display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
            <span style={{ fontWeight: 600 }}>
              {rawVal !== null && rawVal !== undefined ? formatNum(rawVal) : "—"}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px solid var(--border-subtle)", fontSize: 10, color: "var(--text-muted)" }}>
        Bar height proportional to value · different metrics share Y axis
      </div>
    </div>
  );
}

// Radar tooltip: shows actual raw values (not the normalized 20–100 spoke position)
function RadarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text)", fontSize: 11 }}>
        {row?.fullName || label}
      </div>
      {payload.map((p, i) => {
        const rawVal = row?.[`${p.dataKey}r`];
        return (
          <div key={i} style={{ color: p.stroke || p.fill, marginBottom: 3, display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{rawVal !== null && rawVal !== undefined ? formatNum(rawVal) : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

// Percentile tooltip: shows actual percentile (before the visual 3% floor)
function PercentileTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text)", fontSize: 11 }}>
        {row?.fullMetric || label}
      </div>
      {payload.map((p, i) => {
        const actual = row?.[`${p.dataKey}r`];
        return (
          <div key={i} style={{ color: p.fill, marginBottom: 3, display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
            <span style={{ fontWeight: 600 }}>
              {actual !== null && actual !== undefined ? `${actual}th %ile` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Company Picker ────────────────────────────────────────────────────────────

function CompanyPicker({ snapshot, selected, onAdd, onRemove, nameCol }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const wrapRef             = useRef(null);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const matches = useMemo(() => {
    if (!snapshot || !query.trim()) return [];
    const q = query.toLowerCase();
    return snapshot.rows.filter((r) => String(r[nameCol] || "").toLowerCase().includes(q)).slice(0, 10);
  }, [snapshot, query, nameCol]);

  const selectedSet = useMemo(() => new Set(selected.map((c) => c[nameCol])), [selected, nameCol]);

  return (
    <div className="cmp-picker">
      <div className="cmp-picker-top">
        <div className="cmp-dd-wrap" ref={wrapRef}>
          <div className="cmp-search-wrap">
            <svg className="cmp-search-icon" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="cmp-search-input"
              placeholder={selected.length >= MAX_COMPANIES ? `Max ${MAX_COMPANIES} companies reached` : "Search for a company to add…"}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => query && setOpen(true)}
              disabled={selected.length >= MAX_COMPANIES}
            />
          </div>
          {open && query && (
            <div className="cmp-dropdown">
              {matches.length === 0
                ? <div className="cmp-dd-empty">No companies match "{query}"</div>
                : matches.map((row, i) => {
                    const name = String(row[nameCol] || "—");
                    const already = selectedSet.has(name);
                    return (
                      <div key={i} className={`cmp-dd-item${already ? " already" : ""}`}
                        onClick={() => { if (!already) { onAdd(row); setQuery(""); setOpen(false); } }}>
                        {already ? "✓ " : ""}{name}
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
        <span className="cmp-count">{selected.length}/{MAX_COMPANIES} selected</span>
      </div>

      {selected.length > 0 && (
        <div className="cmp-pills">
          {selected.map((co, i) => (
            <div key={i} className="cmp-pill">
              <div className="cmp-pill-dot" style={{ background: PALETTE[i] }} />
              <span>{shortName(co[nameCol], 22)}</span>
              <button className="cmp-pill-rm" onClick={() => onRemove(co)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Radar Chart ───────────────────────────────────────────────────────────────

function RadarSection({ companies, metrics, nameCol }) {
  const data = useMemo(() => buildRadarData(companies, metrics, nameCol), [companies, metrics, nameCol]);

  // Coverage: count defined spokes per company using index keys
  const coverage = useMemo(() =>
    companies.map((co, i) => {
      const count = data.filter((d) => d[ck(i)] !== undefined).length;
      return { name: shortName(co[nameCol], 22), idx: i, count, total: metrics.length, full: count === metrics.length };
    }),
    [companies, data, metrics, nameCol]
  );
  const partial = coverage.filter((c) => !c.full);

  return (
    <div className="cmp-card">
      <div className="cmp-card-head">
        <span className="cmp-card-title">Multi-Metric Radar</span>
        <span className="cmp-card-sub">Relative score 20–100 · outermost = best among selected</span>
      </div>

      {partial.length > 0 && (
        <div style={{
          margin: "10px 14px 0", padding: "8px 12px", borderRadius: 8, fontSize: 11,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
          color: "var(--text-secondary)", lineHeight: 1.5,
        }}>
          <strong style={{ color: "#F59E0B" }}>Partial data —</strong>{" "}
          {partial.map((c, i) => (
            <span key={i}>
              <span style={{ color: PALETTE[c.idx] }}>{c.name}</span>{" "}
              has {c.count}/{c.total} metrics{i < partial.length - 1 ? ", " : "."}
            </span>
          ))}{" "}
          Missing spokes mean no data for that metric.
        </div>
      )}

      <div className="cmp-card-body">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={0} />
            {companies.map((co, i) => (
              <Radar key={i} name={shortName(co[nameCol])} dataKey={ck(i)}
                stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.12} strokeWidth={2} />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip content={<RadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Multi-Metric Grouped Bar ──────────────────────────────────────────────────

function MultiBarSection({ companies, numericCols, nameCol }) {
  const defaultMetrics = useMemo(
    () => new Set(sortByCV(numericCols, companies).slice(0, MAX_MULTI_BAR)),
    [numericCols, companies]
  );
  const [active, setActive] = useState(() => defaultMetrics);

  // Sync when companies/cols change
  useEffect(() => { setActive(defaultMetrics); }, [defaultMetrics]);

  const selected = useMemo(
    () => numericCols.filter((c) => active.has(c)),
    [numericCols, active]
  );

  const data = useMemo(
    () => buildMultiBarData(companies, selected),
    [companies, selected]
  );

  const toggle = (col) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 1) next.delete(col); }
      else { if (next.size < MAX_MULTI_BAR) next.add(col); }
      return next;
    });

  return (
    <div className="cmp-card">
      <div className="cmp-card-head">
        <span className="cmp-card-title">Multi-Metric Grouped Bar</span>
        <span className="cmp-card-sub">Bar height = proportional to actual value · hover for exact numbers · toggle metrics below</span>
      </div>

      {/* Metric toggles */}
      <div className="cmp-chips">
        {numericCols.map((col) => (
          <button key={col} className={`cmp-chip${active.has(col) ? " on" : ""}`} onClick={() => toggle(col)}>
            {col}
          </button>
        ))}
      </div>

      <div className="cmp-card-body">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fontSize: 10 }} angle={-35} textAnchor="end"
              interval={0} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v + "%"} width={36} />
            <Tooltip content={<MultiBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {companies.map((co, i) => (
              <Bar key={i} dataKey={ck(i)} name={shortName(co[nameCol])} fill={PALETTE[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Single-Metric Bar ─────────────────────────────────────────────────────────

function SingleBarSection({ companies, numericCols, activeMetric, onMetricChange, nameCol }) {
  const barData = useMemo(() => {
    if (!activeMetric) return [];
    return companies.map((co, i) => {
      const v = Number(co[activeMetric]);
      return { name: shortName(co[nameCol], 14), value: (isNaN(v) || !isFinite(v)) ? undefined : v, fill: PALETTE[i] };
    });
  }, [companies, activeMetric, nameCol]);

  return (
    <div className="cmp-card">
      <div className="cmp-card-head">
        <span className="cmp-card-title">Single Metric Deep Dive</span>
        <span className="cmp-card-sub">{activeMetric || "—"} · actual values</span>
      </div>
      <div className="cmp-chips">
        {numericCols.map((col) => (
          <button key={col} className={`cmp-chip${activeMetric === col ? " on" : ""}`}
            onClick={() => onMetricChange(col)}>{col}</button>
        ))}
      </div>
      <div className="cmp-card-body">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              width={52} tickFormatter={formatNum} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={52}>
              {barData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Scatter Plot ──────────────────────────────────────────────────────────────

function ScatterSection({ companies, numericCols, nameCol }) {
  const [xMetric, setXMetric] = useState(numericCols[0] || "");
  const [yMetric, setYMetric] = useState(numericCols[1] || numericCols[0] || "");

  useEffect(() => {
    if (numericCols.length >= 2) {
      setXMetric(numericCols[0]);
      setYMetric(numericCols[1]);
    }
  }, [numericCols]);

  const points = useMemo(() =>
    companies.map((co, i) => {
      const x = Number(co[xMetric]);
      const y = Number(co[yMetric]);
      if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) return null;
      return { x, y, label: shortName(co[nameCol], 12), color: PALETTE[i] };
    }),
    [companies, xMetric, yMetric, nameCol]
  );
  const missingScatter = useMemo(() =>
    companies.filter((co, i) => points[i] === null).map((co) => shortName(co[nameCol], 22)),
    [companies, points, nameCol]
  );

  const CustomDot = ({ cx, cy, payload }) => (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={payload.color} fillOpacity={0.85}
        stroke={payload.color} strokeWidth={1.5} />
      <text x={cx} y={cy - 14} textAnchor="middle" fill={payload.color}
        fontSize={10} fontWeight={600}>{payload.label}</text>
    </g>
  );

  return (
    <div className="cmp-card">
      <div className="cmp-card-head">
        <span className="cmp-card-title">Scatter Plot</span>
        <span className="cmp-card-sub">Two metrics vs each other</span>
      </div>
      {missingScatter.length > 0 && (
        <div style={{ margin: "8px 14px 0", padding: "7px 12px", borderRadius: 7, fontSize: 11,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--text-muted)" }}>
          <strong style={{ color: "#F59E0B" }}>Not plotted — </strong>
          {missingScatter.join(", ")} {missingScatter.length === 1 ? "has" : "have"} no data for one or both selected metrics.
        </div>
      )}
      <div className="cmp-axis-row">
        <div className="cmp-axis-group">
          <span className="cmp-axis-label">X</span>
          <select className="cmp-axis-select" value={xMetric} onChange={(e) => setXMetric(e.target.value)}>
            {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="cmp-axis-group">
          <span className="cmp-axis-label">Y</span>
          <select className="cmp-axis-select" value={yMetric} onChange={(e) => setYMetric(e.target.value)}>
            {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="cmp-card-body">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 20, right: 24, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" dataKey="x" name={xMetric} tick={{ fontSize: 11 }}
              axisLine={false} tickLine={false} tickFormatter={formatNum}
              label={{ value: xMetric, position: "insideBottom", offset: -6, fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis type="number" dataKey="y" name={yMetric} tick={{ fontSize: 11 }}
              axisLine={false} tickLine={false} tickFormatter={formatNum} width={52} />
            <ZAxis range={[80, 80]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: d?.color, marginBottom: 4 }}>{d?.label}</div>
                    <div style={{ color: "var(--text-muted)" }}>{xMetric}: <span style={{ color: "var(--text)" }}>{formatNum(d?.x)}</span></div>
                    <div style={{ color: "var(--text-muted)" }}>{yMetric}: <span style={{ color: "var(--text)" }}>{formatNum(d?.y)}</span></div>
                  </div>
                );
              }}
            />
            {points.map((pt, i) => pt && (
              <Scatter key={i} name={pt.label} data={[pt]} fill={pt.color} shape={<CustomDot />} />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Percentile Chart ──────────────────────────────────────────────────────────

function PercentileSection({ companies, numericCols, allRows, nameCol }) {
  const autoMetrics = useMemo(
    () => sortByCV(numericCols, companies).slice(0, MAX_PERCENTILE),
    [numericCols, companies]
  );

  // Column picker state
  const [selected, setSelected] = useState(() => new Set(autoMetrics));
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState("");
  const panelRef                = useRef(null);

  // Re-sync auto selection when companies change
  useEffect(() => { setSelected(new Set(autoMetrics)); }, [autoMetrics]);

  // Close panel on outside click
  useEffect(() => {
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() =>
    search.trim() ? numericCols.filter((c) => c.toLowerCase().includes(search.toLowerCase())) : numericCols,
    [numericCols, search]
  );

  const toggleCol = (col) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(col) ? next.delete(col) : next.add(col);
    return next;
  });

  const metrics = useMemo(
    () => numericCols.filter((c) => selected.has(c)),
    [numericCols, selected]
  );

  const data = useMemo(
    () => calcPercentiles(companies, metrics, allRows, nameCol),
    [companies, metrics, allRows, nameCol]
  );

  const rowHeight  = Math.max(44, companies.length * 18);
  const chartHeight = Math.max(280, metrics.length * rowHeight);

  return (
    <div className="cmp-card">
      <div className="cmp-card-head">
        <span className="cmp-card-title">Dataset Percentile Rank</span>
        <span className="cmp-card-sub">Where each company sits vs all {allRows.length} companies in the screener</span>
      </div>

      {/* Column picker */}
      <div className="pct-picker-wrap" ref={panelRef}>
        <button className="pct-picker-trigger" onClick={() => setOpen((o) => !o)}>
          <span className="pct-picker-trigger-label">
            {metrics.length === 0 ? "Select columns to display…" : `Showing ${metrics.length} column${metrics.length !== 1 ? "s" : ""}`}
          </span>
          <span className="pct-picker-trigger-count">{selected.size}/{numericCols.length}</span>
          <span className={`pct-picker-chevron${open ? " open" : ""}`}>▾</span>
        </button>

        {open && (
          <div className="pct-picker-panel">
            <div className="pct-picker-search">
              <input
                placeholder="Search columns…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="pct-picker-actions">
              <button className="pct-picker-action" onClick={() => setSelected(new Set(numericCols))}>Select all</button>
              <button className="pct-picker-action" onClick={() => setSelected(new Set())}>Clear</button>
              <button className="pct-picker-action" onClick={() => setSelected(new Set(autoMetrics))}>Auto (top {MAX_PERCENTILE})</button>
            </div>
            <div className="pct-picker-list">
              {filtered.map((col) => {
                const checked = selected.has(col);
                return (
                  <div key={col} className={`pct-picker-item${checked ? " checked" : ""}`} onClick={() => toggleCol(col)}>
                    <div className="pct-picker-checkbox">{checked ? "✓" : ""}</div>
                    {col}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {metrics.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          Select at least one column above to display the chart.
        </div>
      ) : (
        <div className="cmp-card-body" style={{ overflowY: chartHeight > 640 ? "auto" : "visible", maxHeight: 700 }}>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, bottom: 4, left: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v + "th"} />
                <YAxis type="category" dataKey="metric" width={110} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<PercentileTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={50} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} strokeDasharray="4 3"
                  label={{ value: "Median", position: "top", fontSize: 9, fill: "var(--text-muted)" }} />
                {companies.map((co, i) => (
                  <Bar key={i} dataKey={ck(i)} name={shortName(co[nameCol])} fill={PALETTE[i]}
                    radius={[0, 4, 4, 0]} fillOpacity={0.85} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function LeaderboardSection({ companies, numericCols, nameCol }) {
  const ranking = useMemo(
    () => buildLeaderboard(companies, numericCols, nameCol),
    [companies, numericCols, nameCol]
  );

  return (
    <div className="cmp-card" style={{ height: "100%" }}>
      <div className="cmp-card-head">
        <span className="cmp-card-title">Overall Ranking</span>
        <span className="cmp-card-sub">Composite score across {numericCols.length} metrics</span>
      </div>
      <div className="cmp-card-body-pad">
        <div className="cmp-leader">
          {ranking.map((entry, rank) => (
            <div key={rank} className="cmp-leader-row">
              <span className="cmp-leader-medal">{MEDALS[rank] || `${rank + 1}th`}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cmp-leader-name" style={{ color: entry.color }}>{entry.name}</div>
                <div className="cmp-leader-pts">{entry.points} pts · leads {entry.wins.length} metric{entry.wins.length !== 1 ? "s" : ""}</div>
                {entry.wins.length > 0 && (
                  <div className="cmp-leader-wins">
                    {entry.wins.slice(0, 5).map((w) => (
                      <span key={w} className="cmp-win-chip">{w.length > 14 ? w.slice(0, 12) + "…" : w}</span>
                    ))}
                    {entry.wins.length > 5 && (
                      <span className="cmp-win-chip">+{entry.wins.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Comparison Table ──────────────────────────────────────────────────────────

function ComparisonTable({ companies, numericCols, nameCol }) {
  const rows = useMemo(() =>
    numericCols.map((col) => {
      const vals = companies.map((co) => {
        const v = Number(co[col]);
        return isNaN(v) || !isFinite(v) ? null : v;
      });
      const defined = vals.filter((v) => v !== null);
      const maxVal  = defined.length ? Math.max(...defined) : null;
      const minVal  = defined.length ? Math.min(...defined) : null;
      return { col, vals, maxVal, minVal, allSame: maxVal === minVal };
    }),
    [companies, numericCols]
  );

  return (
    <div className="cmp-card">
      <div className="cmp-card-head">
        <span className="cmp-card-title">All Metrics — Raw Values</span>
        <span className="cmp-note">▲ = highest in row</span>
      </div>
      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Metric</th>
              {companies.map((co, i) => (
                <th key={i} style={{ color: PALETTE[i], textAlign: "right" }}>
                  {shortName(co[nameCol], 18)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ col, vals, maxVal, minVal, allSame }) => (
              <tr key={col}>
                <td>{col}</td>
                {vals.map((v, i) => {
                  const isBest  = !allSame && v !== null && v === maxVal;
                  const isWorst = !allSame && v !== null && v === minVal && vals.filter(x => x !== null).length > 1;
                  return (
                    <td key={i} className={isBest ? "best" : isWorst ? "worst" : ""}>
                      {v === null ? "—" : formatNum(v)}{isBest ? " ▲" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ComparisonPage() {
  const { comparisonEnabled } = useAppConfig();
  const [snapshot,     setSnapshot]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState([]);
  const [activeMetric, setActiveMetric] = useState(null);

  useEffect(() => {
    apiFetch("/screener")
      .then(({ snapshot: snap }) => { setSnapshot(snap); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const nameCol     = useMemo(() => snapshot ? findNameCol(snapshot.columns) : null, [snapshot]);
  const numericCols = useMemo(() => detectNumericCols(snapshot), [snapshot]);
  const radarMetrics = useMemo(() => pickRadarMetrics(numericCols, selected), [numericCols, selected]);

  useEffect(() => {
    if (!activeMetric && numericCols.length > 0) setActiveMetric(numericCols[0]);
  }, [numericCols, activeMetric]);

  const addCompany = useCallback((row) => {
    setSelected((prev) => {
      if (prev.length >= MAX_COMPANIES) return prev;
      if (prev.some((c) => c[nameCol] === row[nameCol])) return prev;
      return [...prev, row];
    });
  }, [nameCol]);

  const removeCompany = useCallback((row) => {
    setSelected((prev) => prev.filter((c) => c[nameCol] !== row[nameCol]));
  }, [nameCol]);

  const ready = selected.length >= 2;

  if (comparisonEnabled === false) return <Navigate to="/app/results" replace />;

  return (
    <div className="cmp-page">
      <style>{CSS(colors, fonts, radius)}</style>

      {/* Page header */}
      <h1 className="cmp-title">Company Comparison</h1>
      <p className="cmp-sub">
        Select 2–{MAX_COMPANIES} companies from the screener dataset to compare their metrics side by side.
      </p>

      {loading ? (
        <div style={{ color: colors.textMuted, fontSize: 14 }}>Loading screener data…</div>
      ) : !snapshot ? (
        <div className="cmp-prompt">
          <div className="cmp-prompt-icon">📊</div>
          <strong>No screener data available</strong>
          The admin needs to upload a screener snapshot first.
        </div>
      ) : (
        <CompanyPicker
          snapshot={snapshot} selected={selected}
          onAdd={addCompany} onRemove={removeCompany} nameCol={nameCol}
        />
      )}

      {/* Prompt when not enough companies */}
      {snapshot && !ready && (
        <div className="cmp-prompt" style={{ marginTop: 16 }}>
          <div className="cmp-prompt-icon">{selected.length === 0 ? "🔍" : "➕"}</div>
          <strong>
            {selected.length === 0
              ? "Search and select at least 2 companies"
              : "Add one more company to begin comparing"}
          </strong>
          {selected.length === 0
            ? "Use the search box above to pick companies from the screener dataset."
            : "You have 1 company selected — add another to unlock the comparison dashboard."}
        </div>
      )}

      {/* Dashboard — visible when ≥ 2 companies selected */}
      {ready && (
        <>
          {/* ── Stats strip ── */}
          <div className="cmp-section">
            <div className="cmp-stats">
              <div className="cmp-stat">
                <div className="cmp-stat-val">{selected.length}</div>
                <div className="cmp-stat-label">Companies</div>
              </div>
              <div className="cmp-stat">
                <div className="cmp-stat-val">{numericCols.length}</div>
                <div className="cmp-stat-label">Metrics</div>
              </div>
              <div className="cmp-stat">
                <div className="cmp-stat-val">{snapshot.rows.length}</div>
                <div className="cmp-stat-label">Dataset Size</div>
              </div>
              {selected.map((co, i) => (
                <div key={i} className="cmp-stat" style={{ borderColor: PALETTE[i] + "60" }}>
                  <div className="cmp-stat-val" style={{ fontSize: 14, color: PALETTE[i] }}>
                    {shortName(co[nameCol], 14)}
                  </div>
                  <div className="cmp-stat-label">
                    {numericCols.filter((c) => co[c] !== null && co[c] !== "" && co[c] !== undefined).length} metrics available
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 1: Overview ── */}
          <div className="cmp-section">
            <div className="cmp-section-label">Overview</div>
            <div className="cmp-row cmp-row-2">
              {radarMetrics.length >= 3 && (
                <RadarSection companies={selected} metrics={radarMetrics} nameCol={nameCol} />
              )}
              <LeaderboardSection companies={selected} numericCols={numericCols} nameCol={nameCol} />
            </div>
          </div>

          {/* ── Section 2: Multi-Metric Bar ── */}
          <div className="cmp-section">
            <div className="cmp-section-label">Grouped Comparison</div>
            <MultiBarSection companies={selected} numericCols={numericCols} nameCol={nameCol} />
          </div>

          {/* ── Section 3: Deep Dive ── */}
          <div className="cmp-section">
            <div className="cmp-section-label">Deep Dive</div>
            <div className="cmp-row cmp-row-2">
              <SingleBarSection
                companies={selected} numericCols={numericCols}
                activeMetric={activeMetric} onMetricChange={setActiveMetric} nameCol={nameCol}
              />
              {numericCols.length >= 2 && (
                <ScatterSection companies={selected} numericCols={numericCols} nameCol={nameCol} />
              )}
            </div>
          </div>

          {/* ── Section 4: Market Position ── */}
          {snapshot.rows.length > selected.length && (
            <div className="cmp-section">
              <div className="cmp-section-label">Market Position</div>
              <PercentileSection
                companies={selected} numericCols={numericCols}
                allRows={snapshot.rows} nameCol={nameCol}
              />
            </div>
          )}

          {/* ── Section 5: Full Data Table ── */}
          <div className="cmp-section">
            <div className="cmp-section-label">Raw Data</div>
            <ComparisonTable companies={selected} numericCols={numericCols} nameCol={nameCol} />
          </div>
        </>
      )}
    </div>
  );
}

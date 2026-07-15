import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ReferenceLine,
} from "recharts";

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtPrice(val, currency = "INR") {
  if (val == null) return "—";
  const sym = currency === "INR" ? "₹" : currency + " ";
  return `${sym}${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtLarge(val, currency = "INR") {
  if (val == null) return "—";
  const sym = currency === "INR" ? "₹" : currency + " ";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7)  return `${sign}${sym}${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5)  return `${sign}${sym}${(abs / 1e5).toFixed(2)}L`;
  return `${sign}${sym}${abs.toLocaleString("en-IN")}`;
}

function fmtPct(val, decimals = 1) {
  if (val == null) return "—";
  return `${(val * 100).toFixed(decimals)}%`;
}

function fmtX(val, decimals = 2) {
  if (val == null) return "—";
  return `${Number(val).toFixed(decimals)}x`;
}

function fmtQDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

const MONO = "'JetBrains Mono', monospace";

function SectionCard({ title, children, style = {} }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "20px 22px", ...style,
    }}>
      {title && (
        <div style={{
          fontSize: 10, fontFamily: MONO, color: "var(--text-muted)",
          letterSpacing: ".12em", marginBottom: 16,
        }}>{title}</div>
      )}
      {children}
    </div>
  );
}

function StatTile({ label, value, valueColor }) {
  return (
    <div style={{
      background: "var(--elevated)", borderRadius: 10,
      padding: "10px 12px", border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 9, fontFamily: MONO, color: "var(--text-muted)", marginBottom: 4, letterSpacing: ".08em" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: valueColor || "var(--text-secondary)" }}>
        {value}
      </div>
    </div>
  );
}

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, fontFamily: MONO, fontSize: 11,
    },
    labelStyle: { color: "var(--text)", marginBottom: 4 },
  };
}

function axisTickStyle() {
  return { fill: "var(--text-muted)", fontSize: 9, fontFamily: MONO };
}

// ── Price Chart ───────────────────────────────────────────────────────────────

const PERIODS = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

function PriceChart({ history, currency }) {
  const [period, setPeriod] = useState("1Y");

  const chartData = useMemo(() => {
    if (!history?.length) return [];
    const cutoff = Date.now() - PERIODS[period] * 86_400_000;
    return history
      .filter(r => new Date(r.date).getTime() >= cutoff)
      .map(r => ({
        date: new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        price: r.close,
      }));
  }, [history, period]);

  if (!chartData.length) return null;

  const isUp = (chartData.at(-1)?.price ?? 0) >= (chartData[0]?.price ?? 0);
  const color = isUp ? "var(--positive)" : "var(--negative)";

  return (
    <SectionCard title="PRICE HISTORY">
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 14 }}>
        {Object.keys(PERIODS).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "3px 11px", borderRadius: 6, fontSize: 11, fontFamily: MONO,
            border: "1px solid var(--border)", cursor: "pointer",
            background: period === p ? "var(--accent)" : "var(--elevated)",
            color: period === p ? "#fff" : "var(--text-secondary)",
          }}>{p}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={axisTickStyle()} tickLine={false} axisLine={false}
            interval={Math.floor(chartData.length / 6)} />
          <YAxis tick={axisTickStyle()} tickLine={false} axisLine={false} width={56}
            domain={["auto", "auto"]}
            tickFormatter={v => `${currency === "INR" ? "₹" : ""}${(v / 1000).toFixed(1)}k`} />
          <Tooltip {...tooltipStyle()} formatter={v => [fmtPrice(v, currency), "Close"]} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2}
            fill="url(#cdGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ── Analyst Consensus ─────────────────────────────────────────────────────────

const REC_COLOR = {
  strong_buy: "#16a34a", buy: "#22c55e",
  hold: "#f59e0b", underperform: "#f97316", sell: "#ef4444",
};

function AnalystSection({ analyst, quote, currency }) {
  if (!analyst?.targetMean && !analyst?.trend?.length) return null;

  const { targetLow, targetMean, targetHigh, recommendationKey, numberOfAnalysts, trend } = analyst;
  const currentPrice = quote?.price;
  const latest = trend?.[0];
  const totalRecs = latest
    ? (latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell)
    : 0;

  const recBars = totalRecs > 0 ? [
    { label: "Strong Buy", count: latest.strongBuy,  color: "#16a34a" },
    { label: "Buy",        count: latest.buy,         color: "#4ade80" },
    { label: "Hold",       count: latest.hold,        color: "#f59e0b" },
    { label: "Sell",       count: latest.sell,        color: "#f97316" },
    { label: "Strong Sell",count: latest.strongSell,  color: "#ef4444" },
  ] : [];

  const recColor = REC_COLOR[recommendationKey?.toLowerCase()] || "var(--text-muted)";

  return (
    <SectionCard title="ANALYST CONSENSUS">
      {recommendationKey && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: recColor, textTransform: "uppercase" }}>
            {recommendationKey.replace(/_/g, " ")}
          </span>
          {numberOfAnalysts != null && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: MONO }}>
              {numberOfAnalysts} analysts
            </span>
          )}
        </div>
      )}

      {targetMean != null && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: MONO, marginBottom: 8 }}>
            PRICE TARGET
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: "Low",  val: targetLow },
              { label: "Mean", val: targetMean },
              { label: "High", val: targetHigh },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: MONO }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {fmtPrice(val, currency)}
                </div>
              </div>
            ))}
          </div>
          {/* Range bar with current-price marker */}
          {currentPrice != null && targetLow != null && targetHigh != null && (() => {
            const lo = targetLow  * 0.85;
            const hi = targetHigh * 1.15;
            const span = hi - lo;
            const pos = pct => `${Math.max(0, Math.min(100, ((pct - lo) / span) * 100))}%`;
            return (
              <div style={{ position: "relative", height: 6, background: "var(--elevated)", borderRadius: 3 }}>
                <div style={{
                  position: "absolute",
                  left: pos(targetLow), right: `${100 - parseFloat(pos(targetHigh))}%`,
                  height: "100%", background: "var(--accent)", borderRadius: 3, opacity: .55,
                }} />
                <div style={{
                  position: "absolute", left: pos(currentPrice), top: -3,
                  width: 12, height: 12, borderRadius: "50%",
                  background: "var(--text)", border: "2px solid var(--card)",
                  transform: "translateX(-50%)",
                }} />
              </div>
            );
          })()}
        </div>
      )}

      {recBars.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: MONO, marginBottom: 6 }}>
            BREAKDOWN
          </div>
          <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 20 }}>
            {recBars.filter(b => b.count > 0).map(b => (
              <div key={b.label} style={{
                width: `${(b.count / totalRecs) * 100}%`,
                background: b.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {b.count / totalRecs > 0.1 && (
                  <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{b.count}</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {recBars.filter(b => b.count > 0).map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: MONO }}>
                  {b.label} ({b.count})
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ── Earnings History ──────────────────────────────────────────────────────────

function EarningsSection({ earnings }) {
  const hist = (earnings?.history || []).filter(e => e.epsActual != null || e.epsEstimate != null);
  if (!hist.length) return null;

  const nextDate = earnings?.trend?.find(t => t.endDate)?.endDate;

  const chartData = hist.map(e => ({
    quarter: fmtQDate(e.date),
    estimate: e.epsEstimate,
    actual:   e.epsActual,
    beat: e.epsActual != null && e.epsEstimate != null && e.epsActual >= e.epsEstimate,
    surprise: e.surprisePercent,
  }));

  return (
    <SectionCard title="EARNINGS HISTORY — EPS">
      {nextDate && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: MONO, marginBottom: 12 }}>
          Next earnings: {new Date(nextDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="quarter" tick={axisTickStyle()} axisLine={false} tickLine={false} />
          <YAxis tick={axisTickStyle()} axisLine={false} tickLine={false} />
          <Tooltip
            {...tooltipStyle()}
            formatter={(v, name) => [
              v?.toFixed(2) ?? "—",
              name === "actual" ? "Actual EPS" : "Est. EPS",
            ]}
          />
          <Bar dataKey="estimate" name="estimate" fill="var(--elevated)"
            stroke="var(--border)" strokeWidth={1} radius={[2, 2, 0, 0]} />
          <Bar dataKey="actual" name="actual" radius={[2, 2, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={
                d.actual == null ? "var(--elevated)"
                : d.beat ? "var(--positive)" : "var(--negative)"
              } />
            ))}
          </Bar>
          <Legend
            wrapperStyle={{ fontSize: 9, fontFamily: MONO }}
            formatter={v => v === "actual" ? "Actual" : "Estimate"}
          />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ── Quarterly Revenue & Net Income ────────────────────────────────────────────

function QuarterlyIncomeSection({ data, currency }) {
  if (!data?.length) return null;
  const chartData = data.map(q => ({
    quarter: fmtQDate(q.date),
    revenue:   q.revenue,
    netIncome: q.netIncome,
  }));
  return (
    <SectionCard title="QUARTERLY REVENUE & NET INCOME">
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="quarter" tick={axisTickStyle()} axisLine={false} tickLine={false} />
          <YAxis tick={axisTickStyle()} axisLine={false} tickLine={false} width={60}
            tickFormatter={v => fmtLarge(v, currency)} />
          <Tooltip
            {...tooltipStyle()}
            formatter={(v, name) => [
              fmtLarge(v, currency),
              name === "revenue" ? "Revenue" : "Net Income",
            ]}
          />
          <Bar dataKey="revenue" name="revenue" fill="var(--accent)"
            radius={[2, 2, 0, 0]} opacity={0.85} />
          <Bar dataKey="netIncome" name="netIncome" radius={[2, 2, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={(d.netIncome ?? 0) >= 0 ? "var(--positive)" : "var(--negative)"} />
            ))}
          </Bar>
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: MONO }}
            formatter={v => v === "revenue" ? "Revenue" : "Net Income"} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ── Cash Flows ────────────────────────────────────────────────────────────────

function CashflowSection({ data, currency }) {
  if (!data?.length) return null;
  const chartData = data.map(q => ({
    quarter:   fmtQDate(q.date),
    operating: q.operating,
    investing: q.investing,
    financing: q.financing,
  }));
  return (
    <SectionCard title="CASH FLOWS">
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="quarter" tick={axisTickStyle()} axisLine={false} tickLine={false} />
          <YAxis tick={axisTickStyle()} axisLine={false} tickLine={false} width={60}
            tickFormatter={v => fmtLarge(v, currency)} />
          <Tooltip
            {...tooltipStyle()}
            formatter={(v, name) => [
              fmtLarge(v, currency),
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="operating" name="operating" fill="#7c6cff" radius={[2, 2, 0, 0]} />
          <Bar dataKey="investing" name="investing" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          <Bar dataKey="financing" name="financing" fill="#ec4899" radius={[2, 2, 0, 0]} />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: MONO }} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ── Key Metrics ───────────────────────────────────────────────────────────────

function KeyMetricsSection({ valuation, profitability, financials, currency }) {
  const tiles = [
    { label: "P/E Ratio",      value: fmtX(valuation?.peRatio) },
    { label: "Fwd P/E",        value: fmtX(valuation?.forwardPE) },
    { label: "P/B Ratio",      value: fmtX(valuation?.pbRatio) },
    { label: "EV/EBITDA",      value: fmtX(valuation?.evToEbitda) },
    { label: "Beta",           value: valuation?.beta != null ? Number(valuation.beta).toFixed(2) : "—" },
    { label: "Market Cap",     value: fmtLarge(valuation?.marketCap, currency) },
    { label: "Ent. Value",     value: fmtLarge(valuation?.enterpriseValue, currency) },
    { label: "Gross Margin",   value: fmtPct(profitability?.grossMargin) },
    { label: "Op. Margin",     value: fmtPct(profitability?.operatingMargin) },
    { label: "Net Margin",     value: fmtPct(profitability?.profitMargin) },
    { label: "ROE",            value: fmtPct(profitability?.returnOnEquity) },
    { label: "ROA",            value: fmtPct(profitability?.returnOnAssets) },
    { label: "Debt / Equity",  value: fmtX(financials?.debtToEquity) },
    { label: "Free Cash Flow", value: fmtLarge(financials?.freeCashflow, currency) },
  ];
  return (
    <SectionCard title="KEY METRICS">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tiles.map(t => <StatTile key={t.label} label={t.label} value={t.value} />)}
      </div>
    </SectionCard>
  );
}

// ── Ownership ─────────────────────────────────────────────────────────────────

function OwnershipSection({ ownership }) {
  const { insiderPercent, institutionPercent, floatShares, sharesOutstanding, shortRatio } = ownership || {};
  if (insiderPercent == null && institutionPercent == null) return null;

  const bars = [
    { label: "Institutional", pct: institutionPercent, color: "var(--accent)" },
    { label: "Insider",       pct: insiderPercent,     color: "#f59e0b" },
  ].filter(b => b.pct != null);

  return (
    <SectionCard title="OWNERSHIP">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {bars.map(b => (
          <div key={b.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{b.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", fontFamily: MONO }}>
                {fmtPct(b.pct)}
              </span>
            </div>
            <div style={{ background: "var(--elevated)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${Math.min(100, b.pct * 100)}%`,
                height: "100%", background: b.color, borderRadius: 4,
              }} />
            </div>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
          {floatShares != null && sharesOutstanding != null && (
            <StatTile label="Float %" value={fmtPct(floatShares / sharesOutstanding)} />
          )}
          {shortRatio != null && (
            <StatTile label="Short Ratio" value={`${Number(shortRatio).toFixed(1)} days`} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ── Dividends ─────────────────────────────────────────────────────────────────

function DividendSection({ dividends, currency }) {
  const { yield: divYield, rate, payoutRatio, exDate } = dividends || {};
  if (!divYield && !rate) return null;

  return (
    <SectionCard title="DIVIDENDS">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <StatTile label="Div Yield"    value={fmtPct(divYield)} />
        <StatTile label="Annual Rate"  value={fmtPrice(rate, currency)} />
        <StatTile label="Payout Ratio" value={fmtPct(payoutRatio)} />
        <StatTile label="Ex-Date"      value={exDate
          ? new Date(exDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : "—"}
        />
      </div>
    </SectionCard>
  );
}

// ── Company Profile ───────────────────────────────────────────────────────────

function ProfileSection({ profile }) {
  const [expanded, setExpanded] = useState(false);
  if (!profile?.description && !profile?.sector) return null;

  const desc   = profile.description || "";
  const isLong = desc.length > 320;

  return (
    <SectionCard title="COMPANY PROFILE">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Sector",    value: profile.sector },
          { label: "Industry",  value: profile.industry },
          { label: "Country",   value: profile.country },
          { label: "Employees", value: profile.employees != null ? Number(profile.employees).toLocaleString("en-IN") : null },
        ].filter(s => s.value).map(s => <StatTile key={s.label} label={s.label} value={s.value} />)}
      </div>
      {desc && (
        <>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
            {expanded || !isLong ? desc : desc.slice(0, 320) + "…"}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)} style={{
              marginTop: 8, background: "none", border: "none",
              color: "var(--accent-hover)", fontSize: 12,
              cursor: "pointer", padding: 0, fontFamily: MONO,
            }}>
              {expanded ? "Read less ↑" : "Read more ↓"}
            </button>
          )}
        </>
      )}
      {profile.website && (
        <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", marginTop: 12, fontSize: 12,
          color: "var(--accent-hover)", textDecoration: "none", fontFamily: MONO,
        }}>
          {profile.website} ↗
        </a>
      )}
    </SectionCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const { symbol }           = useParams();
  const location             = useLocation();
  const navigate             = useNavigate();
  const matrixCompany        = location.state?.company;

  const [data, setData]      = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/company/${encodeURIComponent(symbol)}/full`)
      .then(d  => { setData(d);           setLoading(false); })
      .catch(e => { setError(e.message);  setLoading(false); });
  }, [symbol]);

  if (loading) return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      height: "60vh", color: "var(--text-muted)", fontFamily: MONO, fontSize: 13,
    }}>
      Loading {symbol}…
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ color: "var(--negative)", fontWeight: 700, marginBottom: 8 }}>
        Could not load data
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>{error}</div>
      <button onClick={() => navigate(-1)} style={{
        padding: "8px 20px", borderRadius: 8, background: "var(--accent)",
        color: "#fff", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 13,
      }}>← Go Back</button>
    </div>
  );

  const q        = data.quote;
  const currency = q?.currency || "INR";
  const isUp     = (q?.change ?? 0) >= 0;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 56px" }}>

      {/* Back link */}
      <button onClick={() => navigate(-1)} style={{
        background: "none", border: "none", color: "var(--text-muted)",
        cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center",
        gap: 6, padding: "0 0 20px", fontFamily: MONO,
      }}>← Back to Results</button>

      {/* ── Company header ── */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: MONO, color: "var(--accent-hover)", letterSpacing: ".12em", marginBottom: 6 }}>
              {data.profile?.sector || q?.exchange || ""}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-.02em" }}>
              {q?.shortName || q?.longName || symbol}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontFamily: MONO }}>
              {symbol} · {q?.exchange || ""}
            </div>
          </div>

          {q && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>
                {fmtPrice(q.price, currency)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isUp ? "var(--positive)" : "var(--negative)" }}>
                {isUp ? "+" : ""}{q.change?.toFixed(2)}{" "}
                ({isUp ? "+" : ""}{q.changePct?.toFixed(2)}%)
              </div>
              <div style={{
                display: "inline-block", marginTop: 6, fontSize: 9, fontFamily: MONO,
                padding: "3px 8px", borderRadius: 4,
                background: q.marketState === "REGULAR" ? "rgba(34,197,94,.15)" : "var(--elevated)",
                color: q.marketState === "REGULAR" ? "var(--positive)" : "var(--text-muted)",
              }}>{q.marketState}</div>
            </div>
          )}
        </div>

        {/* Today's OHLV stats */}
        {q && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 8, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)",
          }}>
            {[
              { label: "Open",       value: fmtPrice(q.open, currency) },
              { label: "High",       value: fmtPrice(q.high, currency) },
              { label: "Low",        value: fmtPrice(q.low, currency) },
              { label: "Prev Close", value: fmtPrice(q.previousClose, currency) },
              { label: "Volume",     value: q.volume?.toLocaleString("en-IN") ?? "—" },
              { label: "52W High",   value: fmtPrice(q.week52High, currency) },
              { label: "52W Low",    value: fmtPrice(q.week52Low, currency) },
              { label: "50D Avg",    value: fmtPrice(q.fiftyDayAvg, currency) },
            ].map(({ label, value }) => (
              <StatTile key={label} label={label} value={value} />
            ))}
          </div>
        )}

        {/* Matrix ranking context, only when navigated from results */}
        {matrixCompany && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 8,
            background: "rgba(124,108,255,.08)", border: "1px solid rgba(124,108,255,.2)",
            display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 10, fontFamily: MONO, color: "var(--accent-hover)", letterSpacing: ".1em" }}>
              MATRIX RANK
            </span>
            {[
              { label: "Rank",     value: `#${Math.round(matrixCompany.Company_Rank)}` },
              { label: "Score",    value: parseFloat(matrixCompany.Total_Final_Score).toFixed(1) },
              { label: "Template", value: matrixCompany.KPI_Template },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: MONO }}>{label}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Price chart ── */}
      {data.priceHistory?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <PriceChart history={data.priceHistory} currency={currency} />
        </div>
      )}

      {/* ── 2-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <AnalystSection analyst={data.analyst} quote={q} currency={currency} />
        <EarningsSection earnings={data.earnings} />
        <QuarterlyIncomeSection data={data.quarterlyIncome} currency={currency} />
        <CashflowSection data={data.quarterlyCashflow} currency={currency} />
        <KeyMetricsSection
          valuation={data.valuation}
          profitability={data.profitability}
          financials={data.financials}
          currency={currency}
        />
        <OwnershipSection ownership={data.ownership} />
      </div>

      {/* ── Full-width sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DividendSection dividends={data.dividends} currency={currency} />
        <ProfileSection profile={data.profile} />
      </div>
    </div>
  );
}

// routes/company.js
//
// GET /company/isin/:isin     — lookup by ISIN (most reliable; no symbol needed)
// GET /company/:symbol        — real-time quote (price, market cap, P/E, etc.)
// GET /company/:symbol/summary — fundamentals (financials, key stats, profile)
// GET /company/:symbol/history — OHLCV history (?from=YYYY-MM-DD&to=YYYY-MM-DD)

const express = require("express");
const YahooFinance = require("yahoo-finance2").default;

const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

// Merge two fundamentalsTimeSeries arrays (revenue + netIncome) into one array
// keyed by date, sorted chronologically.
function mergeSeries(revenueArr, netIncomeArr) {
  const map = {};
  const toKey = r => {
    if (!r?.asOfDate) return null;
    return r.asOfDate instanceof Date
      ? r.asOfDate.toISOString().slice(0, 10)
      : String(r.asOfDate).slice(0, 10);
  };
  (revenueArr || []).forEach(r => {
    const d = toKey(r); if (!d) return;
    map[d] = map[d] || { date: d };
    map[d].revenue = r.reportedValue ?? null;
  });
  (netIncomeArr || []).forEach(r => {
    const d = toKey(r); if (!d) return;
    map[d] = map[d] || { date: d };
    map[d].netIncome = r.reportedValue ?? null;
  });
  return Object.values(map).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Resolve a Yahoo Finance symbol from an ISIN using the search endpoint.
// Prefers NSE (exchange "NSI") over BSE for Indian equities.
async function symbolFromIsin(isin) {
  const result = await yf.search(isin);
  const equities = (result.quotes || []).filter(q => q.quoteType === "EQUITY");
  if (!equities.length) throw new Error(`No equity found for ISIN ${isin}`);
  const nse = equities.find(q => q.exchange === "NSI");
  return (nse || equities[0]).symbol;
}

// Resolve symbol: try NSE first, fall back to BSE if price is missing.
async function resolveQuote(raw) {
  const upper = raw.toUpperCase();
  if (upper.includes(".")) return yf.quote(upper);
  const nse = await yf.quote(`${upper}.NS`);
  if (nse.regularMarketPrice != null) return nse;
  return yf.quote(`${upper}.BO`);
}

function buildQuotePayload(q) {
  return {
    symbol: q.symbol,
    shortName: q.shortName,
    longName: q.longName,
    exchange: q.fullExchangeName,
    currency: q.currency,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePct: q.regularMarketChangePercent,
    open: q.regularMarketOpen,
    high: q.regularMarketDayHigh,
    low: q.regularMarketDayLow,
    previousClose: q.regularMarketPreviousClose,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    peRatio: q.trailingPE,
    eps: q.epsTrailingTwelveMonths,
    week52High: q.fiftyTwoWeekHigh,
    week52Low: q.fiftyTwoWeekLow,
    fiftyDayAvg: q.fiftyDayAverage,
    twoHundredDayAvg: q.twoHundredDayAverage,
    dividendYield: q.dividendYield,
    marketState: q.marketState,
  };
}

// GET /company/isin/:isin
// Looks up the Yahoo Finance symbol via ISIN search, then returns a real-time quote.
// More reliable than symbol-based lookup — works even when the NSE ticker is unknown.
router.get("/company/isin/:isin", requireAuth, async (req, res) => {
  try {
    const symbol = await symbolFromIsin(req.params.isin);
    const q = await yf.quote(symbol);
    res.json(buildQuotePayload(q));
  } catch (err) {
    const status = err.message?.includes("No equity found") ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /company/:symbol
// Returns a real-time snapshot: price, change, market cap, P/E, 52-week range, etc.
router.get("/company/:symbol", requireAuth, async (req, res) => {
  try {
    const q = await resolveQuote(req.params.symbol);
    res.json(buildQuotePayload(q));
  } catch (err) {
    const status = err.message?.includes("No fundamentals data") ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /company/:symbol/summary
// Returns deeper fundamentals: revenue, margins, debt, key stats, company profile.
router.get("/company/:symbol/summary", requireAuth, async (req, res) => {
  const raw = req.params.symbol.toUpperCase();
  const symbol = raw.includes(".") ? raw : `${raw}.NS`;
  try {
    const data = await yf.quoteSummary(symbol, {
      modules: [
        "assetProfile",       // sector, industry, description, employees
        "summaryDetail",      // P/E, P/B, dividend, beta, market cap
        "financialData",      // revenue, margins, debt, cash, ROE, ROA
        "defaultKeyStatistics", // EV, EV/EBITDA, short ratio, insider %
      ],
    });

    const p = data.assetProfile || {};
    const s = data.summaryDetail || {};
    const f = data.financialData || {};
    const k = data.defaultKeyStatistics || {};

    res.json({
      symbol,
      profile: {
        sector: p.sector,
        industry: p.industry,
        description: p.longBusinessSummary,
        employees: p.fullTimeEmployees,
        website: p.website,
        country: p.country,
      },
      valuation: {
        marketCap: s.marketCap,
        enterpriseValue: k.enterpriseValue,
        peRatio: s.trailingPE,
        forwardPE: s.forwardPE,
        pbRatio: s.priceToBook,
        evToEbitda: k.enterpriseToEbitda,
        evToRevenue: k.enterpriseToRevenue,
        pegRatio: k.pegRatio,
        beta: s.beta,
      },
      dividends: {
        yield: s.dividendYield,
        rate: s.dividendRate,
        payoutRatio: s.payoutRatio,
        exDate: s.exDividendDate,
      },
      financials: {
        totalRevenue: f.totalRevenue,
        revenueGrowth: f.revenueGrowth,
        grossMargin: f.grossMargins,
        operatingMargin: f.operatingMargins,
        profitMargin: f.profitMargins,
        ebitda: f.ebitda,
        totalDebt: f.totalDebt,
        totalCash: f.totalCash,
        debtToEquity: f.debtToEquity,
        returnOnEquity: f.returnOnEquity,
        returnOnAssets: f.returnOnAssets,
        freeCashflow: f.freeCashflow,
      },
      ownership: {
        insiderPercent: k.heldPercentInsiders,
        institutionPercent: k.heldPercentInstitutions,
        floatShares: k.floatShares,
        sharesOutstanding: k.sharesOutstanding,
      },
    });
  } catch (err) {
    const status = err.message?.includes("No fundamentals data") ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /company/:symbol/history?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=1d
// Returns OHLCV history. Defaults: last 1 year, daily intervals.
router.get("/company/:symbol/history", requireAuth, async (req, res) => {
  const raw = req.params.symbol.toUpperCase();
  const symbol = raw.includes(".") ? raw : `${raw}.NS`;
  const to = req.query.to || new Date().toISOString().slice(0, 10);
  const from =
    req.query.from ||
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const interval = ["1d", "1wk", "1mo"].includes(req.query.interval)
    ? req.query.interval
    : "1d";

  try {
    const rows = await yf.historical(symbol, {
      period1: from,
      period2: to,
      interval,
    });
    res.json({ symbol, from, to, interval, count: rows.length, data: rows });
  } catch (err) {
    const status = err.message?.includes("No fundamentals data") ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /company/:symbol/full
// All-in-one endpoint for the Company Detail page.
// Fetches quote + full quoteSummary (earnings, analyst, quarterly financials) + 1Y price history.
router.get("/company/:symbol/full", requireAuth, async (req, res) => {
  const raw = req.params.symbol.toUpperCase();
  const symbol = raw.includes(".") ? raw : `${raw}.NS`;

  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today   = new Date().toISOString().slice(0, 10);

  const [quoteRes, summaryRes, chartRes, tsRes, signalRes] = await Promise.allSettled([
    yf.quote(symbol),
    yf.quoteSummary(symbol, {
      modules: [
        "assetProfile",
        "summaryDetail",
        "financialData",
        "defaultKeyStatistics",
        "earningsHistory",
        "earningsTrend",
        "recommendationTrend",
      ],
    }),
    // chart() replaces the deprecated historical() API.
    yf.chart(symbol, { period1: yearAgo, period2: today, interval: "1d" }),
    // fundamentalsTimeSeries replaces the deprecated quarterly/annual statement modules.
    yf.fundamentalsTimeSeries(symbol, {
      period1: "2020-01-01",
      period2: today,
      module: ["annualTotalRevenue", "annualNetIncome", "quarterlyTotalRevenue", "quarterlyNetIncome"],
    }),
    // Separate call so a missing module never breaks the core data above.
    yf.quoteSummary(symbol, {
      modules: [
        "insiderTransactions",
        "upgradeDowngradeHistory",
        "institutionOwnership",
      ],
    }),
  ]);

  if (quoteRes.status === "rejected" && summaryRes.status === "rejected") {
    return res.status(502).json({ error: "Could not fetch company data from Yahoo Finance" });
  }

  const q         = quoteRes.status   === "fulfilled" ? quoteRes.value   : null;
  const s         = summaryRes.status === "fulfilled" ? summaryRes.value : {};
  const chartData = chartRes.status   === "fulfilled" ? chartRes.value   : null;
  const ts        = tsRes.status      === "fulfilled" ? tsRes.value      : {};
  const sig       = signalRes.status  === "fulfilled" ? signalRes.value  : {};

  const it  = sig.insiderTransactions  || {};
  const udh = sig.upgradeDowngradeHistory || {};
  const io  = sig.institutionOwnership || {};

  const ap  = s.assetProfile                      || {};
  const sd  = s.summaryDetail                     || {};
  const f   = s.financialData                     || {};
  const k   = s.defaultKeyStatistics              || {};
  const eh  = s.earningsHistory                   || {};
  const et  = s.earningsTrend                     || {};
  const rt  = s.recommendationTrend               || {};

  res.json({
    symbol,
    quote: q ? buildQuotePayload(q) : null,
    profile: {
      sector:      ap.sector              ?? null,
      industry:    ap.industry            ?? null,
      description: ap.longBusinessSummary ?? null,
      employees:   ap.fullTimeEmployees   ?? null,
      website:     ap.website             ?? null,
      country:     ap.country             ?? null,
    },
    valuation: {
      marketCap:       sd.marketCap         ?? null,
      enterpriseValue: k.enterpriseValue     ?? null,
      peRatio:         sd.trailingPE         ?? null,
      forwardPE:       sd.forwardPE          ?? null,
      pbRatio:         sd.priceToBook        ?? null,
      evToEbitda:      k.enterpriseToEbitda  ?? null,
      evToRevenue:     k.enterpriseToRevenue ?? null,
      pegRatio:        k.pegRatio            ?? null,
      beta:            sd.beta               ?? null,
    },
    profitability: {
      grossMargin:     f.grossMargins   ?? null,
      operatingMargin: f.operatingMargins ?? null,
      profitMargin:    f.profitMargins  ?? null,
      returnOnEquity:  f.returnOnEquity ?? null,
      returnOnAssets:  f.returnOnAssets ?? null,
    },
    financials: {
      totalRevenue:  f.totalRevenue  ?? null,
      revenueGrowth: f.revenueGrowth ?? null,
      ebitda:        f.ebitda        ?? null,
      totalDebt:     f.totalDebt     ?? null,
      totalCash:     f.totalCash     ?? null,
      debtToEquity:  f.debtToEquity  ?? null,
      freeCashflow:  f.freeCashflow  ?? null,
    },
    dividends: {
      yield:       sd.dividendYield  ?? null,
      rate:        sd.dividendRate   ?? null,
      payoutRatio: sd.payoutRatio    ?? null,
      exDate:      sd.exDividendDate ?? null,
    },
    analyst: {
      targetHigh:        f.targetHighPrice         ?? null,
      targetLow:         f.targetLowPrice          ?? null,
      targetMean:        f.targetMeanPrice         ?? null,
      targetMedian:      f.targetMedianPrice       ?? null,
      recommendationKey: f.recommendationKey       ?? null,
      numberOfAnalysts:  f.numberOfAnalystOpinions ?? null,
      trend: (rt.trend || []).slice(0, 3).map(t => ({
        period:     t.period,
        strongBuy:  t.strongBuy  ?? 0,
        buy:        t.buy        ?? 0,
        hold:       t.hold       ?? 0,
        sell:       t.sell       ?? 0,
        strongSell: t.strongSell ?? 0,
      })),
    },
    earnings: {
      history: [...(eh.history || [])].reverse().map(e => ({
        date:            e.quarter,
        epsActual:       e.epsActual       ?? null,
        epsEstimate:     e.epsEstimate     ?? null,
        surprisePercent: e.surprisePercent ?? null,
      })),
      trend: (et.trend || []).slice(0, 4).map(t => ({
        period:          t.period,
        endDate:         t.endDate,
        epsEstimate:     t.earningsEstimate?.avg  ?? null,
        revenueEstimate: t.revenueEstimate?.avg   ?? null,
      })),
    },
    quarterlyIncome: mergeSeries(ts.quarterlyTotalRevenue, ts.quarterlyNetIncome),
    annualIncome:    mergeSeries(ts.annualTotalRevenue,    ts.annualNetIncome),
    ownership: {
      insiderPercent:     k.heldPercentInsiders     ?? null,
      institutionPercent: k.heldPercentInstitutions ?? null,
      floatShares:        k.floatShares             ?? null,
      sharesOutstanding:  k.sharesOutstanding       ?? null,
      shortRatio:         k.shortRatio              ?? null,
    },
    priceHistory: (chartData?.quotes || []).map(r => ({
      date:   r.date,
      close:  r.close,
      open:   r.open,
      high:   r.high,
      low:    r.low,
      volume: r.volume,
    })),
    insiderTransactions: (it.transactions || []).slice(0, 15).map(t => ({
      name:     t.filerName      ?? null,
      relation: t.filerRelation  ?? null,
      text:     t.transactionText ?? null,
      shares:   t.shares         ?? null,
      value:    t.value          ?? null,
      date:     t.startDate      ?? null,
    })),
    analystActions: (udh.history || []).slice(0, 12).map(h => ({
      firm:      h.firm      ?? null,
      toGrade:   h.toGrade   ?? null,
      fromGrade: h.fromGrade ?? null,
      action:    h.action    ?? null,
      date: typeof h.epochGradeDate === "number"
        ? new Date(h.epochGradeDate * 1000)
        : (h.epochGradeDate ?? null),
    })),
    topInstitutions: (io.ownershipList || []).slice(0, 10).map(o => ({
      name:       o.organization ?? null,
      pctHeld:    o.pctHeld      ?? null,
      shares:     o.position     ?? null,
      pctChange:  o.pctChange    ?? null,
      reportDate: o.reportDate   ?? null,
    })),
  });
});

module.exports = router;

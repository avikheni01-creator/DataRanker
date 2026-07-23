import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { apiFetch, apiUrl, getAuthHeaders } from "../api";
import { getUser } from "../auth";
import { saveResult } from "../lib/resultStore";
import { colors, fonts, radius, glassCss, shadow } from "../theme";
import { useAppConfig } from "../AppConfigContext";
import FilterInput from "../components/FilterInput";

// ── Filter DSL ────────────────────────────────────────────────────────────────
// Supports: "Col > 15 AND Sector = Banks AND Debt/Equity < 1"
// Returns filtered rows, or null if the expression fails to parse.
function applyFilter(rows, expr) {
  const trimmed = expr.trim();
  if (!trimmed) return rows;

  const parts = trimmed.split(/\bAND\b/i).map((s) => s.trim()).filter(Boolean);
  const conditions = parts.map((cond) => {
    const m = cond.match(/^(.+?)\s*(>=|<=|!=|contains|>|<|=)\s*(.+)$/i);
    if (!m) return null;
    const col = m[1].trim();
    const op = m[2].toLowerCase();
    const raw = m[3].trim();
    const num = parseFloat(raw);
    const isNum = !Number.isNaN(num) && raw !== "";
    return { col, op, raw, num, isNum };
  });

  if (conditions.some((c) => c === null)) return null;

  return rows.filter((row) =>
    conditions.every(({ col, op, raw, num, isNum }) => {
      const cell = row[col];
      if (cell === null || cell === undefined) return op === "!=" ? true : false;
      if (isNum && typeof cell === "number") {
        if (op === ">") return cell > num;
        if (op === "<") return cell < num;
        if (op === ">=") return cell >= num;
        if (op === "<=") return cell <= num;
        if (op === "=") return cell === num;
        if (op === "!=") return cell !== num;
      }
      const sc = String(cell).toLowerCase();
      const sv = raw.toLowerCase();
      if (op === "contains") return sc.includes(sv);
      if (op === "=") return sc.includes(sv);
      if (op === "!=") return !sc.includes(sv);
      if (op === ">") return sc > sv;
      if (op === "<") return sc < sv;
      if (op === ">=") return sc >= sv;
      if (op === "<=") return sc <= sv;
      return true;
    })
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rowsToCsv(columns, rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    columns.map(esc).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function isNumericValue(v) {
  if (typeof v === "number") return true;
  if (v === null || v === undefined || v === "") return false;
  const s = String(v).trim();
  return s !== "" && !isNaN(Number(s));
}

// ── Column Picker ─────────────────────────────────────────────────────────────
function ColPicker({ allCols, selectedCols, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search.trim()
    ? allCols.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : allCols;

  const allSelected = selectedCols.size === allCols.length;
  const noneSelected = selectedCols.size === 0;

  const toggle = (col) => {
    const next = new Set(selectedCols);
    next.has(col) ? next.delete(col) : next.add(col);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(allCols));
  const selectNone = () => onChange(new Set());
  const badge = !allSelected ? ` (${selectedCols.size}/${allCols.length})` : "";

  return (
    <div className="cp-root" ref={ref}>
      <button
        className={`sp-btn secondary cp-trigger${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        Columns{badge}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 2, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="cp-panel" role="listbox" aria-multiselectable="true">
          <div className="cp-search-wrap">
            <svg className="cp-search-icon" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="cp-search"
              type="text"
              placeholder="Search columns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="cp-search-clear" onClick={() => setSearch("")}>×</button>
            )}
          </div>

          <div className="cp-controls">
            <button className="cp-ctrl-btn" onClick={selectAll} disabled={allSelected}>All</button>
            <button className="cp-ctrl-btn" onClick={selectNone} disabled={noneSelected}>None</button>
            <span className="cp-ctrl-count">{selectedCols.size} selected</span>
          </div>

          <div className="cp-list">
            {filtered.length === 0 && (
              <span className="cp-no-match">No columns match</span>
            )}
            {filtered.map((col) => (
              <label key={col} className="cp-item">
                <input
                  type="checkbox"
                  className="cp-checkbox"
                  checked={selectedCols.has(col)}
                  onChange={() => toggle(col)}
                />
                <span className="cp-label">{col}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScreenerPage() {
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = !!user.isAdmin;
  const { screenerMaxRows, screenerEnabled } = useAppConfig();

  const [snapshot, setSnapshot] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterExpr, setFilterExpr] = useState("");
  const [filterError, setFilterError] = useState("");
  const [filterHistory, setFilterHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("screener_filter_history")) || []; } catch { return []; }
  });
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("screener_presets")) || []; } catch { return []; }
  });
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedCols, setSelectedCols] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [pipelineError, setPipelineError] = useState("");
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminMsg, setAdminMsg] = useState({ text: "", isError: false });
  // Sort
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  // Download dropdown
  const [showDownloads, setShowDownloads] = useState(false);
  // Drag-and-drop upload
  const [dragOver, setDragOver] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const fileInputRef = useRef(null);
  const searchRef = useRef(null);
  const downloadsRef = useRef(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const { snapshot: snap } = await apiFetch("/screener");
      setSnapshot(snap);
      if (snap) setSelectedCols(new Set(snap.columns));
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  useEffect(() => {
    apiFetch("/column-mapping").then(setColumnMapping).catch(() => {});
  }, []);

  // Close downloads dropdown on outside click
  useEffect(() => {
    if (!showDownloads) return;
    const handler = (e) => {
      if (downloadsRef.current && !downloadsRef.current.contains(e.target)) setShowDownloads(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDownloads]);

  // Rows after applying the DSL filter
  const filteredRows = useMemo(() => {
    if (!snapshot) return [];
    if (!filterExpr.trim()) { setFilterError(""); return snapshot.rows; }
    const result = applyFilter(snapshot.rows, filterExpr);
    if (result === null) {
      setFilterError('Invalid query. Example: "ROE > 15 AND Sector = Banks AND Debt/Equity < 1"');
      return snapshot.rows;
    }
    setFilterError("");
    return result;
  }, [snapshot, filterExpr]);

  // Save successful filter expressions to history (debounced 1.5 s)
  useEffect(() => {
    if (!filterExpr.trim() || filterError) return;
    const t = setTimeout(() => {
      setFilterHistory(prev => {
        const next = [filterExpr, ...prev.filter(h => h !== filterExpr)].slice(0, 6);
        localStorage.setItem("screener_filter_history", JSON.stringify(next));
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [filterExpr, filterError]);

  // Quick search on top of DSL filter
  const searchedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !snapshot) return filteredRows;
    const searchCols = snapshot.columns.filter((c) => /name|symbol|ticker/i.test(c));
    const targets = searchCols.length > 0 ? searchCols : snapshot.columns;
    return filteredRows.filter((row) =>
      targets.some((col) => {
        const v = row[col];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      })
    );
  }, [filteredRows, searchQuery, snapshot]);

  // Sort on top of search
  const sortedRows = useMemo(() => {
    if (!sortCol) return searchedRows;
    return [...searchedRows].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return sortDir === "asc" ? an - bn : bn - an;
      const as = String(av).toLowerCase(), bs = String(bv).toLowerCase();
      if (sortDir === "asc") return as < bs ? -1 : as > bs ? 1 : 0;
      return bs < as ? -1 : bs > as ? 1 : 0;
    });
  }, [searchedRows, sortCol, sortDir]);

  // Reset to page 1 on filter/search/pageSize change
  useEffect(() => { setPage(1); }, [searchedRows, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(searchedRows.length / pageSize));

  const visibleCols = useMemo(
    () => (snapshot ? snapshot.columns.filter((c) => selectedCols.has(c)) : []),
    [snapshot, selectedCols]
  );

  // Determine which visible columns contain numeric data (sample first 20 rows)
  const numericCols = useMemo(() => {
    if (!snapshot || !visibleCols.length) return new Set();
    const s = new Set();
    const sample = snapshot.rows.slice(0, 20);
    visibleCols.forEach((col) => {
      const row = sample.find((r) => r[col] != null);
      if (row && isNumericValue(row[col])) s.add(col);
    });
    return s;
  }, [snapshot, visibleCols]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!filterExpr.trim() || !name) return;
    const next = [{ name, expr: filterExpr }, ...presets.filter(p => p.name !== name)].slice(0, 8);
    setPresets(next);
    localStorage.setItem("screener_presets", JSON.stringify(next));
    setShowSavePreset(false);
    setPresetName("");
  };

  const deletePreset = (name) => {
    const next = presets.filter(p => p.name !== name);
    setPresets(next);
    localStorage.setItem("screener_presets", JSON.stringify(next));
  };

  // ── Admin upload (extracted so both button and drop can reuse it) ────────────
  const uploadFile = useCallback(async (file) => {
    setAdminUploading(true);
    setAdminMsg({ text: "", isError: false });
    try {
      const fd = new FormData();
      fd.append("screener_data", file);
      const res = await fetch(apiUrl("/admin/screener"), {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setAdminMsg({
        text: `Uploaded ${data.snapshot.rowCount} rows · ${data.snapshot.columnCount} columns · "${data.snapshot.fileName}"`,
        isError: false,
      });
      await loadSnapshot();
    } catch (err) {
      setAdminMsg({ text: err.message, isError: true });
    } finally {
      setAdminUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [loadSnapshot]);

  const handleAdminUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  // ── Pipeline ────────────────────────────────────────────────────────────────
  const handleRunPipeline = async () => {
    if (!searchedRows.length) return;
    setPipelineRunning(true);
    setPipelineStage(0);
    setPipelineError("");
    const rowsToSend = screenerMaxRows > 0 ? searchedRows.slice(0, screenerMaxRows) : searchedRows;
    try {
      setPipelineStage(1);
      const normalize = (s) => String(s).trim().toLowerCase();
      const cols = snapshot?.columns ?? Object.keys(rowsToSend[0] ?? {});
      const mapping = {};
      cols.forEach((col) => {
        const target = normalize(col);
        const outputKey = Object.keys(columnMapping).find((key) => {
          const aliases = Array.isArray(columnMapping[key]) ? columnMapping[key] : [columnMapping[key]];
          return normalize(key) === target || aliases.some((a) => normalize(a) === target);
        });
        if (outputKey && !mapping[outputKey]) mapping[outputKey] = col;
      });

      setPipelineStage(2);
      const res = await fetch(apiUrl("/screener/run-pipeline"), {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rows: rowsToSend, mapping }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Pipeline failed");
      }

      setPipelineStage(3);
      const blob = await res.blob();
      await saveResult(blob);
      navigate("/app/results");
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineRunning(false);
      setPipelineStage(0);
    }
  };

  // ── Downloads ───────────────────────────────────────────────────────────────
  const handleDownloadFiltered = () => {
    if (!snapshot || !searchedRows.length) return;
    const cols = visibleCols.length ? visibleCols : snapshot.columns;
    triggerDownload(
      new Blob([rowsToCsv(cols, searchedRows)], { type: "text/csv" }),
      "screener_filtered.csv"
    );
  };

  const handleDownloadFull = async () => {
    try {
      const res = await fetch(apiUrl("/screener/download"), { credentials: "include", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const nameMatch = cd.match(/filename="?([^"]+)"?/);
      triggerDownload(blob, nameMatch ? nameMatch[1] : "screener_data.csv");
    } catch (err) {
      setPipelineError(err.message);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const rowCount = snapshot ? snapshot.rows.length : 0;
  const uploadedDate = snapshot
    ? new Date(snapshot.uploadedAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "";
  const filterActive = !!filterExpr && !filterError;
  const filterBadgeText = filterExpr.length > 40 ? filterExpr.slice(0, 40) + "…" : filterExpr;

  if (screenerEnabled === false) return <Navigate to="/app/results" replace />;

  return (
    <div className="sp-wrap">
      <style>{CSS}</style>

      {/* Pipeline overlay */}
      {pipelineRunning && (() => {
        const STAGES = [
          { label: "Preparing data",    sub: `${(screenerMaxRows > 0 ? Math.min(searchedRows.length, screenerMaxRows) : searchedRows.length)} companies queued` },
          { label: "Mapping columns",   sub: "Matching schema aliases" },
          { label: "Ranking companies", sub: "Scoring against KPI templates" },
          { label: "Saving results",    sub: "Writing to local storage" },
        ];
        const pct = Math.round(((pipelineStage + 1) / STAGES.length) * 100);
        return (
          <div className="sp-pipeline-overlay" role="dialog" aria-modal="true" aria-label="Pipeline running">
            <div className="sp-pipeline-overlay-box">
              <span className="sp-spinner sp-spinner-lg" aria-hidden="true" />
              <span className="sp-pipeline-overlay-text">{STAGES[pipelineStage]?.label ?? "Processing…"}</span>
              <span className="sp-pipeline-overlay-sub">{STAGES[pipelineStage]?.sub}</span>
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden", marginTop: 4 }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: "linear-gradient(90deg,var(--accent),var(--positive))",
                  width: `${pct}%`, transition: "width .4s ease",
                }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                {STAGES.map((s, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: i <= pipelineStage ? "var(--accent)" : "var(--border)",
                      transition: "background .3s",
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Page header ── */}
      <div className="sp-header">
        <div className="sp-header-left">
          <h1 className="sp-title">Screener</h1>
          {snapshot && (
            <p className="sp-meta">
              {rowCount.toLocaleString()} companies · Updated {uploadedDate} · {snapshot.fileName}
            </p>
          )}
        </div>

        {/* Admin upload - with drag-and-drop */}
        {isAdmin && (
          <div
            className={`sp-admin${dragOver ? " sp-admin-drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label className={`sp-upload-btn${adminUploading ? " loading" : ""}${dragOver ? " drag-active" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleAdminUpload}
                disabled={adminUploading}
                style={{ display: "none" }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {adminUploading ? "Uploading…" : dragOver ? "Drop to upload" : "Upload daily data"}
            </label>
            {adminMsg.text && (
              <span className={`sp-admin-msg${adminMsg.isError ? " error" : ""}`}>
                {adminMsg.text}
              </span>
            )}
            {!adminUploading && !dragOver && (
              <span className="sp-admin-hint">or drag & drop CSV / Excel</span>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="sp-content">
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, color: "var(--text-muted)", fontSize: 13 }}>
            Loading…
          </div>
        )}

        {/* Empty state */}
        {!loading && !snapshot && (
          <div
            className={`sp-empty-state${isAdmin && dragOver ? " drag-over" : ""}`}
            onDragOver={isAdmin ? handleDragOver : undefined}
            onDragEnter={isAdmin ? handleDragOver : undefined}
            onDragLeave={isAdmin ? handleDragLeave : undefined}
            onDrop={isAdmin ? handleDrop : undefined}
          >
            <div className="sp-empty-icon">
              {isAdmin ? (dragOver ? "📂" : "📤") : "⏳"}
            </div>
            <div className="sp-empty-title">
              {isAdmin ? (dragOver ? "Drop to upload" : "No data uploaded yet") : "Awaiting today's data"}
            </div>
            <div className="sp-empty-desc">
              {isAdmin
                ? "Upload a daily CSV or Excel snapshot to give analysts access to the latest screener data. You can also drag & drop a file anywhere on this page."
                : "The admin hasn't uploaded today's screener snapshot yet. Check back shortly."}
            </div>
            {isAdmin && (
              <label className="sp-empty-upload-btn">
                Choose CSV / Excel
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleAdminUpload} disabled={adminUploading} style={{ display: "none" }} />
              </label>
            )}
          </div>
        )}

        {!loading && snapshot && (
          <>
            {/* ── Controls ── */}
            <div className={`sp-controls${filtersOpen ? "" : " sp-controls-collapsed"}`}>

              {filtersOpen && (<>
              {/* Saved preset chips */}
              {presets.length > 0 && (
                <div className="sp-presets-row">
                  <span className="sp-presets-label">Presets</span>
                  {presets.map(p => (
                    <div key={p.name} className="sp-preset-chip">
                      <button
                        className="sp-preset-chip-label"
                        onClick={() => { setFilterExpr(p.expr); setFilterError(""); }}
                        title={p.expr}
                      >{p.name}</button>
                      <button
                        className="sp-preset-chip-del"
                        onClick={() => deletePreset(p.name)}
                        aria-label={`Delete preset ${p.name}`}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Unified filter + search compound bar */}
              <div className="sp-fsbar-outer">
                <div className="sp-fsbar">
                  <div className="sp-filter-wrap">
                    <svg className="sp-filter-icon" width="15" height="15" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <FilterInput
                      className={`sp-filter-input${filterError ? " err" : filterActive ? " active" : ""}`}
                      placeholder="Filter: ROE > 15 AND Sector = Banks AND Debt/Equity < 1"
                      value={filterExpr}
                      onChange={setFilterExpr}
                      columns={snapshot?.columns ?? []}
                      snapshot={snapshot}
                      history={filterHistory}
                    />
                    {filterExpr && (
                      <button className="sp-inbar-clear" onClick={() => { setFilterExpr(""); setFilterError(""); }} aria-label="Clear filter">×</button>
                    )}
                  </div>

                  <div className="sp-bar-sep" />

                  <div className="sp-search-wrap">
                    <svg className="sp-search-icon" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      ref={searchRef}
                      className="sp-search-input"
                      type="text"
                      placeholder="Search name / symbol…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="sp-inbar-clear" onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }} aria-label="Clear search">×</button>
                    )}
                  </div>
                </div>

                {filterExpr && !filterError && (
                  <button
                    className={`sp-btn secondary${showSavePreset ? " active" : ""}`}
                    onClick={() => { setShowSavePreset(v => !v); setPresetName(""); }}
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Save preset
                  </button>
                )}
              </div>

              {/* Save preset inline form */}
              {showSavePreset && (
                <div className="sp-preset-form">
                  <input
                    className="sp-preset-name-input"
                    type="text"
                    placeholder="Preset name (e.g. Large-cap profitable)"
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") savePreset(); if (e.key === "Escape") setShowSavePreset(false); }}
                    autoFocus
                    maxLength={40}
                  />
                  <button className="sp-btn primary" onClick={savePreset} disabled={!presetName.trim()}>Save</button>
                  <button className="sp-btn secondary" onClick={() => setShowSavePreset(false)}>Cancel</button>
                </div>
              )}

              {filterError && <p className="sp-filter-error">{filterError}</p>}
              </>)}

              {/* Action bar */}
              <div className="sp-action-bar">
                <div className="sp-count-area">
                  <button
                    className="sp-filter-toggle"
                    onClick={() => setFiltersOpen(v => !v)}
                    title={filtersOpen ? "Collapse filters" : "Expand filters"}
                    aria-label={filtersOpen ? "Collapse filters" : "Expand filters"}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transition: "transform .2s", transform: filtersOpen ? "none" : "rotate(180deg)" }}>
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                    <span>Filter | Search</span>
                  </button>
                  <span className="sp-count">
                    {searchedRows.length === rowCount
                      ? `${rowCount.toLocaleString()} companies`
                      : `${searchedRows.length.toLocaleString()} of ${rowCount.toLocaleString()} companies`}
                  </span>
                  {/* Active filter badge */}
                  {filterActive && (
                    <div className="sp-filter-badge">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                      </svg>
                      <span className="sp-filter-badge-text">{filterBadgeText}</span>
                      <button
                        className="sp-filter-badge-clear"
                        onClick={() => { setFilterExpr(""); setFilterError(""); }}
                        aria-label="Clear filter"
                      >×</button>
                    </div>
                  )}
                </div>

                <div className="sp-actions">
                  <ColPicker
                    allCols={snapshot.columns}
                    selectedCols={selectedCols}
                    onChange={setSelectedCols}
                  />

                  {/* Download dropdown */}
                  <div className="sp-dl-root" ref={downloadsRef}>
                    <button
                      className={`sp-btn secondary${showDownloads ? " active" : ""}`}
                      onClick={() => setShowDownloads(v => !v)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: "transform .15s", transform: showDownloads ? "rotate(180deg)" : "none" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {showDownloads && (
                      <div className="sp-dl-panel">
                        <button
                          className="sp-dl-item"
                          onClick={() => { handleDownloadFiltered(); setShowDownloads(false); }}
                          disabled={!searchedRows.length || !visibleCols.length}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                          </svg>
                          <div>
                            <div className="sp-dl-item-label">Filtered CSV</div>
                            <div className="sp-dl-item-sub">{searchedRows.length.toLocaleString()} rows · visible columns</div>
                          </div>
                        </button>
                        <button
                          className="sp-dl-item"
                          onClick={() => { handleDownloadFull(); setShowDownloads(false); }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                          </svg>
                          <div>
                            <div className="sp-dl-item-label">Full snapshot</div>
                            <div className="sp-dl-item-sub">{rowCount.toLocaleString()} rows · original file</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    className="sp-btn primary"
                    onClick={handleRunPipeline}
                    disabled={pipelineRunning || !searchedRows.length}
                  >
                    {pipelineRunning ? (
                      <><span className="sp-spinner" />Running…</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        Run Pipeline
                      </>
                    )}
                  </button>
                </div>
              </div>

              {pipelineError && <p className="sp-pipeline-error">{pipelineError}</p>}
            </div>

            {/* ── Table + pagination ── */}
            <div className="sp-table-section">
              {visibleCols.length === 0 ? (
                <div className="sp-empty">
                  No columns selected - use the Columns picker to show data.
                </div>
              ) : (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        {visibleCols.map((col) => {
                          const isNum = numericCols.has(col);
                          const isSorted = sortCol === col;
                          return (
                            <th
                              key={col}
                              className={`sp-th-sortable${isSorted ? " sorted" : ""}`}
                              onClick={() => handleSort(col)}
                              aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                              style={isNum ? { textAlign: "right" } : undefined}
                            >
                              <span className="sp-th-inner">
                                {col}
                                <span className="sp-sort-icon">
                                  {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                                </span>
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, i) => (
                        <tr key={i}>
                          {visibleCols.map((col) => {
                            const val = row[col];
                            const isNum = numericCols.has(col);
                            return (
                              <td
                                key={col}
                                style={isNum ? { textAlign: "right" } : undefined}
                              >
                                {val === null || val === undefined ? "-" : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {visibleCols.length > 0 && (
                <div className="sp-pagination">
                  <span className="sp-page-info">
                    {searchedRows.length === 0
                      ? "No results"
                      : `${((page - 1) * pageSize + 1).toLocaleString()}–${Math.min(page * pageSize, searchedRows.length).toLocaleString()} of ${searchedRows.length.toLocaleString()}`}
                  </span>

                  <div className="sp-page-controls">
                    <button className="sp-page-btn" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page">«</button>
                    <button className="sp-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
                    <span className="sp-page-current">Page {page} of {totalPages}</span>
                    <button className="sp-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
                    <button className="sp-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last page">»</button>
                  </div>

                  <select
                    className="sp-page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Rows per page"
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
  .sp-wrap {
    height: 100%;
    display: flex; flex-direction: column; overflow: hidden;
    font-family: ${fonts.sans};
    color: ${colors.text};
  }

  /* ── Header ── */
  .sp-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
    padding: 14px 32px; flex-shrink: 0;
    border-bottom: 1px solid ${colors.border};
  }
  .sp-header-left { flex-shrink: 0; }
  .sp-title { font-size: 22px; font-weight: 700; margin: 0 0 2px; color: ${colors.text}; font-family: ${fonts.display}; }
  .sp-meta { margin: 0; font-size: 12px; color: ${colors.textMuted}; }

  /* ── Admin upload zone ── */
  .sp-admin {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 10px 14px; border-radius: ${radius.md};
    border: 1.5px dashed transparent;
    transition: border-color .2s, background .2s;
  }
  .sp-admin.sp-admin-drag-over {
    border-color: ${colors.accent};
    background: ${colors.accentSoft};
  }
  .sp-upload-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px;
    border-radius: ${radius.sm}; border: 1px solid ${colors.border};
    background: ${colors.elevated}; color: ${colors.text};
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
  }
  .sp-upload-btn:hover { background: ${colors.card}; border-color: ${colors.accent}; }
  .sp-upload-btn.loading { opacity: .6; cursor: wait; }
  .sp-upload-btn.drag-active {
    border-color: ${colors.accent}; background: ${colors.accentSoft};
    color: ${colors.accent};
  }
  .sp-admin-msg { font-size: 12px; color: ${colors.textSecondary}; max-width: 320px; }
  .sp-admin-msg.error { color: ${colors.negative}; }
  .sp-admin-hint { font-size: 11px; color: ${colors.textMuted}; white-space: nowrap; }

  /* ── Content area ── */
  .sp-content {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
  }

  /* ── Empty state ── */
  .sp-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 64px 32px; gap: 16px; min-height: 360px;
    border-radius: ${radius.lg}; transition: background .2s;
    margin: 24px 32px; border: 2px dashed transparent;
  }
  .sp-empty-state.drag-over {
    border-color: ${colors.accent};
    background: ${colors.accentSoft};
  }
  .sp-empty-icon { font-size: 36px; line-height: 1; }
  .sp-empty-title {
    font-family: ${fonts.display}; font-size: 20px; font-weight: 700; color: ${colors.text};
  }
  .sp-empty-desc {
    font-size: 14px; color: ${colors.textSecondary}; max-width: 420px; line-height: 1.65;
  }
  .sp-empty-upload-btn {
    margin-top: 4px; padding: 11px 28px; border-radius: 999px; color: #fff;
    font-size: 14px; font-weight: 600; cursor: pointer;
    background: linear-gradient(135deg,#10B981,#1E3A8A);
    box-shadow: 0 4px 18px rgba(16,185,129,.30);
    transition: filter .15s, transform .15s;
  }
  .sp-empty-upload-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }

  /* ── Controls card ── */
  .sp-controls {
    padding: 12px 32px 14px; flex-shrink: 0;
    display: flex; flex-direction: column; gap: 10px;
    border-bottom: 1px solid ${colors.border};
  }
  .sp-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    text-align: center; color: ${colors.textMuted}; font-size: 15px;
  }
  .sp-table-section {
    flex: 1; display: flex; flex-direction: column; overflow: hidden;
    min-height: 0; padding: 12px 32px 16px;
  }

  /* Preset chips */
  .sp-presets-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sp-presets-label { font-size: 11px; color: ${colors.textMuted}; font-family: ${fonts.mono}; letter-spacing: .1em; flex-shrink: 0; }
  .sp-preset-chip { display: inline-flex; align-items: stretch; border-radius: 999px; overflow: hidden; border: 1px solid ${colors.border}; background: ${colors.elevated}; }
  .sp-preset-chip-label { padding: 4px 10px; font-size: 12px; font-weight: 500; color: ${colors.text}; background: none; border: none; cursor: pointer; transition: background .12s; }
  .sp-preset-chip-label:hover { background: ${colors.accentSoft}; color: ${colors.accent}; }
  .sp-preset-chip-del { padding: 4px 8px; font-size: 14px; color: ${colors.textMuted}; background: none; border: none; border-left: 1px solid ${colors.border}; cursor: pointer; line-height: 1; transition: all .12s; }
  .sp-preset-chip-del:hover { color: ${colors.negative}; background: ${colors.negativeSoft}; }

  /* Preset save form */
  .sp-preset-form { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sp-preset-name-input {
    flex: 1; min-width: 200px; padding: 9px 14px;
    border-radius: ${radius.sm}; border: 1px solid ${colors.accent};
    background: ${colors.inset}; color: ${colors.text};
    font-size: 13px; font-family: ${fonts.sans}; outline: none;
    box-shadow: 0 0 0 3px ${colors.accentSoft};
  }

  /* Compound filter + search bar */
  .sp-fsbar-outer { display: flex; align-items: center; gap: 8px; }
  .sp-fsbar {
    flex: 1; display: flex; align-items: center; min-width: 0;
    border: 1px solid ${colors.border}; border-radius: ${radius.sm};
    background: ${colors.inset};
    transition: border-color .15s, box-shadow .15s;
  }
  .sp-fsbar:focus-within {
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px ${colors.accentSoft};
  }
  .sp-fsbar.err { border-color: ${colors.negative}; }

  .sp-filter-wrap { position: relative; display: flex; align-items: center; flex: 1; min-width: 0; }
  .sp-filter-icon { position: absolute; left: 13px; color: ${colors.textMuted}; pointer-events: none; z-index: 1; }
  .sp-filter-input {
    width: 100%; padding: 11px 34px 11px 40px;
    border: none; background: transparent; color: ${colors.text};
    font-size: 13px; font-family: ${fonts.sans}; outline: none;
  }
  .sp-filter-input::placeholder { color: ${colors.textMuted}; }
  .sp-filter-input.err { color: ${colors.negative}; }

  .sp-bar-sep { width: 1px; height: 20px; background: ${colors.border}; flex-shrink: 0; margin: 0 2px; }

  .sp-search-wrap { position: relative; display: flex; align-items: center; width: 220px; flex-shrink: 0; }
  .sp-search-icon { position: absolute; left: 11px; color: ${colors.textMuted}; pointer-events: none; }
  .sp-search-input {
    width: 100%; padding: 11px 30px 11px 32px;
    border: none; background: transparent; color: ${colors.text};
    font-size: 13px; font-family: ${fonts.sans}; outline: none;
  }
  .sp-search-input::placeholder { color: ${colors.textMuted}; }

  .sp-inbar-clear {
    position: absolute; right: 8px; background: none; border: none;
    color: ${colors.textMuted}; font-size: 16px; cursor: pointer;
    padding: 3px 5px; line-height: 1; border-radius: 4px; transition: color .12s;
  }
  .sp-inbar-clear:hover { color: ${colors.text}; }
  .sp-filter-error { margin: 0; font-size: 12px; color: ${colors.negative}; }

  /* Filter toggle button */
  .sp-filter-toggle {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 12px; height: 32px; flex-shrink: 0;
    border-radius: 6px; border: 1px solid ${colors.border};
    background: ${colors.elevated}; color: ${colors.textMuted};
    cursor: pointer; transition: all .15s;
    font-size: 12px; font-weight: 500; font-family: ${fonts.sans};
    white-space: nowrap;
  }
  .sp-filter-toggle:hover { background: ${colors.card}; color: ${colors.text}; border-color: ${colors.accent}; }

  /* Collapsed controls */
  .sp-controls-collapsed { padding-top: 8px; padding-bottom: 8px; }

  /* Action bar */
  .sp-action-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; padding-bottom: 10px;
  }
  .sp-count-area { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
  .sp-count { font-size: 13px; color: ${colors.textMuted}; font-variant-numeric: tabular-nums; white-space: nowrap; }

  /* Active filter badge */
  .sp-filter-badge {
    display: inline-flex; align-items: center; gap: 6px; max-width: 320px;
    padding: 3px 4px 3px 8px; border-radius: 999px;
    background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.30);
    color: ${colors.accent}; font-size: 11px; font-weight: 500;
    font-family: ${fonts.mono}; overflow: hidden;
  }
  .sp-filter-badge-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .sp-filter-badge-clear {
    flex-shrink: 0; background: none; border: none; cursor: pointer;
    color: ${colors.accent}; font-size: 14px; line-height: 1; padding: 1px 4px;
    border-radius: 999px; transition: background .12s;
  }
  .sp-filter-badge-clear:hover { background: rgba(16,185,129,.2); }

  .sp-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

  /* Buttons */
  .sp-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
    border-radius: ${radius.sm}; border: none; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .15s; white-space: nowrap; font-family: ${fonts.sans};
  }
  .sp-btn:disabled { opacity: .45; cursor: not-allowed; }
  .sp-btn.secondary {
    background: ${colors.elevated}; border: 1px solid ${colors.border}; color: ${colors.textSecondary};
  }
  .sp-btn.secondary:hover:not(:disabled) { background: ${colors.card}; color: ${colors.text}; }
  .sp-btn.secondary.active { border-color: ${colors.accent}; color: ${colors.accent}; background: ${colors.accentSoft}; }
  .sp-btn.primary {
    background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDeep} 100%);
    color: #fff; box-shadow: ${shadow.glow};
  }
  .sp-btn.primary:hover:not(:disabled) {
    filter: brightness(1.08); transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(16,185,129,.4);
  }

  /* Download dropdown */
  .sp-dl-root { position: relative; }
  .sp-dl-panel {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
    width: 230px; border-radius: ${radius.md};
    border: 1px solid ${colors.border};
    ${glassCss}
    box-shadow: ${shadow.elevated};
    overflow: hidden;
  }
  .sp-dl-item {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; background: none; border: none;
    border-bottom: 1px solid ${colors.borderSubtle};
    cursor: pointer; text-align: left; transition: background .12s; color: ${colors.text};
  }
  .sp-dl-item:last-child { border-bottom: none; }
  .sp-dl-item:hover:not(:disabled) { background: ${colors.inset}; }
  .sp-dl-item:disabled { opacity: .4; cursor: not-allowed; }
  .sp-dl-item svg { flex-shrink: 0; color: ${colors.textMuted}; }
  .sp-dl-item-label { font-size: 13px; font-weight: 600; color: ${colors.text}; }
  .sp-dl-item-sub { font-size: 11px; color: ${colors.textMuted}; margin-top: 1px; font-variant-numeric: tabular-nums; }

  /* Spinner */
  .sp-spinner {
    display: inline-block; width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: sp-spin .7s linear infinite;
  }
  .sp-spinner-lg {
    width: 40px; height: 40px; border-width: 3px;
    border-color: var(--accent-soft); border-top-color: var(--accent);
  }
  @keyframes sp-spin { to { transform: rotate(360deg); } }

  /* Pipeline overlay */
  .sp-pipeline-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
  }
  .sp-pipeline-overlay-box {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 36px 48px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .sp-pipeline-overlay-text { font-size: 16px; font-weight: 600; color: var(--text-primary); }
  .sp-pipeline-overlay-sub { font-size: 12px; color: var(--text-secondary); }

  .sp-pipeline-error {
    margin: 0; padding: 10px 14px; border-radius: ${radius.sm};
    background: ${colors.negativeSoft}; color: ${colors.negative}; font-size: 13px;
  }

  /* Column picker */
  .cp-root { position: relative; }
  .cp-trigger { gap: 6px; }
  .cp-panel {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
    width: 260px; border-radius: ${radius.md};
    border: 1px solid ${colors.border};
    ${glassCss}
    box-shadow: ${shadow.elevated};
    display: flex; flex-direction: column; overflow: hidden;
  }
  .cp-search-wrap {
    position: relative; display: flex; align-items: center;
    border-bottom: 1px solid ${colors.borderSubtle};
  }
  .cp-search-icon { position: absolute; left: 12px; color: ${colors.textMuted}; pointer-events: none; }
  .cp-search {
    width: 100%; padding: 10px 32px 10px 34px;
    background: transparent; border: none; outline: none;
    color: ${colors.text}; font-size: 13px; font-family: ${fonts.sans};
  }
  .cp-search::placeholder { color: ${colors.textMuted}; }
  .cp-search-clear {
    position: absolute; right: 8px; background: none; border: none;
    color: ${colors.textMuted}; font-size: 16px; cursor: pointer;
    padding: 2px 4px; border-radius: 3px; line-height: 1;
  }
  .cp-search-clear:hover { color: ${colors.text}; }
  .cp-controls {
    display: flex; align-items: center; gap: 6px; padding: 8px 12px;
    border-bottom: 1px solid ${colors.borderSubtle};
  }
  .cp-ctrl-btn {
    padding: 3px 10px; border-radius: 6px; border: 1px solid ${colors.border};
    background: ${colors.elevated}; color: ${colors.textSecondary};
    font-size: 11px; font-weight: 600; cursor: pointer; transition: all .12s;
  }
  .cp-ctrl-btn:hover:not(:disabled) { background: ${colors.card}; color: ${colors.text}; }
  .cp-ctrl-btn:disabled { opacity: .4; cursor: default; }
  .cp-ctrl-count { margin-left: auto; font-size: 11px; color: ${colors.textMuted}; }
  .cp-list { overflow-y: auto; max-height: 280px; padding: 6px 0; }
  .cp-no-match { display: block; padding: 10px 14px; font-size: 12px; color: ${colors.textMuted}; }
  .cp-item {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 14px; cursor: pointer; transition: background .1s;
  }
  .cp-item:hover { background: ${colors.inset}; }
  .cp-checkbox { width: 14px; height: 14px; accent-color: ${colors.accent}; cursor: pointer; flex-shrink: 0; }
  .cp-label { font-size: 13px; color: ${colors.textSecondary}; user-select: none; }
  .cp-item:hover .cp-label { color: ${colors.text}; }

  /* Table */
  .sp-table-wrap {
    flex: 1; overflow: auto; min-height: 0;
    border-radius: ${radius.md}; border: 1px solid ${colors.border}; ${glassCss}
  }
  .sp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
  .sp-table thead { position: sticky; top: 0; z-index: 2; }

  /* Sortable headers */
  .sp-th-sortable {
    padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: ${colors.textMuted};
    background: ${colors.canvas}; border-bottom: 2px solid ${colors.border};
    white-space: nowrap; cursor: pointer; user-select: none;
    transition: color .12s, background .12s;
  }
  .sp-th-sortable:hover { color: ${colors.text}; background: rgba(0,0,0,0.18); }
  .sp-th-sortable.sorted { color: ${colors.accent}; background: rgba(16,185,129,0.06); }
  .sp-th-inner { display: inline-flex; align-items: center; gap: 5px; }
  .sp-sort-icon {
    font-size: 10px; opacity: .25; transition: opacity .12s;
    font-style: normal;
  }
  .sp-th-sortable:hover .sp-sort-icon { opacity: .65; }
  .sp-th-sortable.sorted .sp-sort-icon { opacity: 1; color: ${colors.accent}; }

  .sp-table td {
    padding: 11px 14px; color: ${colors.textSecondary};
    border-bottom: 1px solid ${colors.borderSubtle}; font-variant-numeric: tabular-nums;
  }
  .sp-table tbody tr:last-child td { border-bottom: none; }
  // .sp-table tbody tr:nth-child(even) td { background: rgba(255,255,255,0.016); }
  // .sp-table tbody tr:hover td { background: ${colors.inset} !important; color: ${colors.text}; }

  /* Sticky first column */
  .sp-th-sortable:first-child {
    position: sticky; left: 0; z-index: 3;
    background: ${colors.canvas};
    max-width: 220px; border-right: 1px solid ${colors.border};
  }
  .sp-table td:first-child {
    position: sticky; left: 0; z-index: 1;
    background: ${colors.canvas}; max-width: 220px;
    overflow: hidden; text-overflow: ellipsis;
    border-right: 1px solid ${colors.border};
    color: ${colors.text}; font-weight: 600;
  }
  .sp-table tbody tr:hover td:first-child { background: ${colors.inset} !important; color: ${colors.accent}; }

  /* Pagination */
  .sp-pagination {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; flex-shrink: 0; padding-top: 12px;
  }
  .sp-page-info { font-size: 12px; color: ${colors.textMuted}; font-variant-numeric: tabular-nums; }
  .sp-page-controls { display: flex; align-items: center; gap: 4px; }
  .sp-page-btn {
    width: 30px; height: 30px; border-radius: 7px;
    border: 1px solid ${colors.border}; background: ${colors.elevated};
    color: ${colors.textSecondary}; font-size: 14px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: all .12s; line-height: 1;
  }
  .sp-page-btn:hover:not(:disabled) { background: ${colors.card}; color: ${colors.text}; border-color: ${colors.accent}; }
  .sp-page-btn:disabled { opacity: .35; cursor: default; }
  .sp-page-current { font-size: 12px; color: ${colors.textMuted}; padding: 0 8px; white-space: nowrap; }
  .sp-page-size {
    padding: 5px 8px; border-radius: 7px; border: 1px solid ${colors.border};
    background: ${colors.elevated}; color: ${colors.textSecondary};
    font-size: 12px; font-family: ${fonts.sans}; cursor: pointer; outline: none;
  }
  .sp-page-size:focus { border-color: ${colors.accent}; }

  @media (max-width: 640px) {
    .sp-wrap { overflow-x: hidden; }
    .sp-header { padding: 12px 16px; flex-direction: column; align-items: flex-start; gap: 8px; }
    .sp-controls { padding: 12px 16px 12px; }
    .sp-table-section { padding: 10px 8px 12px; }
    .sp-action-bar { flex-direction: column; align-items: flex-start; gap: 8px; }
    .sp-actions { flex-wrap: wrap; }
    .sp-fsbar { flex-direction: column; align-items: stretch; }
    .sp-bar-sep { width: 100%; height: 1px; margin: 0; }
    .sp-search-wrap { width: 100%; }
    .sp-table-wrap { border-radius: 8px; }
    .cp-panel { right: auto; left: 0; width: 240px; }
    .sp-dl-panel { right: auto; left: 0; }
    .sp-empty-state { margin: 16px; padding: 40px 20px; }
    .sp-filter-toggle span { display: none; }

    /* Compact table on mobile - tighter cells fit more columns */
    .sp-table { font-size: 11px; }
    .sp-th-sortable { padding: 7px 8px; font-size: 9.5px; }
    .sp-table td { padding: 7px 8px; }
  }
`;

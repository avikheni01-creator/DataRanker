import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { apiFetch, apiUrl, getAuthHeaders } from "../api";
import { getUser } from "../auth";
import { saveResult } from "../lib/resultStore";
import { colors, fonts, radius, glassCss, shadow } from "../theme";
import { useAppConfig } from "../AppConfigContext";

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
      if (op === "=") return sc === sv;
      if (op === "!=") return sc !== sv;
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

// ── Column Picker ─────────────────────────────────────────────────────────────
function ColPicker({ allCols, selectedCols, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  // Close on outside click
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
  const [selectedCols, setSelectedCols] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState("");
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminMsg, setAdminMsg] = useState({ text: "", isError: false });
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);

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

  // Fetch COLUMN_MAPPING so we can run the same auto-mapping as ColumnMapper
  useEffect(() => {
    apiFetch("/column-mapping").then(setColumnMapping).catch(() => {});
  }, []);

  // Rows after applying the filter expression
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

  // Quick search across name/symbol columns on top of the DSL filter
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

  // Reset to page 1 whenever the visible set or page size changes
  useEffect(() => { setPage(1); }, [searchedRows, pageSize]);

  // Only the rows for the current page
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return searchedRows.slice(start, start + pageSize);
  }, [searchedRows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(searchedRows.length / pageSize));

  // Columns visible in the table (ordered as in the original snapshot)
  const visibleCols = useMemo(
    () => (snapshot ? snapshot.columns.filter((c) => selectedCols.has(c)) : []),
    [snapshot, selectedCols]
  );

  // ── Admin upload ────────────────────────────────────────────────────────────
  const handleAdminUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
  };

  // ── Pipeline — sends rows + pre-computed column mapping ──────────────────────
  const handleRunPipeline = async () => {
    if (!searchedRows.length) return;
    setPipelineRunning(true);
    setPipelineError("");
    // Apply the admin-set row cap (0 = no limit)
    const rowsToSend = screenerMaxRows > 0 ? searchedRows.slice(0, screenerMaxRows) : searchedRows;
    try {
      // Mirror ColumnMapper's performAutoMapping: case-insensitive alias match
      const normalize = (s) => String(s).trim().toLowerCase();
      const cols = snapshot?.columns ?? Object.keys(rowsToSend[0] ?? {});
      const mapping = {};
      cols.forEach((col) => {
        const target = normalize(col);
        const outputKey = Object.keys(columnMapping).find((key) => {
          const aliases = Array.isArray(columnMapping[key]) ? columnMapping[key] : [columnMapping[key]];
          // Check alias match OR direct-name match (col === output key)
          return normalize(key) === target || aliases.some((a) => normalize(a) === target);
        });
        if (outputKey && !mapping[outputKey]) mapping[outputKey] = col;
      });

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
      const blob = await res.blob();
      await saveResult(blob);
      navigate("/app/results");
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineRunning(false);
    }
  };

  // ── Downloads ───────────────────────────────────────────────────────────────
  // Filtered CSV respects the column selection.
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

  if (screenerEnabled === false) return <Navigate to="/app/results" replace />;

  return (
    <div className="sp-wrap">
      <style>{CSS}</style>

      {pipelineRunning && (
        <div className="sp-pipeline-overlay">
          <div className="sp-pipeline-overlay-box">
            <span className="sp-spinner sp-spinner-lg" />
            <span className="sp-pipeline-overlay-text">Running pipeline…</span>
            <span className="sp-pipeline-overlay-sub">Ranking and scoring companies</span>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="sp-header">
        <div className="sp-header-left">
          <h1 className="sp-title">Screener</h1>
          {snapshot && (
            <p className="sp-meta">
              {rowCount} companies · Updated {uploadedDate} · {snapshot.fileName}
            </p>
          )}
        </div>

        {snapshot && (
          <div className="sp-header-search">
            <svg className="sp-search-icon" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              className="sp-search-input"
              type="text"
              placeholder="Search by company name or symbol…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="sp-filter-clear"
                onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                aria-label="Clear search"
              >×</button>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="sp-admin">
            <label className={`sp-upload-btn${adminUploading ? " loading" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleAdminUpload}
                disabled={adminUploading}
                style={{ display: "none" }}
              />
              {adminUploading ? "Uploading…" : "Upload daily data"}
            </label>
            {adminMsg.text && (
              <span className={`sp-admin-msg${adminMsg.isError ? " error" : ""}`}>
                {adminMsg.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="sp-content">
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, color: "var(--text-muted)", fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!loading && !snapshot && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "64px 32px", gap: 16, minHeight: 360 }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", background: isAdmin ? "rgba(124,108,255,.10)" : "rgba(148,163,184,.08)", border: `1px solid ${isAdmin ? "rgba(124,108,255,.22)" : "rgba(148,163,184,.2)"}`, fontSize: 30 }}>
              {isAdmin ? "📤" : "⏳"}
            </div>
            <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
              {isAdmin ? "No data uploaded yet" : "Awaiting today's data"}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.65 }}>
              {isAdmin
                ? "Upload a daily CSV or Excel snapshot to give analysts access to the latest screener data."
                : "The admin hasn't uploaded today's screener snapshot yet. Check back shortly."}
            </div>
            {isAdmin && (
              <label style={{ marginTop: 4, padding: "11px 26px", borderRadius: 999, color: "#fff", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg,#7C6CFF,#4F46E5)", boxShadow: "0 4px 18px rgba(124,108,255,.30)", cursor: "pointer" }}>
                Upload CSV / Excel
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleAdminUpload} disabled={adminUploading} style={{ display: "none" }} />
              </label>
            )}
          </div>
        )}

        {!loading && snapshot && (
          <>
            {/* Fixed controls */}
            <div className="sp-controls">
              <div className="sp-filter-row">
                <div className="sp-filter-wrap">
                  <svg className="sp-filter-icon" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <input
                    className={`sp-filter-input${filterError ? " err" : ""}`}
                    type="text"
                    placeholder="e.g.  Name contains Reliance  OR  ROE > 15 AND Sector = Banks"
                    value={filterExpr}
                    onChange={(e) => setFilterExpr(e.target.value)}
                  />
                  {filterExpr && (
                    <button
                      className="sp-filter-clear"
                      onClick={() => { setFilterExpr(""); setFilterError(""); }}
                      aria-label="Clear filter"
                    >×</button>
                  )}
                </div>
              </div>
              {filterError && <p className="sp-filter-error">{filterError}</p>}

              <div className="sp-action-bar">
                <span className="sp-count">
                  {searchedRows.length === rowCount
                    ? `${rowCount} companies`
                    : `${searchedRows.length} of ${rowCount} companies`}
                </span>
                <div className="sp-actions">
                  <ColPicker
                    allCols={snapshot.columns}
                    selectedCols={selectedCols}
                    onChange={setSelectedCols}
                  />
                  <button
                    className="sp-btn secondary"
                    onClick={handleDownloadFiltered}
                    disabled={!searchedRows.length || !visibleCols.length}
                  >
                    Download filtered CSV
                  </button>
                  <button className="sp-btn secondary" onClick={handleDownloadFull}>
                    Download full data
                  </button>
                  <button
                    className="sp-btn primary"
                    onClick={handleRunPipeline}
                    disabled={pipelineRunning || !searchedRows.length}
                  >
                    {pipelineRunning ? (
                      <><span className="sp-spinner" />Running…</>
                    ) : "Run Pipeline"}
                  </button>
                </div>
              </div>

              {pipelineError && <p className="sp-pipeline-error">{pipelineError}</p>}
            </div>

            {/* Table + pagination — fills remaining height, table scrolls */}
            <div className="sp-table-section">
              {visibleCols.length === 0 ? (
                <div className="sp-empty">
                  No columns selected — use the Columns picker to show data.
                </div>
              ) : (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        {visibleCols.map((col) => <th key={col}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, i) => (
                        <tr key={i}>
                          {visibleCols.map((col) => (
                            <td key={col}>
                              {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                            </td>
                          ))}
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
                      : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, searchedRows.length)} of ${searchedRows.length}`}
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

  .sp-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
    padding: 14px 32px; flex-shrink: 0;
    border-bottom: 1px solid ${colors.border};
  }
  .sp-header-left { flex-shrink: 0; }
  .sp-title { font-size: 22px; font-weight: 700; margin: 0 0 2px; color: ${colors.text}; }
  .sp-meta { margin: 0; font-size: 12px; color: ${colors.textMuted}; }

  .sp-header-search {
    flex: 1; max-width: 380px; position: relative;
    display: flex; align-items: center;
  }

  .sp-admin { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sp-upload-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px;
    border-radius: ${radius.sm}; border: 1px solid ${colors.border};
    background: ${colors.elevated}; color: ${colors.text};
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
  }
  .sp-upload-btn:hover { background: ${colors.card}; border-color: ${colors.accent}; }
  .sp-upload-btn.loading { opacity: .6; cursor: wait; }
  .sp-admin-msg { font-size: 12px; color: ${colors.textSecondary}; max-width: 320px; }
  .sp-admin-msg.error { color: ${colors.negative}; }

  .sp-content {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
  }
  .sp-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    text-align: center; color: ${colors.textMuted}; font-size: 15px;
  }

  .sp-controls { padding: 16px 32px 0; flex-shrink: 0; }

  .sp-table-section {
    flex: 1; display: flex; flex-direction: column; overflow: hidden;
    min-height: 0; padding: 0 32px 16px;
  }

  .sp-filter-row { margin-bottom: 8px; }
  .sp-filter-wrap { position: relative; display: flex; align-items: center; }
  .sp-filter-icon { position: absolute; left: 14px; color: ${colors.textMuted}; pointer-events: none; }
  .sp-filter-input {
    width: 100%; padding: 11px 40px 11px 40px;
    border-radius: ${radius.sm}; border: 1px solid ${colors.border};
    background: ${colors.inset}; color: ${colors.text};
    font-size: 13px; font-family: ${fonts.sans}; outline: none; transition: border-color .15s;
  }
  .sp-filter-input::placeholder { color: ${colors.textMuted}; }
  .sp-filter-input:focus { border-color: ${colors.accent}; box-shadow: 0 0 0 3px ${colors.accentSoft}; }
  .sp-filter-input.err { border-color: ${colors.negative}; }
  .sp-filter-clear {
    position: absolute; right: 12px; background: none; border: none;
    color: ${colors.textMuted}; font-size: 18px; cursor: pointer;
    padding: 4px 6px; line-height: 1; border-radius: 4px;
  }
  .sp-filter-clear:hover { color: ${colors.text}; }
  .sp-filter-error { margin: 4px 0 8px; font-size: 12px; color: ${colors.negative}; }

  /* Search bar — lives in the header */
  .sp-search-icon { position: absolute; left: 13px; color: ${colors.textMuted}; pointer-events: none; }
  .sp-search-input {
    width: 100%; padding: 9px 36px 9px 38px;
    border-radius: ${radius.sm}; border: 1px solid ${colors.border};
    background: ${colors.inset}; color: ${colors.text};
    font-size: 13px; font-family: ${fonts.sans}; outline: none; transition: border-color .15s;
  }
  .sp-search-input::placeholder { color: ${colors.textMuted}; }
  .sp-search-input:focus { border-color: ${colors.accent}; box-shadow: 0 0 0 3px ${colors.accentSoft}; }

  .sp-action-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
  }
  .sp-count { font-size: 13px; color: ${colors.textMuted}; font-variant-numeric: tabular-nums; }
  .sp-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

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
    background: linear-gradient(135deg, ${colors.accentHover} 0%, ${colors.accent} 100%);
  }

  .sp-spinner {
    display: inline-block; width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: sp-spin .7s linear infinite;
  }
  .sp-spinner-lg {
    width: 40px; height: 40px; border-width: 3px;
    border-color: rgba(124,108,255,0.2); border-top-color: #7C6CFF;
  }
  @keyframes sp-spin { to { transform: rotate(360deg); } }

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
  .sp-pipeline-overlay-text {
    font-size: 16px; font-weight: 600; color: var(--text-primary);
  }
  .sp-pipeline-overlay-sub {
    font-size: 12px; color: var(--text-secondary);
  }

  .sp-pipeline-error {
    margin: 0 0 12px; padding: 10px 14px; border-radius: ${radius.sm};
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
  .sp-table th {
    padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase; color: ${colors.textMuted};
    background: ${colors.card}; border-bottom: 1px solid ${colors.border}; white-space: nowrap;
  }
  .sp-table td {
    padding: 8px 14px; color: ${colors.textSecondary};
    border-bottom: 1px solid ${colors.borderSubtle}; font-variant-numeric: tabular-nums;
  }
  .sp-table tbody tr:last-child td { border-bottom: none; }
  .sp-table tbody tr:hover td { background: ${colors.inset}; color: ${colors.text}; }

  /* Sticky first column (company name) */
  .sp-table th:first-child {
    position: sticky; left: 0; z-index: 3;
    max-width: 220px; border-right: 1px solid ${colors.border};
  }
  .sp-table td:first-child {
    position: sticky; left: 0; z-index: 1;
    background: ${colors.canvas}; max-width: 220px;
    overflow: hidden; text-overflow: ellipsis;
    border-right: 1px solid ${colors.borderSubtle};
  }
  .sp-table tbody tr:hover td:first-child { background: ${colors.inset}; color: ${colors.text}; }

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
    .sp-header { padding: 12px 16px; flex-direction: column; align-items: flex-start; }
    .sp-header-search { max-width: 100%; width: 100%; }
    .sp-controls { padding: 12px 16px 0; }
    .sp-table-section { padding: 0 16px 12px; }
    .sp-action-bar { flex-direction: column; align-items: flex-start; }
    .cp-panel { right: auto; left: 0; width: 240px; }
  }
`;

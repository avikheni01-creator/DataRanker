import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl, getAuthHeaders } from "./api";
import { saveResult } from "./lib/resultStore";
import ColumnMapper from "./components/ColumnMapper";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
    { label: "Format",         description: "Maps raw Screener.in columns to standardized schema" },
    { label: "Map Industries", description: "Joins companies to SCS sectors via mapping file" },
    { label: "Rank & Score",   description: "Scores & ranks companies by KPI template weights" },
];

const STATUS_ICON = { idle: "—", running: "⟳", done: "✓", error: "✗" };

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  /* ── Page ───────────────────────────────────────────────── */
  .pl-page {
    max-width: 1100px; margin: 0 auto;
    padding: 36px 32px 64px; color: var(--text);
    font-family: 'Inter', sans-serif;
  }

  /* ── Header ─────────────────────────────────────────────── */
  .pl-header { margin-bottom: 28px; }
  .pl-eyebrow {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--accent-hover); margin-bottom: 8px;
  }
  .pl-title {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: var(--text); margin: 0 0 6px;
  }
  .pl-sub {
    font-size: 14px; color: var(--text-muted); margin: 0;
    max-width: 500px; line-height: 1.55;
  }

  /* ── Two-column layout ───────────────────────────────────── */
  .pl-body { display: flex; gap: 24px; align-items: flex-start; }
  .pl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
  .pl-sidebar {
    width: 292px; flex-shrink: 0;
    position: sticky; top: 24px;
    display: flex; flex-direction: column; gap: 12px;
  }

  /* ── Card ────────────────────────────────────────────────── */
  .pl-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
  }
  .pl-card-head {
    display: flex; align-items: center; gap: 10px;
    padding: 13px 18px; border-bottom: 1px solid var(--border);
  }
  .pl-card-icon {
    width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(124,108,255,0.13); color: var(--accent-hover);
    font-size: 12px; font-weight: 700;
  }
  .pl-card-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .pl-card-body { padding: 16px 18px; }

  /* ── Upload zone ─────────────────────────────────────────── */
  .upload-zone {
    display: flex; flex-direction: column; align-items: center;
    gap: 8px; padding: 30px 20px;
    border: 1.5px dashed rgba(124,108,255,0.3); border-radius: 10px;
    background: var(--inset); cursor: pointer;
    transition: all 0.18s ease; text-align: center;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: var(--accent); background: var(--accent-soft);
    transform: translateY(-1px);
  }
  .upload-zone.has-file {
    border-color: var(--positive); border-style: solid;
    background: var(--positive-soft);
  }
  .upload-icon {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, rgba(124,108,255,0.2), rgba(79,70,229,0.14));
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; color: var(--accent-hover);
  }
  .has-file .upload-icon { background: var(--positive-soft); color: var(--positive); }
  .upload-label { font-size: 13px; font-weight: 600; color: var(--text); }
  .req { color: var(--negative); margin-left: 3px; }
  .upload-file {
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted);
    max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .has-file .upload-file { color: var(--positive); }

  /* ── KPI note ────────────────────────────────────────────── */
  .pl-kpi-note {
    font-size: 12px; color: var(--text-secondary); line-height: 1.5;
    background: var(--inset); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 13px; margin-top: 12px;
  }
  .pl-kpi-note strong { color: var(--text); }

  /* ── Pipeline steps ──────────────────────────────────────── */
  .step-badge {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 9px; margin-bottom: 6px;
    border: 1px solid transparent; transition: all 0.3s ease;
  }
  .step-badge:last-child { margin-bottom: 0; }
  .step-idle    { background: var(--inset); border-color: var(--border); }
  .step-running { background: rgba(124,108,255,0.10); border-color: rgba(124,108,255,0.55); animation: pulse 1.2s ease-in-out infinite; }
  .step-done    { background: rgba(34,197,94,0.07); border-color: rgba(34,197,94,0.45); }
  .step-error   { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.5); }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124,108,255,0); }
    50%       { box-shadow: 0 0 14px 2px rgba(124,108,255,0.28); }
  }
  .step-num {
    width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700;
    background: var(--elevated); color: var(--text-muted);
  }
  .step-running .step-num { background: rgba(124,108,255,0.2); color: var(--accent-hover); }
  .step-done    .step-num { background: rgba(34,197,94,0.15); color: #22C55E; }
  .step-error   .step-num { background: rgba(239,68,68,0.15); color: #EF4444; }
  .step-info { flex: 1; min-width: 0; }
  .step-name { font-size: 12px; font-weight: 600; color: var(--text); }
  .step-desc { font-size: 11px; color: var(--text-muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .step-status-icon { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-muted); flex-shrink: 0; }
  .step-done    .step-status-icon { color: #22C55E; }
  .step-running .step-status-icon { color: var(--accent-hover); animation: spin 1s linear infinite; display: inline-block; }
  .step-error   .step-status-icon { color: #EF4444; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Run button ──────────────────────────────────────────── */
  .run-btn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #7C6CFF 0%, #4F46E5 100%);
    border: none; border-radius: 12px; color: #fff;
    font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
    cursor: pointer; transition: all 0.18s ease;
    box-shadow: 0 4px 14px rgba(124,108,255,0.32);
  }
  .run-btn:hover:not(:disabled) {
    transform: translateY(-1px); filter: brightness(1.08);
    box-shadow: 0 8px 26px rgba(124,108,255,0.45);
  }
  .run-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

  /* ── Output actions ──────────────────────────────────────── */
  .pl-output { display: flex; flex-direction: column; gap: 8px; }
  .download-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 13px;
    background: rgba(34,197,94,0.08); border: 1.5px solid rgba(34,197,94,0.5); border-radius: 12px;
    color: #22C55E; font-size: 13px; font-weight: 600;
    text-decoration: none; transition: all 0.18s ease;
  }
  .download-btn:hover { background: rgba(34,197,94,0.15); transform: translateY(-1px); }
  .view-output-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 12px;
    background: var(--elevated); border: 1px solid var(--border); border-radius: 12px;
    color: var(--text-secondary); font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.15s ease;
  }
  .view-output-btn:hover { color: var(--text); border-color: var(--accent); background: var(--accent-soft); }

  /* ── Feedback ────────────────────────────────────────────── */
  .error-box {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.4);
    border-left: 3px solid #EF4444; border-radius: 10px;
    padding: 12px 14px; font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--negative); line-height: 1.5;
  }
  .log-box {
    background: rgba(0,0,0,0.28); border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px;
    max-height: 130px; overflow-y: auto;
  }
  .log-line { display: flex; gap: 10px; padding: 2px 0; }
  .log-ts { color: var(--text-muted); flex-shrink: 0; }
  .log-msg { color: var(--text-secondary); }
  .log-line.success .log-msg { color: #22C55E; }
  .log-line.error   .log-msg { color: #EF4444; }

  /* ── Responsive ──────────────────────────────────────────── */
  @media (max-width: 820px) {
    .pl-page { padding: 24px 16px 48px; }
    .pl-body { flex-direction: column; }
    .pl-sidebar { width: 100%; position: static; }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function UploadZone({ label, accept, file, onChange, required }) {
    const [drag, setDrag] = useState(false);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) onChange(f);
        },
        [onChange]
    );

    return (
        <label
            className={`upload-zone ${drag ? "drag-over" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept={accept}
                style={{ display: "none" }}
                onChange={(e) => e.target.files[0] && onChange(e.target.files[0])}
            />
            <div className="upload-icon">{file ? "✓" : "↑"}</div>
            <div className="upload-label">
                {label}
                {required && <span className="req">*</span>}
            </div>
            <div className="upload-file">
                {file ? file.name : "Drop file or click to browse"}
            </div>
        </label>
    );
}

function StepBadge({ step, index, status }) {
    return (
        <div className={`step-badge step-${status}`}>
            <div className="step-num">{String(index + 1).padStart(2, "0")}</div>
            <div className="step-info">
                <div className="step-name">{step.label}</div>
                <div className="step-desc">{step.description}</div>
            </div>
            <div className="step-status-icon">{STATUS_ICON[status]}</div>
        </div>
    );
}

function ErrorBox({ message }) {
    if (!message) return null;
    const hint = /failed to fetch/i.test(message)
        ? " — backend isn't reachable. Start it on localhost:8000."
        : "";
    return <div className="error-box">⚠ {message}{hint}</div>;
}

function LogBox({ entries }) {
    if (!entries.length) return null;
    return (
        <div className="log-box">
            {entries.map((entry, i) => (
                <div key={i} className={`log-line ${entry.type}`}>
                    <span className="log-ts">{entry.ts}</span>
                    <span className="log-msg">{entry.msg}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

function usePipeline(columnMapping = {}) {
    const [steps, setSteps] = useState(["idle", "idle", "idle"]);
    const [log, setLog] = useState([]);
    const [running, setRunning] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [error, setError] = useState(null);
    const [resultFile, setResultFile] = useState(null);

    const appendLog = (msg, type = "info") =>
        setLog((prev) => [...prev, { msg, type, ts: new Date().toLocaleTimeString() }]);

    const setStep = (i, status) =>
        setSteps((prev) => prev.map((s, idx) => (idx === i ? status : s)));

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    const run = async (queryFile) => {
        if (!queryFile) {
            setError("Please upload the Screener.in query results file.");
            return;
        }

        setError(null);
        setRunning(true);
        setDownloadUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        setLog([]);
        setSteps(["idle", "idle", "idle"]);

        const formData = new FormData();
        formData.append("query_results", queryFile);
        formData.append("mapping_json", JSON.stringify(columnMapping));

        try {
            appendLog("Sending files to pipeline...");

            setStep(0, "running");
            appendLog("Step 1: Formatting columns...");
            await delay(600);

            setStep(0, "done");
            setStep(1, "running");
            appendLog("Step 2: Mapping industries to SCS sectors...");
            await delay(600);

            setStep(1, "done");
            setStep(2, "running");
            appendLog("Step 3: Scoring & ranking by KPI templates...");

            const res = await fetch(apiUrl("/run-pipeline"), {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders(),
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(err.detail || `Server error ${res.status}`);
            }

            const blob = await res.blob();
            setResultFile(blob);
            saveResult(blob);
            setDownloadUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
            setStep(2, "done");
            appendLog("Pipeline complete! Final_Ranked_Report.xlsx is ready.", "success");
        } catch (err) {
            const failedStep = steps.findIndex((s) => s === "running");
            if (failedStep >= 0) setStep(failedStep, "error");
            appendLog(`Error: ${err.message}`, "error");
            setError(err.message);
        } finally {
            setRunning(false);
        }
    };

    return { steps, log, running, resultFile, downloadUrl, error, run };
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function Dashboard({ setOutputFile, backendConfig, queryFile, setQueryFile }) {
    const navigate = useNavigate();

    const [mapping, setMapping] = useState([{}]);
    const [mappingReady, setMappingReady] = useState(false);
    const handleMappingChange = useCallback(({ mapping, ready }) => {
        setMapping(mapping);
        setMappingReady(ready);
    }, []);

    useEffect(() => { setMappingReady(false); }, [queryFile]);

    const { steps, log, running, resultFile, downloadUrl, error, run } = usePipeline(mapping);
    useEffect(() => {
        if (resultFile) setOutputFile(resultFile);
    }, [resultFile, setOutputFile]);

    const canRun = queryFile && mappingReady && !running;
    const showDashboard = resultFile !== null;

    return (
        <>
            <style>{STYLES}</style>
            <div className="pl-page">

                {/* Compact page header */}
                <div className="pl-header">
                    <div className="pl-eyebrow">Matrix · Equity Ranking</div>
                    <h1 className="pl-title">Ranking Pipeline</h1>
                    <p className="pl-sub">
                        Upload your Screener.in export to generate a fully scored,
                        ranked Excel report — industry mapping and KPI weights applied automatically.
                    </p>
                </div>

                <div className="pl-body">

                    {/* ── Left: upload + column mapper ── */}
                    <div className="pl-main">

                        {/* Upload card */}
                        <div className="pl-card">
                            <div className="pl-card-head">
                                <div className="pl-card-icon">↑</div>
                                <span className="pl-card-title">Upload Screener Export</span>
                            </div>
                            <div className="pl-card-body">
                                <UploadZone
                                    label="Query Results (Screener.in export)"
                                    accept=".csv"
                                    file={queryFile}
                                    onChange={setQueryFile}
                                    required
                                />
                                <div className="pl-kpi-note">
                                    Industry mapping and your <strong>KPI Library</strong> are managed
                                    on the backend — only the Screener.in export is needed here.
                                    Edit KPIs anytime in the <strong>KPI Editor</strong>.
                                </div>
                            </div>
                        </div>

                        {/* Column mapper — appears after file upload */}
                        {queryFile && (
                            <div className="pl-card">
                                <div className="pl-card-head">
                                    <div className="pl-card-icon">↔</div>
                                    <span className="pl-card-title">Column Mapping</span>
                                </div>
                                <ColumnMapper
                                    backendConfig={backendConfig}
                                    queryFile={queryFile}
                                    onMappingChange={handleMappingChange}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Right: pipeline controls (sticky) ── */}
                    <div className="pl-sidebar">

                        {/* Pipeline stages */}
                        <div className="pl-card">
                            <div className="pl-card-head">
                                <div className="pl-card-icon">▶</div>
                                <span className="pl-card-title">Pipeline Stages</span>
                            </div>
                            <div className="pl-card-body">
                                {PIPELINE_STEPS.map((step, i) => (
                                    <StepBadge key={i} step={step} index={i} status={steps[i]} />
                                ))}
                            </div>
                        </div>

                        {/* Run button */}
                        <button className="run-btn" onClick={() => run(queryFile)} disabled={!canRun}>
                            {running ? "Running Pipeline…" : "▶  Run Full Pipeline"}
                        </button>

                        {/* Feedback */}
                        <ErrorBox message={error} />
                        <LogBox entries={log} />

                        {/* Output actions */}
                        {(downloadUrl || showDashboard) && (
                            <div className="pl-output">
                                {downloadUrl && (
                                    <a className="download-btn" href={downloadUrl} download="Final_Ranked_Report.xlsx">
                                        ↓  Download Ranked Report
                                    </a>
                                )}
                                {showDashboard && (
                                    <button className="view-output-btn" onClick={() => navigate("/app/results")}>
                                        View Output Dashboard →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";


// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
    {
        label: "Format",
        description: "Maps raw Screener.in columns to standardized schema",
    },
    {
        label: "Map Industries",
        description: "Joins industries to SCS sectors via mapping file",
    },
    {
        label: "Rank & Score",
        description: "Scores & ranks companies by KPI template weights",
    },
];

const STATUS_ICON = { idle: "—", running: "⟳", done: "✓", error: "✗" };

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  /* Fonts (Inter + Space Grotesk + JetBrains Mono) loaded globally in index.css */

  /* Glass surface shared by cards on this page */
  .glass {
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
    border: 1px solid rgba(255,255,255,0.08);
    border-top-color: rgba(255,255,255,0.14);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25);
  }

  /* Layout */
  .app { max-width: 880px; margin: 0 auto; padding: 52px 32px 80px; color: #F4F6FB; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .grid-full { grid-column: 1 / -1; }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .grid-full { grid-column: 1; } }

  /* Header */
  .header { margin-bottom: 42px; }
  .header-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    color: #9D90FF; margin-bottom: 14px;
  }
  .header-title {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: clamp(32px, 5vw, 50px); font-weight: 700; line-height: 1.04; letter-spacing: -0.02em;
    background: linear-gradient(120deg, #F4F6FB 30%, #9D90FF 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .header-sub {
    margin-top: 14px; color: #98A2BC; font-size: 15px;
    font-weight: 400; max-width: 520px; line-height: 1.6;
  }

  /* Upload Zone */
  .upload-zone {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; padding: 28px 20px;
    border: 1.5px dashed rgba(124,108,255,0.35); border-radius: 16px;
    background: rgba(255,255,255,0.025); cursor: pointer;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    transition: all 0.18s ease; text-align: center;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: #7C6CFF; background: rgba(124,108,255,0.07);
    box-shadow: 0 0 28px rgba(124,108,255,0.14); transform: translateY(-2px);
  }
  .upload-zone.has-file { border-color: #22C55E; border-style: solid; background: rgba(34,197,94,0.06); }
  .upload-icon {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, rgba(124,108,255,0.22), rgba(79,70,229,0.16));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
    display: flex; align-items: center;
    justify-content: center; font-size: 16px; color: #9D90FF;
  }
  .has-file .upload-icon { background: rgba(34,197,94,0.16); color: #22C55E; box-shadow: 0 0 16px rgba(34,197,94,0.2); }
  .upload-label { font-size: 13px; font-weight: 600; color: #F4F6FB; letter-spacing: 0.01em; }
  .req { color: #EF4444; margin-left: 3px; }
  .upload-file {
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #5A6480;
    max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .has-file .upload-file { color: #22C55E; }

  /* Pipeline Steps */
  .pipeline-steps {
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
    border: 1px solid rgba(255,255,255,0.08); border-top-color: rgba(255,255,255,0.14);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-radius: 16px; padding: 22px; margin-bottom: 22px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25);
  }
  .pipeline-label {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.15em; text-transform: uppercase; color: #5A6480; margin-bottom: 16px;
  }
  .step-badge {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 15px; border-radius: 11px; margin-bottom: 8px;
    border: 1px solid transparent; transition: all 0.3s ease;
  }
  .step-idle  { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }
  .step-running { background: rgba(124,108,255,0.10); border-color: rgba(124,108,255,0.55); animation: pulse 1.2s ease-in-out infinite; }
  .step-done  { background: rgba(34,197,94,0.07); border-color: rgba(34,197,94,0.5); }
  .step-error { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.55); }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124,108,255,0); }
    50%       { box-shadow: 0 0 16px 2px rgba(124,108,255,0.3); }
  }
  .step-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .step-idle  .step-dot { background: #232C49; }
  .step-running .step-dot { background: #7C6CFF; box-shadow: 0 0 10px rgba(124,108,255,0.8); }
  .step-done  .step-dot { background: #22C55E; box-shadow: 0 0 8px rgba(34,197,94,0.6); }
  .step-error .step-dot { background: #EF4444; }
  .step-info { flex: 1; }
  .step-name { font-size: 13px; font-weight: 600; color: #F4F6FB; }
  .step-desc { font-size: 11px; color: #5A6480; margin-top: 2px; }
  .step-status-icon { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #5A6480; }
  .step-done  .step-status-icon { color: #22C55E; }
  .step-running .step-status-icon { color: #9D90FF; animation: spin 1s linear infinite; display: inline-block; }
  .step-error .step-status-icon { color: #EF4444; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Buttons */
  .run-btn {
    width: 100%; padding: 16px;
    background: linear-gradient(135deg, #7C6CFF 0%, #4F46E5 100%);
    border: none; border-radius: 14px; color: #fff;
    font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;
    letter-spacing: 0.01em; cursor: pointer; transition: all 0.18s ease; margin-bottom: 14px;
    box-shadow: 0 4px 18px rgba(124,108,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22);
  }
  .run-btn:hover:not(:disabled) {
    transform: translateY(-1px); filter: brightness(1.08);
    box-shadow: 0 12px 36px rgba(124,108,255,0.45), inset 0 1px 0 rgba(255,255,255,0.22);
  }
  .run-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }
  .download-btn {
    display: flex; align-items: center; justify-content: center;
    gap: 10px; width: 100%; padding: 16px;
    background: rgba(34,197,94,0.08); border: 1.5px solid rgba(34,197,94,0.6); border-radius: 14px;
    color: #22C55E; font-family: 'Inter', sans-serif; font-size: 15px;
    font-weight: 600; text-decoration: none; transition: all 0.18s ease;
  }
  .download-btn:hover {
    background: rgba(34,197,94,0.14); box-shadow: 0 8px 30px rgba(34,197,94,0.25); transform: translateY(-1px);
  }
  .view-output-btn {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 14px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
    color: #98A2BC; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500;
    padding: 11px 18px; cursor: pointer; transition: all 0.15s ease;
  }
  .view-output-btn:hover { color: #F4F6FB; border-color: #7C6CFF; background: rgba(124,108,255,0.1); }

  /* Feedback */
  .error-box {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.5); border-left: 3px solid #EF4444;
    border-radius: 12px;
    padding: 14px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: #FCA5A5; margin-bottom: 16px;
  }
  .log-box {
    background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
    padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
    max-height: 180px; overflow-y: auto; margin-bottom: 16px;
  }
  .log-line { display: flex; gap: 12px; padding: 3px 0; }
  .log-ts { color: #5A6480; flex-shrink: 0; }
  .log-msg { color: #98A2BC; }
  .log-line.success .log-msg { color: #22C55E; }
  .log-line.error   .log-msg { color: #EF4444; }

  /* Setup Note */
  .setup-note {
    margin-top: 36px; padding: 22px;
    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
  }
  .setup-note-title {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.15em; text-transform: uppercase; color: #9D90FF; margin-bottom: 12px;
  }
  .setup-note pre {
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: #98A2BC; line-height: 1.8; overflow-x: auto;
  }
  .setup-note .cmd     { color: #9D90FF; }
  .setup-note .comment { color: #5A6480; }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function AppHeader() {
    return (
        <div className="header">
            <div className="header-eyebrow">Matrix · Equity Ranking</div>
            <h1 className="header-title">
                Ranking<br />Pipeline
            </h1>
            <p className="header-sub">
                Upload your Screener.in export, industry mapping, and KPI library to
                generate a fully scored, ranked Excel report in seconds.
            </p>
        </div>
    );
}

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

function FileUploadGrid({ queryFile, mappingFile, kpiFile, onQueryChange, onMappingChange, onKpiChange }) {
    return (
        <div className="grid">
            <div className="grid-full">
                <UploadZone
                    label="Query Results (Screener.in export)"
                    accept=".csv"
                    file={queryFile}
                    onChange={onQueryChange}
                    required
                />
            </div>
            <UploadZone
                label="Industry Mapping File"
                accept=".xlsx"
                file={mappingFile}
                onChange={onMappingChange}
                required
            />
            <UploadZone
                label="KPI Library"
                accept=".xlsx"
                file={kpiFile}
                onChange={onKpiChange}
                required
            />
        </div>
    );
}

function StepBadge({ step, status }) {
    return (
        <div className={`step-badge step-${status}`}>
            <div className="step-dot" />
            <div className="step-info">
                <div className="step-name">{step.label}</div>
                <div className="step-desc">{step.description}</div>
            </div>
            <div className="step-status-icon">{STATUS_ICON[status]}</div>
        </div>
    );
}

function PipelineSteps({ statuses }) {
    return (
        <div className="pipeline-steps">
            <div className="pipeline-label">Pipeline Stages</div>
            {PIPELINE_STEPS.map((step, i) => (
                <StepBadge key={i} step={step} status={statuses[i]} />
            ))}
        </div>
    );
}

function ErrorBox({ message }) {
    if (!message) return null;
    // Translate the browser's cryptic network error into an actionable hint.
    const hint = /failed to fetch/i.test(message)
        ? " — the backend isn't reachable. Start it on localhost:8000 (see setup note below), then run again."
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

function RunButton({ running, disabled, onClick }) {
    return (
        <button className="run-btn" onClick={onClick} disabled={disabled}>
            {running ? "Running Pipeline…" : "▶  Run Full Pipeline"}
        </button>
    );
}

function DownloadButton({ url }) {
    if (!url) return null;
    return (
        <a className="download-btn" href={url} download="Final_Ranked_Report.xlsx">
            ↓ Download Final_Ranked_Report.xlsx
        </a>
    );
}

function SetupNote() {
    return (
        <div className="setup-note">
            <div className="setup-note-title">Backend Setup (one-time)</div>
            <pre>
                <span className="comment"># 1. Install dependencies</span>{"\n"}
                <span className="cmd">pip install fastapi uvicorn python-multipart pandas openpyxl</span>{"\n\n"}
                <span className="comment"># 2. Place Format.py, mapper.py, ranking.py in /backend</span>{"\n"}
                <span className="comment"># 3. Start the API server</span>{"\n"}
                <span className="cmd">uvicorn main:app --reload --port 8000</span>{"\n\n"}
                <span className="comment"># 4. Run this React app</span>{"\n"}
                <span className="cmd">npm start</span>
            </pre>
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

    const run = async (queryFile, mappingFile, kpiFile) => {
        if (!queryFile || !mappingFile || !kpiFile) {
            setError("Please upload all three required files.");
            return;
        }

        setError(null);
        setRunning(true);
        setDownloadUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        setLog([]);
        setSteps(["idle", "idle", "idle"]);

        const formData = new FormData();
        formData.append("query_results", queryFile);
        formData.append("industry_mapping", mappingFile);
        formData.append("kpi_library", kpiFile);

        formData.append('mapping_json', JSON.stringify(columnMapping));

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

            const res = await fetch("http://localhost:8000/run-pipeline", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(err.detail || `Server error ${res.status}`);
            }

            const blob = await res.blob();
            setResultFile(blob);
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

export default function Dashboard({
    setOutputFile,
    columnMapping,
    queryFile,
    setQueryFile,
    mappingFile,
    setMappingFile,
    kpiFile,
    setKpiFile,
}) {
    const navigate = useNavigate();

    const { steps, log, running, resultFile, downloadUrl, error, run } = usePipeline(columnMapping);
    useEffect(() => {
        if (resultFile) {
            setOutputFile(resultFile);
        }
    }, [resultFile,setOutputFile]);
    const canRun = queryFile && mappingFile && kpiFile && !running;
    const showDashboard = resultFile !== null;

    return (
        <>
            <style>{STYLES}</style>
            <div className="app">
                <AppHeader />

                <FileUploadGrid
                    queryFile={queryFile}
                    mappingFile={mappingFile}
                    kpiFile={kpiFile}
                    onQueryChange={setQueryFile}
                    onMappingChange={setMappingFile}
                    onKpiChange={setKpiFile}
                />

                <PipelineSteps statuses={steps} />

                <ErrorBox message={error} />
                <LogBox entries={log} />

                <RunButton
                    running={running}
                    disabled={!canRun}
                    onClick={() => run(queryFile, mappingFile, kpiFile)}
                />

                <DownloadButton url={downloadUrl} />
                {showDashboard && (
                    <button className="view-output-btn" onClick={() => navigate("/app/results")}>
                        View Output Dashboard →
                    </button>
                )}

                <SetupNote />
            </div>
        </>
    );
}

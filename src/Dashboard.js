import { useState, useCallback, useEffect } from "react";
import StockDashboard from "./StockDashboard";
import Button from "@mui/material/Button";
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
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0a0a0f;
    color: #e8e6f0;
    font-family: 'Syne', sans-serif;
    min-height: 100vh;
  }

  /* Layout */
  .app { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .grid-full { grid-column: 1 / -1; }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .grid-full { grid-column: 1; } }

  /* Header */
  .header { margin-bottom: 48px; }
  .header-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    color: #6c63ff; margin-bottom: 12px;
  }
  .header-title {
    font-size: clamp(32px, 5vw, 52px); font-weight: 800; line-height: 1.05;
    background: linear-gradient(135deg, #e8e6f0 0%, #9b8fff 60%, #6c63ff 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .header-sub {
    margin-top: 14px; color: #7a7690; font-size: 15px;
    font-weight: 400; max-width: 500px; line-height: 1.6;
  }

  /* Upload Zone */
  .upload-zone {
    display: flex; flex-direction: column; align-items: center;
    gap: 8px; padding: 28px 20px;
    border: 1.5px dashed #2e2c3e; border-radius: 12px;
    background: #111018; cursor: pointer;
    transition: all 0.2s ease; text-align: center;
  }
  .upload-zone:hover, .upload-zone.drag-over { border-color: #6c63ff; background: #15132a; }
  .upload-zone.has-file { border-color: #3ddc97; border-style: solid; background: #0d1a14; }
  .upload-icon {
    width: 36px; height: 36px; border-radius: 50%;
    background: #1e1c30; display: flex; align-items: center;
    justify-content: center; font-size: 16px; color: #6c63ff;
  }
  .has-file .upload-icon { background: #0d2a1e; color: #3ddc97; }
  .upload-label { font-size: 13px; font-weight: 600; color: #c8c4e0; letter-spacing: 0.02em; }
  .req { color: #ff6b6b; margin-left: 3px; }
  .upload-file {
    font-family: 'DM Mono', monospace; font-size: 11px; color: #5a5670;
    max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .has-file .upload-file { color: #3ddc97; }

  /* Pipeline Steps */
  .pipeline-steps {
    background: #111018; border: 1px solid #1e1c30;
    border-radius: 12px; padding: 20px; margin-bottom: 20px;
  }
  .pipeline-label {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.15em; text-transform: uppercase; color: #4a4660; margin-bottom: 16px;
  }
  .step-badge {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px; border-radius: 8px; margin-bottom: 8px;
    border: 1px solid transparent; transition: all 0.3s ease;
  }
  .step-idle  { background: #0e0d18; border-color: #1a1830; }
  .step-running { background: #12102a; border-color: #6c63ff; animation: pulse 1.2s ease-in-out infinite; }
  .step-done  { background: #0a1a10; border-color: #3ddc97; }
  .step-error { background: #1a0e0e; border-color: #ff6b6b; }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(108,99,255,0); }
    50%       { box-shadow: 0 0 12px 2px rgba(108,99,255,0.25); }
  }
  .step-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .step-idle  .step-dot { background: #2e2c3e; }
  .step-running .step-dot { background: #6c63ff; }
  .step-done  .step-dot { background: #3ddc97; }
  .step-error .step-dot { background: #ff6b6b; }
  .step-info { flex: 1; }
  .step-name { font-size: 13px; font-weight: 600; color: #c8c4e0; }
  .step-desc { font-size: 11px; color: #5a5670; margin-top: 2px; }
  .step-status-icon { font-family: 'DM Mono', monospace; font-size: 14px; color: #3a3850; }
  .step-done  .step-status-icon { color: #3ddc97; }
  .step-running .step-status-icon { color: #6c63ff; animation: spin 1s linear infinite; display: inline-block; }
  .step-error .step-status-icon { color: #ff6b6b; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Buttons */
  .run-btn {
    width: 100%; padding: 18px;
    background: linear-gradient(135deg, #6c63ff, #4a43d0);
    border: none; border-radius: 12px; color: #fff;
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s ease; margin-bottom: 16px;
  }
  .run-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #7d75ff, #5a53e0);
    transform: translateY(-1px); box-shadow: 0 8px 30px rgba(108,99,255,0.3);
  }
  .run-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .download-btn {
    display: flex; align-items: center; justify-content: center;
    gap: 10px; width: 100%; padding: 18px;
    background: #0a1a10; border: 1.5px solid #3ddc97; border-radius: 12px;
    color: #3ddc97; font-family: 'Syne', sans-serif; font-size: 15px;
    font-weight: 700; text-decoration: none; transition: all 0.2s ease;
  }
  .download-btn:hover {
    background: #0d2a1a; box-shadow: 0 8px 30px rgba(61,220,151,0.2); transform: translateY(-1px);
  }

  /* Feedback */
  .error-box {
    background: #1a0e0e; border: 1px solid #ff6b6b; border-radius: 10px;
    padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px;
    color: #ff9e9e; margin-bottom: 16px;
  }
  .log-box {
    background: #080810; border: 1px solid #1a1830; border-radius: 12px;
    padding: 16px; font-family: 'DM Mono', monospace; font-size: 12px;
    max-height: 180px; overflow-y: auto; margin-bottom: 16px;
  }
  .log-line { display: flex; gap: 12px; padding: 3px 0; }
  .log-ts { color: #3a3850; flex-shrink: 0; }
  .log-msg { color: #8a86a0; }
  .log-line.success .log-msg { color: #3ddc97; }
  .log-line.error   .log-msg { color: #ff6b6b; }

  /* Setup Note */
  .setup-note {
    margin-top: 36px; padding: 20px;
    background: #111018; border: 1px solid #1e1c30; border-radius: 12px;
  }
  .setup-note-title {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.15em; text-transform: uppercase; color: #6c63ff; margin-bottom: 12px;
  }
  .setup-note pre {
    font-family: 'DM Mono', monospace; font-size: 12px;
    color: #7a7690; line-height: 1.8; overflow-x: auto;
  }
  .setup-note .cmd     { color: #9b8fff; }
  .setup-note .comment { color: #3a3850; }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function AppHeader() {
    return (
        <div className="header">
            <div className="header-eyebrow">NSE Stock Intelligence</div>
            <h1 className="header-title">
                Stock Ranking<br />Pipeline
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
    return <div className="error-box">⚠ {message}</div>;
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

export default function Dashboard({ setOutputFile, columnMapping }) {
    const [queryFile, setQueryFile] = useState(null);
    const [mappingFile, setMappingFile] = useState(null);
    const [kpiFile, setKpiFile] = useState(null);
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
                {showDashboard && <Button onClick={() => navigate("/stock-dashboard")}>View Output</Button>}

                <SetupNote />
            </div>
        </>
    );
}

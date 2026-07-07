// routes/screener.js — admin snapshot upload + user screener endpoints.
//
// POST /admin/screener       — admin replaces the daily snapshot
// GET  /screener             — fetch current snapshot (columns + rows)
// GET  /screener/download    — stream the original uploaded file
// POST /screener/run-pipeline — run ranking on a provided row subset

const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

const { requireAuth, requireAdmin } = require("../middleware/auth");
const ScreenerSnapshot = require("../models/ScreenerSnapshot");
const { COLUMN_MAPPING } = require("../core/config");
const { runFormat } = require("../services/formatter");
const { runMapper } = require("../services/mapper");
const { runRanking } = require("../services/ranker");
const { getOrSeedLibrary, toRankerRows } = require("../services/kpiLibrary");
const { getIndustryMappingBuffer } = require("../services/industryMapping");

const router = express.Router();

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

function handleUpload(req, res, next) {
  upload.single("screener_data")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ detail: "File too large (max 25 MB)." });
    }
    if (err) return res.status(400).json({ detail: "File upload failed." });
    next();
  });
}

// Build { outputCol: sourceCol } by matching snapshot column names against
// COLUMN_MAPPING aliases. Matching is case-insensitive and trims whitespace so
// screener.in exports with "name " or "NSE code" still resolve correctly.
// Returns the ORIGINAL column name as the source so rowsToBuffer can look it up.
function autoMap(columns) {
  // Build a map: normalised-key → original column name
  const normToOriginal = new Map();
  for (const col of columns) {
    const key = String(col).trim().toLowerCase();
    if (!normToOriginal.has(key)) normToOriginal.set(key, col);
  }

  const mapping = {};
  for (const [outputCol, aliases] of Object.entries(COLUMN_MAPPING)) {
    // Direct match: a screener column whose name (normalised) equals the output key
    const directMatch = normToOriginal.get(outputCol.trim().toLowerCase());
    if (directMatch !== undefined) {
      mapping[outputCol] = directMatch;
      continue;
    }
    // Alias match (first alias found wins)
    const arr = Array.isArray(aliases) ? aliases : [aliases];
    let hit = null;
    for (const alias of arr) {
      const match = normToOriginal.get(alias.trim().toLowerCase());
      if (match !== undefined) { hit = match; break; }
    }
    if (hit) mapping[outputCol] = hit;
  }

  // Safety net: if the screener has a company-name column that resolved to
  // "Description", also pass it through under "Name" so StockDashboard's
  // `r.Description || r.Name` fallback always has at least one populated key.
  const NAME_PATTERNS = ["name", "company name", "stock name", "company", "description"];
  for (const pat of NAME_PATTERNS) {
    const original = normToOriginal.get(pat);
    if (original && !mapping["Name"]) {
      mapping["Name"] = original;
      break;
    }
  }

  return mapping;
}

// Serialise a row array back to a CSV buffer so runFormat can consume it.
// SheetJS adds a UTF-8 BOM (EF BB BF) to CSV output which corrupts the first
// column name when read back — strip it so "Name" stays "Name".
function rowsToBuffer(columns, rows) {
  const aoa = [columns, ...rows.map((r) => columns.map((c) => r[c] ?? null))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  let buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "csv" }));
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) buf = buf.slice(3);
  return buf;
}

// ── Admin: replace the daily snapshot ────────────────────────────────────────

router.post(
  "/admin/screener",
  requireAuth,
  requireAdmin,
  handleUpload,
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ detail: "No file uploaded." });

      const wb = XLSX.read(file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        blankrows: false,
        defval: null,
      });

      if (aoa.length < 2) {
        return res.status(400).json({ detail: "File has no data rows." });
      }

      const columns = (aoa[0] || []).map((c) =>
        c === null || c === undefined ? "" : String(c)
      );

      const rows = [];
      for (let i = 1; i < aoa.length; i++) {
        const raw = aoa[i];
        const obj = {};
        let allNull = true;
        for (let c = 0; c < columns.length; c++) {
          const v = raw[c] ?? null;
          obj[columns[c]] = v;
          if (v !== null) allNull = false;
        }
        if (!allNull) rows.push(obj);
      }

      // Delete the old snapshot file from disk (if any) before replacing.
      const old = await ScreenerSnapshot.findOne({}, "filePath").lean();
      if (old?.filePath) {
        try { fs.unlinkSync(old.filePath); } catch (_) { /* already gone */ }
      }

      // Write the new file to disk with a stable filename.
      const ext = path.extname(file.originalname) || ".csv";
      const filePath = path.join(UPLOADS_DIR, `screener-snapshot${ext}`);
      fs.writeFileSync(filePath, file.buffer);

      // Only one snapshot at a time.
      await ScreenerSnapshot.deleteMany({});
      const snap = await ScreenerSnapshot.create({
        uploadedBy: req.user._id,
        fileName: file.originalname,
        filePath,
        rawMimeType: file.mimetype,
        columns,
        rows,
      });

      res.json({
        ok: true,
        snapshot: {
          uploadedAt: snap.uploadedAt,
          fileName: snap.fileName,
          rowCount: rows.length,
          columnCount: columns.length,
        },
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  }
);

// ── User: fetch snapshot for display ─────────────────────────────────────────

router.get("/screener", requireAuth, async (req, res) => {
  try {
    const snap = await ScreenerSnapshot.findOne({}, "-rawBuffer").lean();
    if (!snap) return res.json({ snapshot: null });
    res.json({
      snapshot: {
        uploadedAt: snap.uploadedAt,
        fileName: snap.fileName,
        columns: snap.columns,
        rows: snap.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── User: download original file ─────────────────────────────────────────────

router.get("/screener/download", requireAuth, async (req, res) => {
  try {
    const snap = await ScreenerSnapshot.findOne(
      {},
      "filePath rawMimeType fileName"
    ).lean();
    if (!snap) {
      return res.status(404).json({ detail: "No screener data uploaded yet." });
    }
    if (!fs.existsSync(snap.filePath)) {
      return res.status(404).json({ detail: "Snapshot file missing from server disk." });
    }
    res.setHeader("Content-Type", snap.rawMimeType || "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${snap.fileName}"`);
    fs.createReadStream(snap.filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── User: run ranking pipeline on a row subset ────────────────────────────────

router.post("/screener/run-pipeline", requireAuth, async (req, res) => {
  try {
    const { rows, mapping: clientMapping } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ detail: "rows must be a non-empty array." });
    }

    const columns = Object.keys(rows[0]);

    // Prefer the mapping the frontend computed (same logic as ColumnMapper);
    // fall back to server-side autoMap if none was provided.
    const mapping = (clientMapping && Object.keys(clientMapping).length > 0)
      ? clientMapping
      : autoMap(columns);

    if (Object.keys(mapping).length === 0) {
      return res.status(400).json({
        detail:
          "None of the screener columns matched the known column mapping. " +
          "Check that the uploaded file uses the expected column names.",
      });
    }

    const buffer = rowsToBuffer(columns, rows);

    const lib = await getOrSeedLibrary(req.user._id);
    const kpiRows = toRankerRows(lib.rows);

    const formatted = runFormat(buffer, mapping);
    const mapped = runMapper(formatted, getIndustryMappingBuffer());
    const fileBytes = await runRanking(mapped, kpiRows);

    res.status(200);
    res.setHeader("Content-Type", XLSX_MIME);
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Final_Ranked_Report.xlsx"'
    );
    res.send(fileBytes);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;

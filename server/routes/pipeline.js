// routes/pipeline.js — GET /column-mapping and POST /run-pipeline.

const express = require("express");
const multer = require("multer");

const { COLUMN_MAPPING } = require("../core/config");
const { runFormat } = require("../services/formatter");
const { runMapper } = require("../services/mapper");
const { runRanking } = require("../services/ranker");
const { getOrSeedLibrary, toRankerRows } = require("../services/kpiLibrary");
const { getIndustryMappingBuffer } = require("../services/industryMapping");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const XLSX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB per file

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

// Only the query export is uploaded now; the industry-mapping workbook is bundled
// with the backend (services/industryMapping.js).
const uploadFields = upload.fields([{ name: "query_results", maxCount: 1 }]);

// Wrap the multer middleware so a MulterError (e.g. file too large) becomes a
// friendly JSON response instead of an unhandled 500.
function handleUpload(req, res, next) {
  uploadFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res
          .status(status)
          .json({ detail: "Uploaded file is too large (max 15 MB)." });
      }
      return res.status(400).json({ detail: "File upload failed." });
    }
    return next();
  });
}

router.get("/column-mapping", (req, res) => {
  res.json(COLUMN_MAPPING);
});

router.post(
  "/run-pipeline",
  requireAuth, // free tier = any signed-in user
  handleUpload,
  async (req, res) => {
    try {
      const files = req.files || {};
      const queryFile = files.query_results && files.query_results[0];

      if (!queryFile) {
        throw new Error("Missing the required query results file");
      }

      // KPI library now comes from the signed-in user's saved set (seeded with
      // defaults on first use), replacing the uploaded KPI Excel sheet.
      const lib = await getOrSeedLibrary(req.user._id);
      const kpiRows = toRankerRows(lib.rows);

      if (!req.body.mapping_json) {
        return res.status(400).json({ detail: "Missing required field: mapping_json" });
      }
      let listOfMappings;
      try {
        listOfMappings = JSON.parse(req.body.mapping_json);
      } catch {
        return res.status(400).json({ detail: "mapping_json must be valid JSON" });
      }
      if (!Array.isArray(listOfMappings)) {
        return res.status(400).json({ detail: "mapping_json must be a JSON array" });
      }

      // Parse mapping_json exactly like the Python: JSON array of single-key
      // objects merged into one dynamic_mapping object.
      const dynamicMapping = listOfMappings.reduce(
        (acc, d) => Object.assign(acc, d),
        {}
      );

      // Stage 1 → Stage 2 → Stage 3 (in-memory). The industry-mapping workbook
      // is the backend's bundled copy, not an upload.
      const formatted = runFormat(queryFile.buffer, dynamicMapping);
      const mapped = runMapper(formatted, getIndustryMappingBuffer());
      const fileBytes = await runRanking(mapped, kpiRows);

      res.status(200);
      res.setHeader("Content-Type", XLSX_MEDIA_TYPE);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Final_Ranked_Report.xlsx"'
      );
      res.send(fileBytes);
    } catch (exc) {
      res.status(500).json({ detail: String(exc && exc.message ? exc.message : exc) });
    }
  }
);

module.exports = router;

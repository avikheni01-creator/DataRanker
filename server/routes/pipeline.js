// routes/pipeline.js — GET /column-mapping and POST /run-pipeline.

const express = require("express");
const multer = require("multer");

const { COLUMN_MAPPING } = require("../core/config");
const { runFormat } = require("../services/formatter");
const { runMapper } = require("../services/mapper");
const { runRanking } = require("../services/ranker");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const XLSX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const upload = multer({ storage: multer.memoryStorage() });

router.get("/column-mapping", (req, res) => {
  res.json(COLUMN_MAPPING);
});

router.post(
  "/run-pipeline",
  requireAuth, // free tier = any signed-in user
  upload.fields([
    { name: "query_results", maxCount: 1 },
    { name: "industry_mapping", maxCount: 1 },
    { name: "kpi_library", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const queryFile = files.query_results && files.query_results[0];
      const mappingFile = files.industry_mapping && files.industry_mapping[0];
      const kpiFile = files.kpi_library && files.kpi_library[0];

      if (!queryFile || !mappingFile || !kpiFile) {
        throw new Error("Missing one or more required files");
      }

      // Parse mapping_json exactly like the Python: JSON array of single-key
      // objects merged into one dynamic_mapping object.
      const listOfMappings = JSON.parse(req.body.mapping_json);
      const dynamicMapping = listOfMappings.reduce(
        (acc, d) => Object.assign(acc, d),
        {}
      );

      // Stage 1 → Stage 2 → Stage 3 (in-memory).
      const formatted = runFormat(queryFile.buffer, dynamicMapping);
      const mapped = runMapper(formatted, mappingFile.buffer);
      const fileBytes = await runRanking(mapped, kpiFile.buffer);

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

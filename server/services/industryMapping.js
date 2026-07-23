// services/industryMapping.js - provides the canonical industry-mapping workbook
// that Stage 2 (mapper) reads. This file used to be uploaded per run from the
// frontend; it is now bundled with the backend (server/data/industry-mapping.xlsx)
// so the proprietary 190→130 mapping never leaves the server and callers only
// upload their query export.
//
// To update the mapping, replace server/data/industry-mapping.xlsx (it must keep
// an "Industry Mapping" sheet) and restart the server.

const fs = require("fs");
const path = require("path");

const MAPPING_PATH = path.join(__dirname, "..", "data", "industry-mapping.xlsx");

let cachedBuffer = null;

// Read (and cache) the bundled mapping workbook as a Buffer. Throws a clear
// error if the file is missing so a misconfigured deploy fails loudly.
function getIndustryMappingBuffer() {
  if (cachedBuffer) return cachedBuffer;
  try {
    cachedBuffer = fs.readFileSync(MAPPING_PATH);
  } catch (err) {
    throw new Error(
      `Industry mapping workbook not found at ${MAPPING_PATH}. ` +
        "Place the mapping file there (see services/industryMapping.js)."
    );
  }
  return cachedBuffer;
}

module.exports = { getIndustryMappingBuffer, MAPPING_PATH };

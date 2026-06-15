// services/mapper.js — Stage 2: map industries via the reference workbook.
//
// Port of mapper.py.

const { readXlsx } = require("../lib/io");
const { MAPPER_DROP_COLUMNS } = require("../core/config");

const WANTED = ["190_Industry", "SCS Sectors", "Template", "Economic Model"];

// formatted: { columns, rows } from Stage 1 (in-memory replaces Formatted_Data.xlsx).
function runMapper(formatted, mappingBuffer) {
  const dfQuery = formatted; // { columns, rows }

  // Read the "Industry Mapping" sheet; strip whitespace from column names.
  const rawMapping = readXlsx(mappingBuffer, "Industry Mapping");
  const strippedCols = rawMapping.columns.map((c) => String(c).trim());
  // Keep only the WANTED columns that exist (in WANTED order, matching the
  // pandas column-selection which preserves the listed order).
  const keepCols = WANTED.filter((c) => strippedCols.includes(c));
  const mappingRows = rawMapping.rows.map((r) => {
    const obj = {};
    for (let i = 0; i < rawMapping.columns.length; i++) {
      const stripped = strippedCols[i];
      if (keepCols.includes(stripped)) obj[stripped] = r[rawMapping.columns[i]];
    }
    return obj;
  });

  // Build an index on 190_Industry for the left join.
  const hasJoinKey = keepCols.includes("190_Industry");
  const mapIndex = new Map();
  if (hasJoinKey) {
    for (const mr of mappingRows) {
      const key = mr["190_Industry"];
      if (!mapIndex.has(key)) mapIndex.set(key, []);
      mapIndex.get(key).push(mr);
    }
  }

  // LEFT JOIN on Industry == 190_Industry. Cartesian within a key (one output
  // row per matching mapping row); unmatched → single row with null map cols.
  // pandas merge appends the right-frame columns (those not used as the merge
  // key on the left) to the right of the left columns. Here left has no column
  // overlap with the kept mapping columns, so no _x/_y suffixes arise; we still
  // build merged columns = left columns followed by kept mapping columns.
  const mergedColumns = dfQuery.columns.slice();
  for (const c of keepCols) {
    if (!mergedColumns.includes(c)) mergedColumns.push(c);
  }

  const mergedRows = [];
  for (const qrow of dfQuery.rows) {
    const matches = hasJoinKey ? mapIndex.get(qrow["Industry"]) : undefined;
    if (matches && matches.length) {
      for (const mr of matches) {
        const obj = Object.assign({}, qrow);
        for (const c of keepCols) obj[c] = mr[c] === undefined ? null : mr[c];
        mergedRows.push(obj);
      }
    } else {
      const obj = Object.assign({}, qrow);
      for (const c of keepCols) obj[c] = null;
      mergedRows.push(obj);
    }
  }

  // Derived columns (in this insertion order, appended after merged columns).
  for (const c of ["mapped_industry", "SCS_Sector", "KPI_Template"]) {
    if (!mergedColumns.includes(c)) mergedColumns.push(c);
  }
  for (const row of mergedRows) {
    row["mapped_industry"] = "Industry" in row ? row["Industry"] : null;
    row["SCS_Sector"] = "SCS Sectors" in row ? row["SCS Sectors"] : null;
    row["KPI_Template"] = "Template" in row ? row["Template"] : null;
  }

  // Drop MAPPER_DROP_COLUMNS + suffix variants (_x / _y / .1).
  const dropSet = new Set();
  for (const c of mergedColumns) {
    if (
      MAPPER_DROP_COLUMNS.includes(c) ||
      c.endsWith("_x") ||
      c.endsWith("_y") ||
      c.endsWith(".1")
    ) {
      dropSet.add(c);
    }
  }
  let finalColumns = mergedColumns.filter((c) => !dropSet.has(c));

  // dropna(axis=1, how="all"): drop columns entirely null across all rows.
  const nonNull = new Set();
  for (const row of mergedRows) {
    for (const c of finalColumns) {
      if (row[c] !== null && row[c] !== undefined && !Number.isNaN(row[c])) {
        nonNull.add(c);
      }
    }
  }
  // A column with zero rows is dropped too (pandas drops all-NA incl. empty).
  finalColumns = finalColumns.filter((c) => nonNull.has(c));

  const finalRows = mergedRows.map((row) => {
    const obj = {};
    for (const c of finalColumns) obj[c] = row[c] === undefined ? null : row[c];
    return obj;
  });

  return { columns: finalColumns, rows: finalRows };
}

module.exports = { runMapper };

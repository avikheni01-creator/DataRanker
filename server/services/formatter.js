// services/formatter.js — Stage 1: reformat raw query CSV.
//
// Port of formatter.py. For each [outputCol, sourceCol] of dynamic_mapping IN
// INSERTION ORDER: if sourceCol exists in the CSV columns → output[outputCol] =
// that column's values; else output[outputCol] = null for all rows.
// Output column order = dynamic_mapping key order.

const { readCsv } = require("../lib/io");

function runFormat(queryBuffer, dynamicMapping) {
  const { columns: srcCols, rows: srcRows } = readCsv(queryBuffer);
  const srcSet = new Set(srcCols);

  const outColumns = Object.keys(dynamicMapping);
  const outRows = srcRows.map((srcRow) => {
    const obj = {};
    for (const outputCol of outColumns) {
      const sourceCol = dynamicMapping[outputCol];
      if (srcSet.has(sourceCol)) {
        const v = srcRow[sourceCol];
        obj[outputCol] = v === undefined ? null : v;
      } else {
        obj[outputCol] = null;
      }
    }
    return obj;
  });

  return { columns: outColumns, rows: outRows };
}

module.exports = { runFormat };

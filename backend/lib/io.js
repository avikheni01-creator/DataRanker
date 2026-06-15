// lib/io.js — read CSV/XLSX into arrays-of-objects with numeric coercion,
// and write XLSX (via exceljs, so cell fills can be applied).

const XLSX = require("xlsx");
const ExcelJS = require("exceljs");

// Coerce a raw cell value the way pandas read_csv/read_excel dtype inference
// would for our purposes: numeric-looking strings → Number, "" → null,
// everything else stays as-is.
function coerce(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") {
    return Number.isNaN(v) ? null : v;
  }
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    // Numeric? Use a strict-ish test mirroring pandas: integers, floats,
    // scientific notation, leading +/-.
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) return n;
    }
    return v;
  }
  return v;
}

// Read a CSV buffer into { columns: [...], rows: [ {col: val} ] }.
// Uses SheetJS to parse so quoting/escaping matches a real CSV parser.
function readCsv(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", raw: false, codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return sheetToTable(ws);
}

// Read an XLSX buffer; pick a sheet by name or index (default first sheet).
function readXlsx(buffer, sheet) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  let name;
  if (sheet === undefined || sheet === null) {
    name = wb.SheetNames[0];
  } else if (typeof sheet === "number") {
    name = wb.SheetNames[sheet];
  } else {
    name = sheet;
  }
  if (!name || !wb.Sheets[name]) {
    throw new Error(`Worksheet named '${sheet}' not found`);
  }
  return sheetToTable(wb.Sheets[name]);
}

// Read an XLSX where the header is on a given 0-indexed row (skip rows above).
// Mirrors pandas read_excel(header=KPI_HEADER_ROW).
function readXlsxWithHeader(buffer, sheet, headerRow) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  let name;
  if (typeof sheet === "number") name = wb.SheetNames[sheet];
  else name = sheet;
  if (!name || !wb.Sheets[name]) {
    throw new Error(`Worksheet named '${sheet}' not found`);
  }
  const ws = wb.Sheets[name];
  // pandas read_excel(header=N) counts PHYSICAL rows from row 1 (index 0),
  // including blanks. SheetJS, by contrast, reads from the sheet's used range
  // (!ref), which here is "A2:..." because physical row 1 is empty — that would
  // shift every index up by one and pick a data row as the header. So we (a)
  // force the range origin to A1 and (b) keep blankrows:true, so aoa[headerRow]
  // lands on the exact same physical row pandas would use.
  const range = XLSX.utils.decode_range(ws["!ref"]);
  range.s.r = 0;
  range.s.c = 0;
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: true,
    defval: null,
    raw: true,
    range,
  });
  // header is on aoa[headerRow]; data follows.
  const headerArr = aoa[headerRow] || [];
  const columns = headerArr.map((c) => (c === null || c === undefined ? "" : String(c)));
  const rows = [];
  for (let r = headerRow + 1; r < aoa.length; r++) {
    const rawRow = aoa[r];
    if (!rawRow) continue;
    const obj = {};
    let allNull = true;
    for (let c = 0; c < columns.length; c++) {
      const val = coerce(rawRow[c] === undefined ? null : rawRow[c]);
      obj[columns[c]] = val;
      if (val !== null) allNull = false;
    }
    if (allNull) continue; // pandas skips fully-blank trailing rows
    rows.push(obj);
  }
  return { columns, rows };
}

// Convert a SheetJS worksheet to a table using the first row as header.
function sheetToTable(ws) {
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: false,
    defval: null,
    raw: true,
  });
  if (aoa.length === 0) return { columns: [], rows: [] };
  const headerArr = aoa[0];
  const columns = headerArr.map((c) => (c === null || c === undefined ? "" : String(c)));
  const rows = [];
  for (let r = 1; r < aoa.length; r++) {
    const rawRow = aoa[r];
    if (!rawRow) continue;
    const obj = {};
    let allNull = true;
    for (let c = 0; c < columns.length; c++) {
      const val = coerce(rawRow[c] === undefined ? null : rawRow[c]);
      obj[columns[c]] = val;
      if (val !== null) allNull = false;
    }
    if (allNull) continue;
    rows.push(obj);
  }
  return { columns, rows };
}

// Build and return XLSX bytes from a list of sheets.
// sheets: [ { name, columns: [...], rows: [ {col:val} ], fills: [{colIndex,argb}] } ]
// fills apply to data rows (Excel rows 2..N+1) of the given 0-based column index.
async function writeXlsx(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    // Header row.
    ws.addRow(sheet.columns);
    // Data rows.
    for (const row of sheet.rows) {
      const values = sheet.columns.map((c) => {
        const v = row[c];
        return v === null || v === undefined ? null : v;
      });
      ws.addRow(values);
    }
    // Fills: only data rows (Excel rows 2..N+1).
    if (sheet.fills && sheet.fills.length) {
      const nRows = sheet.rows.length;
      for (const f of sheet.fills) {
        for (let r = 2; r <= nRows + 1; r++) {
          const cell = ws.getCell(r, f.colIndex + 1);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: f.argb },
          };
        }
      }
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

module.exports = {
  coerce,
  readCsv,
  readXlsx,
  readXlsxWithHeader,
  writeXlsx,
};

// services/pdfReport.js - generate a styled rankings-summary PDF using pdfkit.
// Input: [{ template, companies: [{ rank, symbol, name, sector, score }] }]
// Output: a Buffer containing a PDF document.

const PDFDocument = require("pdfkit");

const BRAND   = "#4F46E5";
const DARK    = "#111827";
const MED     = "#374151";
const MUTED   = "#6B7280";
const LIGHT   = "#9CA3AF";
const BG_ROW  = "#F9FAFB";
const BG_HEAD = "#EEF2FF";
const GREEN   = "#059669";
const PAGE_W  = 595.28; // A4 width in pts
const PAGE_H  = 841.89; // A4 height in pts
const MARGIN  = 48;
const COL_W   = PAGE_W - MARGIN * 2;

// Column x positions within the content area
const COL = {
  rank:    MARGIN,
  company: MARGIN + 38,
  sector:  MARGIN + 270,
  score:   MARGIN + 450,
};

function drawFooter(doc, pageNum, totalPages, date) {
  // Draw footer rect and text using absolute coordinates.
  const footerY = PAGE_H - 36;
  doc.rect(0, footerY, PAGE_W, 36).fill("#F9FAFB");
  // Writing text below the bottom margin makes pdfkit auto-insert a fresh
  // (blank) page. Temporarily drop the bottom margin to 0 so the footer text
  // stays on the current page and no trailing blank page is created.
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc
    .font("Helvetica").fontSize(8).fillColor(LIGHT)
    .text(
      `ThinkVest equity ranking platform  ·  ${date}  ·  Page ${pageNum} of ${totalPages}`,
      MARGIN, PAGE_H - 22,
      { align: "center", width: COL_W, lineBreak: false }
    );
  doc.page.margins.bottom = savedBottom;
}

function generateRankingsPDF(templateData) {
  return new Promise((resolve) => {
    const totalPages = templateData.length || 1;

    const doc = new PDFDocument({
      margin: MARGIN,
      size: "A4",
      autoFirstPage: true,
      // No bufferPages - footers are drawn inline so we don't need switchToPage
    });

    const buffers = [];
    doc.on("data", (b) => buffers.push(b));
    doc.on("end",  () => resolve(Buffer.concat(buffers)));

    const date = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    // ── Cover / first-page header ─────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 5).fill(BRAND);

    doc.font("Helvetica-Bold").fontSize(28).fillColor(BRAND)
      .text("ThinkVest", MARGIN, 28);
    doc.font("Helvetica").fontSize(13).fillColor(MED)
      .text("Equity Rankings Report", MARGIN, 64);
    doc.font("Helvetica").fontSize(10).fillColor(LIGHT)
      .text(date, MARGIN, 84);

    doc.rect(MARGIN, 106, COL_W, 1).fill("#E5E7EB");

    // ── One section per template ──────────────────────────────────────────────
    templateData.forEach(({ template, companies }, tIdx) => {
      if (tIdx > 0) {
        doc.addPage();
      } else {
        doc.y = 120;
      }

      renderTemplateSection(doc, template, companies);
      drawFooter(doc, tIdx + 1, totalPages, date);
    });

    doc.end();
  });
}

function renderTemplateSection(doc, template, companies) {
  const y0 = doc.y;

  // Template header band
  doc.rect(MARGIN, y0, COL_W, 30).fill(BG_HEAD);
  doc
    .font("Helvetica-Bold").fontSize(13).fillColor(BRAND)
    .text(template, MARGIN + 10, y0 + 8, { width: COL_W - 80 });
  doc
    .font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(`Top ${companies.length} ranked`, PAGE_W - MARGIN - 100, y0 + 11, { width: 90, align: "right" });

  // Column headers
  const hdrY = y0 + 38;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(LIGHT);
  doc.text("RANK",    COL.rank,    hdrY, { width: 32,  align: "center" });
  doc.text("COMPANY", COL.company, hdrY, { width: 228 });
  doc.text("SECTOR",  COL.sector,  hdrY, { width: 170 });
  doc.text("SCORE",   COL.score,   hdrY, { width: 45,  align: "right" });

  doc.rect(MARGIN, hdrY + 12, COL_W, 0.75).fill("#E5E7EB");

  // Rows
  const ROW_H = 28;
  companies.forEach((c, i) => {
    const rowY = hdrY + 16 + i * ROW_H;

    if (i % 2 === 1) doc.rect(MARGIN, rowY - 2, COL_W, ROW_H).fill(BG_ROW);

    const rankColor = i < 3 ? BRAND : MED;
    doc
      .font("Helvetica-Bold").fontSize(11).fillColor(rankColor)
      .text(`#${c.rank}`, COL.rank, rowY + 4, { width: 32, align: "center" });

    doc
      .font("Helvetica-Bold").fontSize(10).fillColor(DARK)
      .text(c.name, COL.company, rowY + 2, { width: 226, ellipsis: true, lineBreak: false });
    doc
      .font("Helvetica").fontSize(8).fillColor(MUTED)
      .text(c.symbol, COL.company, rowY + 14, { width: 226, lineBreak: false });

    doc
      .font("Helvetica").fontSize(9).fillColor(MED)
      .text(c.sector, COL.sector, rowY + 4, { width: 170, ellipsis: true, lineBreak: false });

    doc
      .font("Helvetica-Bold").fontSize(11).fillColor(GREEN)
      .text(c.score, COL.score, rowY + 4, { width: 45, align: "right" });
  });

  // Bottom rule
  const bottomY = hdrY + 16 + companies.length * ROW_H + 4;
  doc.rect(MARGIN, bottomY, COL_W, 0.75).fill("#E5E7EB");
  doc.y = bottomY + 12;
}

module.exports = { generateRankingsPDF };

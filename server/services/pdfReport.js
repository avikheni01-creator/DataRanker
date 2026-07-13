// services/pdfReport.js — generate a styled rankings-summary PDF using pdfkit.
// Input: [{ template, companies: [{ rank, symbol, name, sector, score }] }]
// Output: a Buffer containing a PDF document.

const PDFDocument = require("pdfkit");

const BRAND   = "#7C6CFF";
const DARK    = "#111827";
const MED     = "#374151";
const MUTED   = "#6B7280";
const LIGHT   = "#9CA3AF";
const BG_ROW  = "#F9FAFB";
const BG_HEAD = "#EEF2FF";
const GREEN   = "#059669";
const PAGE_W  = 595.28; // A4 width in pts
const MARGIN  = 48;
const COL_W   = PAGE_W - MARGIN * 2; // 499.28

// Column x positions within the content area
const COL = {
  rank:    MARGIN,
  company: MARGIN + 38,
  sector:  MARGIN + 270,
  score:   MARGIN + 450,
};

function generateRankingsPDF(templateData) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", autoFirstPage: true, bufferPages: true });
    const buffers = [];
    doc.on("data", (b) => buffers.push(b));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const date = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    // ── Cover / first-page header ─────────────────────────────────────────────
    // Top accent bar
    doc.rect(0, 0, PAGE_W, 5).fill(BRAND);

    doc.font("Helvetica-Bold").fontSize(32).fillColor(BRAND).text("Matrix", MARGIN, 28);
    doc.font("Helvetica").fontSize(14).fillColor(MED).text("Equity Rankings Report", MARGIN, 68);
    doc.font("Helvetica").fontSize(10).fillColor(LIGHT).text(date, MARGIN, 88);

    // Thin separator
    doc.rect(MARGIN, 110, COL_W, 1).fill("#E5E7EB");
    doc.moveDown(0.5);

    // ── One section per template ──────────────────────────────────────────────
    templateData.forEach(({ template, companies }, tIdx) => {
      if (tIdx > 0) doc.addPage();
      else {
        // Advance below the header on the first page
        doc.y = 126;
        doc.moveDown(0.5);
      }

      renderTemplateSection(doc, template, companies, date);
    });

    // Footer on each page — must run before flushPages/end because bufferPages:true
    // keeps all pages in memory until we explicitly flush.
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      doc.rect(0, doc.page.height - 36, PAGE_W, 36).fill("#F9FAFB");
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(LIGHT)
        .text(
          `Matrix equity ranking platform  ·  ${date}  ·  Page ${i + 1} of ${totalPages}`,
          MARGIN, doc.page.height - 22,
          { align: "center", width: COL_W }
        );
    }

    doc.flushPages();
    doc.end();
  });
}

function renderTemplateSection(doc, template, companies, date) {
  const y0 = doc.y;

  // Template header band
  doc.rect(MARGIN, y0, COL_W, 30).fill(BG_HEAD);
  doc
    .font("Helvetica-Bold").fontSize(13).fillColor("#4F46E5")
    .text(template, MARGIN + 10, y0 + 6, { width: COL_W - 80 });
  doc
    .font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(`Top ${companies.length} ranked companies`, PAGE_W - MARGIN - 100, y0 + 10, { width: 90, align: "right" });

  // Column headers
  const hdrY = y0 + 38;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(LIGHT);
  doc.text("RANK",    COL.rank,    hdrY, { width: 32,  align: "center" });
  doc.text("COMPANY", COL.company, hdrY, { width: 228 });
  doc.text("SECTOR",  COL.sector,  hdrY, { width: 170 });
  doc.text("SCORE",   COL.score,   hdrY, { width: 45,  align: "right" });

  // Header underline
  doc.rect(MARGIN, hdrY + 12, COL_W, 0.75).fill("#E5E7EB");

  // Rows
  const ROW_H = 28;
  companies.forEach((c, i) => {
    const rowY = hdrY + 16 + i * ROW_H;

    // Alternating row background
    if (i % 2 === 1) doc.rect(MARGIN, rowY - 2, COL_W, ROW_H).fill(BG_ROW);

    // Rank — purple for podium
    const rankColor = i < 3 ? BRAND : MED;
    doc
      .font("Helvetica-Bold").fontSize(11).fillColor(rankColor)
      .text(`#${c.rank}`, COL.rank, rowY + 4, { width: 32, align: "center" });

    // Company name
    doc
      .font("Helvetica-Bold").fontSize(10).fillColor(DARK)
      .text(c.name, COL.company, rowY + 2, { width: 226, ellipsis: true, lineBreak: false });
    // Symbol on second line
    doc
      .font("Helvetica").fontSize(8).fillColor(MUTED)
      .text(c.symbol, COL.company, rowY + 14, { width: 226 });

    // Sector
    doc
      .font("Helvetica").fontSize(9).fillColor(MED)
      .text(c.sector, COL.sector, rowY + 4, { width: 170, ellipsis: true, lineBreak: false });

    // Score
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

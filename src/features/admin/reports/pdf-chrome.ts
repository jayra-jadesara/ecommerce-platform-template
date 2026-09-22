import { jsPDF } from "jspdf";
import type { ReportPdfBrand, ReportRange } from "@/features/admin/reports/types";
import {
  fitImage,
  formatPdfDateTime,
  loadPdfImage,
  themeFromColors,
  type PdfImage,
  type PdfTheme,
} from "@/features/admin/reports/pdf-utils";

export const PDF_MARGIN = 40;
export const PDF_HEADER_H = 88;
export const PDF_FOOTER_H = 36;

export type ReportDocContext = {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  contentW: number;
  theme: PdfTheme;
  brandName: string;
  brandTagline?: string;
  logo: PdfImage | null;
  reportTitle: string;
  range: ReportRange;
  generatedAt: string;
  contentTop: number;
  contentBottom: number;
};

export async function createReportDoc(
  brand: ReportPdfBrand,
  reportTitle: string,
  range: ReportRange,
): Promise<ReportDocContext> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const theme = themeFromColors(brand.colors);
  const logo = brand.logoUrl
    ? await loadPdfImage(brand.logoUrl, 220)
    : null;

  const ctx: ReportDocContext = {
    doc,
    pageW,
    pageH,
    margin,
    contentW: pageW - margin * 2,
    theme,
    brandName: brand.brandName,
    brandTagline: brand.brandTagline,
    logo,
    reportTitle,
    range,
    generatedAt: formatPdfDateTime(),
    contentTop: margin + PDF_HEADER_H + 18,
    contentBottom: pageH - margin - PDF_FOOTER_H,
  };

  startReportPage(ctx);
  return ctx;
}

/** Premium branded header band (matches receipt PDF style). */
export function startReportPage(ctx: ReportDocContext) {
  const {
    doc,
    pageW,
    pageH,
    margin,
    theme,
    brandName,
    brandTagline,
    logo,
    reportTitle,
    range,
    generatedAt,
  } = ctx;

  doc.setFillColor(theme.surface.r, theme.surface.g, theme.surface.b);
  doc.rect(0, 0, pageW, pageH, "F");

  // Primary brand band
  doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.rect(0, 0, pageW, 56, "F");

  let brandTextX = margin;
  if (logo) {
    const { w, h } = fitImage(logo, 48, 36);
    const logoY = 10 + (36 - h) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin - 3, logoY - 3, w + 6, h + 6, 3, 3, "F");
    try {
      doc.addImage(logo.dataUrl, logo.format, margin, logoY, w, h);
      brandTextX = margin + w + 12;
    } catch {
      /* text-only */
    }
  }

  doc.setTextColor(theme.onPrimary.r, theme.onPrimary.g, theme.onPrimary.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(brandName || "Store", brandTextX, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    brandTagline?.trim() || "Management report",
    brandTextX,
    40,
  );

  // Report badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageW - margin - 88, 14, 88, 28, 14, 14, "F");
  doc.setTextColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("REPORT", pageW - margin - 44, 32, { align: "center" });

  // Title block below band
  doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(reportTitle, margin, 78);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
  doc.text(`Period: ${range.label}`, margin, 90);
  doc.text(`Generated: ${generatedAt}`, pageW - margin, 90, { align: "right" });

  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.setLineWidth(0.6);
  doc.line(margin, PDF_HEADER_H + margin - 8, pageW - margin, PDF_HEADER_H + margin - 8);
}

function drawFooterOnly(ctx: ReportDocContext, page: number, total: number) {
  const { doc, pageW, pageH, margin, theme, brandName, reportTitle } = ctx;
  const y = pageH - margin - 8;

  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, y - 14, pageW - margin, y - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
  doc.text(
    `${brandName} · ${reportTitle} · Confidential — internal use only`,
    margin,
    y,
  );
  doc.text(`Page ${page} of ${total}`, pageW - margin, y, { align: "right" });
}

export function finalizeReportPages(ctx: ReportDocContext) {
  const total = ctx.doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    ctx.doc.setPage(page);
    drawFooterOnly(ctx, page, total);
  }
}

export function ensureSpace(
  ctx: ReportDocContext,
  y: number,
  needed: number,
): number {
  if (y + needed <= ctx.contentBottom) return y;
  ctx.doc.addPage();
  startReportPage(ctx);
  return ctx.contentTop;
}

/** Extra vertical breathing room between major PDF sections. */
export function sectionGap(y: number, size = 22): number {
  return y + size;
}

export function drawSectionTitle(
  ctx: ReportDocContext,
  title: string,
  y: number,
  subtitle?: string,
): number {
  y = ensureSpace(ctx, y + 8, subtitle ? 40 : 28);
  const { doc, margin, theme } = ctx;

  doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.rect(margin, y - 10, 3, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
  doc.text(title, margin + 10, y);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text(subtitle, margin + 10, y + 12);
    return y + 30;
  }
  return y + 20;
}

/** Hero metric banner — primary number for the report. */
export function drawHeroMetric(
  ctx: ReportDocContext,
  y: number,
  label: string,
  value: string,
  note?: string,
): number {
  y = ensureSpace(ctx, y, 68);
  const { doc, margin, contentW, theme } = ctx;

  doc.setFillColor(theme.card.r, theme.card.g, theme.card.b);
  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.roundedRect(margin, y, contentW, 58, 8, 8, "FD");
  doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.rect(margin, y, 4, 58, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
  doc.text(label.toUpperCase(), margin + 16, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
  doc.text(value, margin + 16, y + 44);

  if (note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text(note, margin + contentW - 12, y + 44, { align: "right" });
  }

  return sectionGap(y + 58, 18);
}

export function drawStatRow(
  ctx: ReportDocContext,
  y: number,
  items: Array<{
    label: string;
    value: string;
    hint?: string;
    /** Accent the value with a theme token (e.g. profit → success). */
    tone?: "primary" | "secondary" | "success" | "warning" | "error";
  }>,
): number {
  const { doc, margin, contentW, theme } = ctx;
  const cols = Math.min(items.length, 4);
  const gap = 8;
  const colW = (contentW - gap * (cols - 1)) / cols;
  const rowH = 46;

  const toneColor = (
    tone?: "primary" | "secondary" | "success" | "warning" | "error",
  ) => {
    if (tone === "secondary") return theme.secondary;
    if (tone === "success") return theme.success;
    if (tone === "warning") return theme.warning;
    if (tone === "error") return theme.error;
    if (tone === "primary") return theme.primary;
    return theme.foreground;
  };

  let cursorY = y;
  for (let i = 0; i < items.length; i += cols) {
    cursorY = ensureSpace(ctx, cursorY, rowH + 6);
    const slice = items.slice(i, i + cols);
    for (let c = 0; c < slice.length; c += 1) {
      const item = slice[c]!;
      const x = margin + c * (colW + gap);
      const accent = item.tone ? toneColor(item.tone) : null;

      doc.setFillColor(theme.card.r, theme.card.g, theme.card.b);
      doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
      doc.roundedRect(x, cursorY - 10, colW, rowH, 5, 5, "FD");
      if (accent) {
        doc.setFillColor(accent.r, accent.g, accent.b);
        doc.rect(x, cursorY - 10, 3, rowH, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
      doc.text(item.label.toUpperCase(), x + 8, cursorY + 2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const valueColor = accent ?? theme.foreground;
      doc.setTextColor(valueColor.r, valueColor.g, valueColor.b);
      const valLines = doc.splitTextToSize(item.value, colW - 16) as string[];
      doc.text(valLines[0] ?? "", x + 8, cursorY + 18);

      if (item.hint) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
        doc.text(item.hint, x + 8, cursorY + 30);
      }
    }
    cursorY += rowH + 6;
  }

  return sectionGap(cursorY, 16);
}

export function drawInsightBullets(
  ctx: ReportDocContext,
  y: number,
  bullets: string[],
): number {
  if (!bullets.length) return y;
  y = ensureSpace(ctx, y, 20 + bullets.length * 14);
  const { doc, margin, contentW, theme } = ctx;

  doc.setFillColor(theme.card.r, theme.card.g, theme.card.b);
  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.roundedRect(margin, y - 4, contentW, 8 + bullets.length * 14, 6, 6, "FD");
  doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.rect(margin, y - 4, 3, 8 + bullets.length * 14, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);

  let cy = y + 8;
  for (const bullet of bullets) {
    doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
    doc.circle(margin + 10, cy - 2, 2, "F");
    const lines = doc.splitTextToSize(bullet, contentW - 28) as string[];
    doc.text(lines[0] ?? "", margin + 18, cy);
    cy += 14;
  }
  return sectionGap(cy, 16);
}

type TableColumn = {
  key: string;
  label: string;
  weight: number;
  align?: "left" | "right" | "center";
};

function columnWidths(
  ctx: ReportDocContext,
  columns: TableColumn[],
): Array<{ key: string; label: string; width: number; align?: "left" | "right" | "center" }> {
  const totalWeight = columns.reduce((s, c) => s + c.weight, 0);
  return columns.map((col) => ({
    key: col.key,
    label: col.label,
    width: (col.weight / totalWeight) * ctx.contentW,
    align: col.align,
  }));
}

export function drawPremiumTable(
  ctx: ReportDocContext,
  y: number,
  columns: TableColumn[],
  rows: Array<Record<string, string>>,
  options?: {
    totals?: Record<string, string>;
    emptyMessage?: string;
  },
): number {
  const { doc, margin, contentW, theme } = ctx;
  const resolved = columnWidths(ctx, columns);
  const rowH = 17;
  const headerH = 20;

  if (!rows.length) {
    y = ensureSpace(ctx, y, 24);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text(options?.emptyMessage ?? "No data for this period.", margin, y);
    return y + 16;
  }

  // Table container top
  y = ensureSpace(ctx, y, headerH + rowH);
  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y - 12, contentW, headerH, 3, 3, "S");

  doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.roundedRect(margin, y - 12, contentW, headerH, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(theme.onPrimary.r, theme.onPrimary.g, theme.onPrimary.b);

  let hx = margin;
  for (const col of resolved) {
    const align = col.align ?? "left";
    const tx =
      align === "right"
        ? hx + col.width - 8
        : align === "center"
          ? hx + col.width / 2
          : hx + 8;
    doc.text(col.label, tx, y, { align });
    hx += col.width;
  }
  y += headerH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let i = 0; i < rows.length; i += 1) {
    y = ensureSpace(ctx, y, rowH + 2);
    const row = rows[i]!;

    if (i % 2 === 0) {
      doc.setFillColor(theme.card.r, theme.card.g, theme.card.b);
      doc.rect(margin, y - 11, contentW, rowH, "F");
    }

    doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
    let cx = margin;
    for (const col of resolved) {
      const align = col.align ?? "left";
      const tx =
        align === "right"
          ? cx + col.width - 8
          : align === "center"
            ? cx + col.width / 2
            : cx + 8;
      const raw = row[col.key] ?? "";
      const text =
        align === "left"
          ? ((doc.splitTextToSize(raw, col.width - 12) as string[])[0] ?? "")
          : raw;
      doc.text(text, tx, y, { align });
      cx += col.width;
    }
    y += rowH;
  }

  if (options?.totals) {
    y = ensureSpace(ctx, y, rowH + 4);
    doc.setFillColor(theme.surface.r, theme.surface.g, theme.surface.b);
    doc.rect(margin, y - 11, contentW, rowH, "F");
    doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
    doc.line(margin, y - 11, margin + contentW, y - 11);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
    let cx = margin;
    for (const col of resolved) {
      const align = col.align ?? "left";
      const tx =
        align === "right"
          ? cx + col.width - 8
          : align === "center"
            ? cx + col.width / 2
            : cx + 8;
      doc.text(options.totals[col.key] ?? "", tx, y, { align });
      cx += col.width;
    }
    y += rowH;
  }

  return sectionGap(y, 16);
}

/** @deprecated use drawPremiumTable */
export function drawTable(
  ctx: ReportDocContext,
  y: number,
  columns: Array<{
    key: string;
    label: string;
    width: number;
    align?: "left" | "right";
  }>,
  rows: Array<Record<string, string>>,
): number {
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  return drawPremiumTable(
    ctx,
    y,
    columns.map((c) => ({
      key: c.key,
      label: c.label,
      weight: c.width / totalW,
      align: c.align,
    })),
    rows,
  );
}

/** @deprecated use drawStatRow */
export function drawKeyValueGrid(
  ctx: ReportDocContext,
  y: number,
  items: Array<{ label: string; value: string }>,
  cols = 2,
): number {
  return drawStatRow(
    ctx,
    y,
    items.map((item) => ({ label: item.label, value: item.value })),
  );
}

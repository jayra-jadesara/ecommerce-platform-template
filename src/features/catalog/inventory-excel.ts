import ExcelJS from "exceljs";
import type { AdminInventoryRow } from "@/features/catalog/inventory-types";

function hexToArgb(input: string | undefined, fallback = "FFB91C1C"): string {
  if (!input) return fallback;
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `FF${raw.toUpperCase()}`;
  if (/^[0-9a-fA-F]{8}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[0]!;
    const g = raw[1]!;
    const b = raw[2]!;
    return `FF${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

function statusLabel(status: AdminInventoryRow["status"]): string {
  switch (status) {
    case "IN_STOCK":
      return "OK";
    case "LOW_STOCK":
      return "Running low";
    case "OUT_OF_STOCK":
      return "Sold out";
    default:
      return "Not counting";
  }
}

export type InventoryExcelTheme = {
  brandName: string;
  primary: string;
  foreground: string;
  muted: string;
  surface: string;
  card: string;
  border: string;
  success: string;
  warning: string;
  error: string;
};

export type InventoryExcelBuildInput = {
  rows: AdminInventoryRow[];
  theme: InventoryExcelTheme;
  filterLabel: string;
  alertStockLimit: number;
  exportedAt: string;
};

/** Branded inventory workbook — AutoFilter + sized columns; Import sheet for re-upload. */
export async function buildInventoryWorkbook(
  input: InventoryExcelBuildInput,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = input.theme.brandName || "Store";
  wb.created = new Date();

  const primary = hexToArgb(input.theme.primary);
  const foreground = hexToArgb(input.theme.foreground, "FF111111");
  const muted = hexToArgb(input.theme.muted, "FF6B7280");
  const surface = hexToArgb(input.theme.surface, "FFF3F4F6");
  const card = hexToArgb(input.theme.card, "FFFFFFFF");
  const border = hexToArgb(input.theme.border, "FFE5E7EB");
  const success = hexToArgb(input.theme.success, "FF16A34A");
  const warning = hexToArgb(input.theme.warning, "FFD97706");
  const error = hexToArgb(input.theme.error, "FFDC2626");

  const thinBorder = {
    top: { style: "thin" as const, color: { argb: border } },
    left: { style: "thin" as const, color: { argb: border } },
    bottom: { style: "thin" as const, color: { argb: border } },
    right: { style: "thin" as const, color: { argb: border } },
  };

  // —— Sheet 1: Inventory (readable report) ——
  const sheet = wb.addWorksheet("Inventory", {
    views: [{ state: "frozen", ySplit: 5 }],
    properties: { defaultRowHeight: 18 },
  });

  sheet.mergeCells("A1:F1");
  const title = sheet.getCell("A1");
  title.value = input.theme.brandName || "Inventory";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: primary },
  };
  title.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells("A2:F2");
  const subtitle = sheet.getCell("A2");
  subtitle.value = `Inventory export · ${input.exportedAt}`;
  subtitle.font = { size: 11, color: { argb: muted } };
  subtitle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: surface },
  };

  sheet.mergeCells("A3:F3");
  const filters = sheet.getCell("A3");
  filters.value = `Filters: ${input.filterLabel}  ·  Alert stock limit: ${input.alertStockLimit}  ·  Rows: ${input.rows.length}`;
  filters.font = { size: 10, color: { argb: foreground } };
  filters.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: surface },
  };

  sheet.mergeCells("A4:F4");
  const tip = sheet.getCell("A4");
  tip.value =
    "Tip: Edit how_many on the Import sheet (or this table), keep sku the same, then use Import on Inventory.";
  tip.font = { size: 9, italic: true, color: { argb: muted } };

  const headerRow = 5;
  const headers = [
    "sku",
    "product",
    "size",
    "how_many",
    "left_to_sell",
    "status",
  ] as const;
  const widths = [18, 32, 16, 12, 14, 14];

  headers.forEach((key, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = key;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: primary },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
    sheet.getColumn(i + 1).width = widths[i];
  });
  sheet.getRow(headerRow).height = 22;

  input.rows.forEach((row, index) => {
    const r = headerRow + 1 + index;
    const values = [
      row.sku,
      row.productName,
      row.variantName,
      row.trackInventory ? row.quantity : "",
      row.trackInventory ? row.available : "",
      statusLabel(row.status),
    ];
    values.forEach((value, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = value;
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: i >= 3 && i <= 4 ? "right" : "left",
      };
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: surface },
        };
      } else {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: card },
        };
      }
      if (i === 5) {
        if (row.status === "OUT_OF_STOCK") {
          cell.font = { color: { argb: error }, bold: true };
        } else if (row.status === "LOW_STOCK") {
          cell.font = { color: { argb: warning }, bold: true };
        } else if (row.status === "IN_STOCK") {
          cell.font = { color: { argb: success } };
        }
      }
    });
  });

  const lastDataRow = headerRow + Math.max(input.rows.length, 1);
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastDataRow, column: headers.length },
  };

  // —— Sheet 2: Import (clean for re-upload) ——
  const importSheet = wb.addWorksheet("Import", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const importHeaders = ["sku", "how_many"] as const;
  importHeaders.forEach((key, i) => {
    const cell = importSheet.getCell(1, i + 1);
    cell.value = key;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: primary },
    };
    cell.border = thinBorder;
    importSheet.getColumn(i + 1).width = i === 0 ? 22 : 12;
  });

  const tracked = input.rows.filter((r) => r.sku && r.trackInventory);
  tracked.forEach((row, index) => {
    const r = index + 2;
    importSheet.getCell(r, 1).value = row.sku;
    importSheet.getCell(r, 2).value = row.quantity;
    importSheet.getCell(r, 1).border = thinBorder;
    importSheet.getCell(r, 2).border = thinBorder;
  });
  if (tracked.length) {
    importSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: tracked.length + 1, column: 2 },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/** Find sku + how_many columns in an uploaded workbook (Inventory or Import sheet). */
export async function extractInventoryUpdatesFromXlsx(
  data: ArrayBuffer,
): Promise<Array<{ sku: string; quantity: number }> | { error: string }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);

  const preferred =
    wb.getWorksheet("Import") ??
    wb.getWorksheet("Inventory") ??
    wb.worksheets[0];
  if (!preferred) return { error: "Excel file has no sheets." };

  let headerRow = 0;
  let skuCol = -1;
  let qtyCol = -1;

  preferred.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (headerRow) return;
    const values = row.values;
    if (!Array.isArray(values)) return;
    const cells = values.map((v) =>
      String(v ?? "")
        .trim()
        .toLowerCase(),
    );
    const s = cells.findIndex((h) => h === "sku");
    const q = cells.findIndex(
      (h) => h === "how_many" || h === "quantity" || h === "qty",
    );
    if (s > 0 && q > 0) {
      headerRow = rowNumber;
      skuCol = s;
      qtyCol = q;
    }
  });

  if (!headerRow || skuCol < 0 || qtyCol < 0) {
    return {
      error:
        "Excel must include sku and how_many columns (use the Import sheet from Export).",
    };
  }

  const updates: Array<{ sku: string; quantity: number }> = [];
  preferred.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const sku = String(row.getCell(skuCol).value ?? "").trim();
    const raw = row.getCell(qtyCol).value;
    if (!sku) return;
    const quantity =
      typeof raw === "number"
        ? raw
        : Number(String(raw ?? "").replace(/,/g, "").trim());
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      return;
    }
    updates.push({ sku, quantity });
  });

  if (!updates.length) {
    return { error: "No rows to import." };
  }
  return updates;
}

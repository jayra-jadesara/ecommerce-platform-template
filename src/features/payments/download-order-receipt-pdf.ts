import { jsPDF } from "jspdf";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import type { OrderItemView } from "@/features/orders/types";
import {
  orderStatusTone,
  paymentStatusTone,
  type PaymentStatusTone,
} from "@/features/payments/components/payment-status-ui";
import {
  receiptTotalRows,
  type ReceiptTotals,
} from "@/features/payments/receipt-totals";
import type { ColorTokens } from "@/types/config";

export type ReceiptPdfInput = {
  brandName: string;
  brandTagline?: string;
  logoUrl?: string;
  colors: ColorTokens;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  items: OrderItemView[];
  shippingAddress: ShippingAddressSnapshot;
  totals: ReceiptTotals;
};

type PdfImage = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 180, g: 40, b: 40 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Helvetica cannot render ₹ — use ASCII-safe currency for PDF. */
function formatPdfMoney(amount: number, currency: string): string {
  const code = (currency || "INR").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (code === "INR") return `Rs. ${formatted}`;
  return `${code} ${formatted}`;
}

function formatAddressLines(address: ShippingAddressSnapshot): string[] {
  return [
    address.fullName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line?.trim()));
}

async function loadPdfImage(
  url: string,
  maxEdge = 256,
): Promise<PdfImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Failed to decode image"));
        el.src = objectUrl;
      });

      const srcW = img.naturalWidth || 1;
      const srcH = img.naturalHeight || 1;
      const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
      const width = Math.max(1, Math.round(srcW * scale));
      const height = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const preferJpeg = blob.type.toLowerCase().includes("jpeg")
        || blob.type.toLowerCase().includes("jpg");
      const dataUrl = preferJpeg
        ? canvas.toDataURL("image/jpeg", 0.88)
        : canvas.toDataURL("image/png");

      return {
        dataUrl,
        format: preferJpeg ? "JPEG" : "PNG",
        width,
        height,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function fitImage(
  img: PdfImage,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  return {
    w: Math.max(10, img.width * scale),
    h: Math.max(10, img.height * scale),
  };
}

/** Build and download a themed payment receipt PDF. */
export async function downloadOrderReceiptPdf(
  input: ReceiptPdfInput,
): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;

  const primary = hexToRgb(
    input.colors.buttonBackground || input.colors.primary,
  );
  const onPrimary = hexToRgb(input.colors.buttonForeground || "#ffffff");
  const success = hexToRgb(input.colors.success);
  const warning = hexToRgb(input.colors.warning);
  const error = hexToRgb(input.colors.error);
  const muted = hexToRgb(input.colors.muted);
  const foreground = hexToRgb(input.colors.foreground);
  const surface = hexToRgb(input.colors.surface);
  const border = hexToRgb(input.colors.border);
  const card = hexToRgb(input.colors.card);

  const toneRgb = (tone: PaymentStatusTone) => {
    if (tone === "success") return success;
    if (tone === "error") return error;
    if (tone === "warning") return warning;
    return muted;
  };
  const payTone = toneRgb(paymentStatusTone(input.paymentStatus));
  const ordTone = toneRgb(orderStatusTone(input.orderStatus));

  const [logo, ...itemImages] = await Promise.all([
    input.logoUrl ? loadPdfImage(input.logoUrl, 220) : Promise.resolve(null),
    ...input.items.map((item) =>
      item.imageUrl ? loadPdfImage(item.imageUrl, 160) : Promise.resolve(null),
    ),
  ]);

  // Soft page background (theme surface)
  doc.setFillColor(surface.r, surface.g, surface.b);
  doc.rect(0, 0, pageW, pageH, "F");

  // Compact brand header strip
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, pageW, 72, "F");

  let brandTextX = margin;
  if (logo) {
    const { w, h } = fitImage(logo, 56, 40);
    const logoX = margin;
    const logoY = 16 + (40 - h) / 2;
    // White plate behind logo for contrast
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoX - 4, logoY - 4, w + 8, h + 8, 4, 4, "F");
    try {
      doc.addImage(logo.dataUrl, logo.format, logoX, logoY, w, h);
      brandTextX = margin + w + 16;
    } catch {
      // keep text-only brand
    }
  }

  doc.setTextColor(onPrimary.r, onPrimary.g, onPrimary.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(input.brandName || "Store", brandTextX, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const tagline = input.brandTagline?.trim() || "Payment receipt";
  doc.text(tagline, brandTextX, 48);

  // Paid badge — theme success (not brand primary)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageW - margin - 70, 22, 70, 28, 14, 14, "F");
  doc.setFillColor(success.r, success.g, success.b);
  doc.circle(pageW - margin - 54, 36, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("OK", pageW - margin - 54, 38.5, { align: "center" });
  doc.setTextColor(success.r, success.g, success.b);
  doc.setFontSize(9);
  doc.text("PAID", pageW - margin - 18, 39, { align: "center" });

  let y = 98;

  // Title row
  doc.setTextColor(foreground.r, foreground.g, foreground.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Receipt", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(muted.r, muted.g, muted.b);
  doc.text(`Order ${input.orderNumber}`, margin, y + 16);
  doc.text(
    new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    pageW - margin,
    y + 16,
    { align: "right" },
  );

  y += 34;

  // Amount banner
  doc.setFillColor(card.r, card.g, card.b);
  doc.setDrawColor(border.r, border.g, border.b);
  doc.roundedRect(margin, y, contentW, 58, 8, 8, "FD");
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(margin, y, 4, 58, "F");

  doc.setTextColor(muted.r, muted.g, muted.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("AMOUNT PAID", margin + 18, y + 20);

  doc.setTextColor(foreground.r, foreground.g, foreground.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(formatPdfMoney(input.amount, input.currency), margin + 18, y + 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(payTone.r, payTone.g, payTone.b);
  doc.text(input.paymentStatus, pageW - margin - 16, y + 24, {
    align: "right",
  });
  doc.setTextColor(ordTone.r, ordTone.g, ordTone.b);
  doc.text(input.orderStatus, pageW - margin - 16, y + 40, { align: "right" });

  y += 78;

  // Products
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PRODUCTS", margin, y);
  y += 10;

  if (input.items.length === 0) {
    doc.setTextColor(muted.r, muted.g, muted.b);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No items on this order.", margin, y + 16);
    y += 36;
  } else {
    const thumb = 42;
    for (let i = 0; i < input.items.length; i += 1) {
      const item = input.items[i];
      const img = itemImages[i];
      const blockH = 58;
      if (y + blockH > pageH - 72) {
        doc.addPage();
        doc.setFillColor(252, 252, 252);
        doc.rect(0, 0, pageW, pageH, "F");
        y = margin;
      }

      doc.setFillColor(card.r, card.g, card.b);
      doc.setDrawColor(border.r, border.g, border.b);
      doc.roundedRect(margin, y, contentW, blockH, 8, 8, "FD");

      // Thumbnail
      const thumbX = margin + 10;
      const thumbY = y + (blockH - thumb) / 2;
      doc.setFillColor(surface.r, surface.g, surface.b);
      doc.roundedRect(thumbX, thumbY, thumb, thumb, 6, 6, "F");
      if (img) {
        const { w, h } = fitImage(img, thumb - 8, thumb - 8);
        try {
          doc.addImage(
            img.dataUrl,
            img.format,
            thumbX + (thumb - w) / 2,
            thumbY + (thumb - h) / 2,
            w,
            h,
          );
        } catch {
          // leave placeholder
        }
      } else {
        doc.setTextColor(muted.r, muted.g, muted.b);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(
          item.productName.slice(0, 1).toUpperCase(),
          thumbX + thumb / 2,
          thumbY + thumb / 2 + 4,
          { align: "center" },
        );
      }

      const textX = thumbX + thumb + 12;
      const textMaxW = contentW - thumb - 110;
      doc.setTextColor(foreground.r, foreground.g, foreground.b);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const nameLines = doc.splitTextToSize(item.productName, textMaxW) as string[];
      doc.text(nameLines[0] ?? item.productName, textX, y + 22);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(muted.r, muted.g, muted.b);
      doc.setFontSize(9);
      const meta = item.variantName
        ? `${item.variantName}  ·  Qty ${item.quantity}`
        : `Qty ${item.quantity}`;
      doc.text(meta, textX, y + 38);

      doc.setTextColor(foreground.r, foreground.g, foreground.b);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        formatPdfMoney(item.lineTotal, input.currency),
        pageW - margin - 14,
        y + 32,
        { align: "right" },
      );

      y += blockH + 8;
    }
  }

  y += 6;
  if (y > pageH - 160) {
    doc.addPage();
    doc.setFillColor(252, 252, 252);
    doc.rect(0, 0, pageW, pageH, "F");
    y = margin;
  }

  // Totals breakdown
  const totalRows = receiptTotalRows(input.totals);
  const totalsH = 28 + totalRows.length * 16 + 28;
  if (y + totalsH > pageH - 72) {
    doc.addPage();
    doc.setFillColor(252, 252, 252);
    doc.rect(0, 0, pageW, pageH, "F");
    y = margin;
  }

  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTALS", margin, y);
  y += 10;

  doc.setFillColor(card.r, card.g, card.b);
  doc.setDrawColor(border.r, border.g, border.b);
  doc.roundedRect(margin, y, contentW, totalsH, 8, 8, "FD");

  let ty = y + 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const row of totalRows) {
    doc.setTextColor(muted.r, muted.g, muted.b);
    doc.text(row.label, margin + 14, ty);
    doc.setTextColor(foreground.r, foreground.g, foreground.b);
    doc.text(formatPdfMoney(row.value, input.currency), pageW - margin - 14, ty, {
      align: "right",
    });
    ty += 16;
  }

  doc.setDrawColor(border.r, border.g, border.b);
  doc.setLineWidth(0.6);
  doc.line(margin + 12, ty - 4, pageW - margin - 12, ty - 4);
  ty += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(foreground.r, foreground.g, foreground.b);
  doc.text("Grand total", margin + 14, ty);
  doc.text(
    formatPdfMoney(input.totals.grandTotal, input.currency),
    pageW - margin - 14,
    ty,
    { align: "right" },
  );

  y += totalsH + 14;
  if (y > pageH - 220) {
    doc.addPage();
    doc.setFillColor(252, 252, 252);
    doc.rect(0, 0, pageW, pageH, "F");
    y = margin;
  }

  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ORDER DETAILS", margin, y);
  y += 10;

  const addressLines = formatAddressLines(input.shippingAddress);
  const addressBlockH = Math.max(70, 30 + addressLines.length * 13);
  doc.setFillColor(surface.r, surface.g, surface.b);
  doc.setDrawColor(border.r, border.g, border.b);
  doc.roundedRect(margin, y, contentW, addressBlockH, 8, 8, "FD");
  doc.setTextColor(muted.r, muted.g, muted.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DELIVERING TO", margin + 14, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(foreground.r, foreground.g, foreground.b);
  let ay = y + 34;
  if (addressLines.length === 0) {
    doc.setTextColor(muted.r, muted.g, muted.b);
    doc.text("No address on file.", margin + 14, ay);
  } else {
    for (const line of addressLines) {
      ay = drawWrappedText(doc, line, margin + 14, ay, contentW - 28, 13);
    }
  }
  y += addressBlockH + 12;

  const metaRows: Array<[string, string]> = [
    ["Payment status", input.paymentStatus],
    ["Order status", input.orderStatus],
    ["Amount paid", formatPdfMoney(input.amount, input.currency)],
    ["Order number", input.orderNumber],
  ];

  const colW = (contentW - 10) / 2;
  for (let i = 0; i < metaRows.length; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colW + 10);
    const drawY = y + row * 50;
    doc.setFillColor(card.r, card.g, card.b);
    doc.setDrawColor(border.r, border.g, border.b);
    doc.roundedRect(x, drawY, colW, 42, 8, 8, "FD");
    doc.setTextColor(muted.r, muted.g, muted.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(metaRows[i][0].toUpperCase(), x + 12, drawY + 15);
    doc.setTextColor(foreground.r, foreground.g, foreground.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(metaRows[i][1], x + 12, drawY + 30);
  }

  y += 116;
  if (y > pageH - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(border.r, border.g, border.b);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  doc.setTextColor(muted.r, muted.g, muted.b);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Thank you for shopping with ${input.brandName || "us"}.`,
    margin,
    y + 16,
  );
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.setFont("helvetica", "bold");
  doc.text(input.brandName || "Store", pageW - margin, y + 16, {
    align: "right",
  });

  const safeName = input.orderNumber.replace(/[^\w.-]+/g, "_");
  doc.save(`receipt-${safeName}.pdf`);
}

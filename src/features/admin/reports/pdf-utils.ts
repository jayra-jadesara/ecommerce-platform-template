import { jsPDF } from "jspdf";
import type { ColorTokens } from "@/types/config";

export type PdfRgb = { r: number; g: number; b: number };

export type PdfImage = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
};

export type PdfTheme = {
  primary: PdfRgb;
  secondary: PdfRgb;
  accent: PdfRgb;
  foreground: PdfRgb;
  muted: PdfRgb;
  border: PdfRgb;
  surface: PdfRgb;
  card: PdfRgb;
  success: PdfRgb;
  warning: PdfRgb;
  error: PdfRgb;
  onPrimary: PdfRgb;
};

export function hexToRgb(hex: string): PdfRgb {
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

/** Tint toward white (0 = base, 1 = white). */
export function tintRgb(base: PdfRgb, amount: number): PdfRgb {
  const a = Math.min(1, Math.max(0, amount));
  return {
    r: Math.round(base.r + (255 - base.r) * a),
    g: Math.round(base.g + (255 - base.g) * a),
    b: Math.round(base.b + (255 - base.b) * a),
  };
}

export function themeFromColors(colors: ColorTokens): PdfTheme {
  return {
    primary: hexToRgb(colors.buttonBackground || colors.primary),
    secondary: hexToRgb(colors.secondary),
    accent: hexToRgb(colors.accent || colors.primary),
    foreground: hexToRgb(colors.foreground),
    muted: hexToRgb(colors.muted),
    border: hexToRgb(colors.border),
    surface: hexToRgb(colors.surface),
    card: hexToRgb(colors.card),
    success: hexToRgb(colors.success),
    warning: hexToRgb(colors.warning),
    error: hexToRgb(colors.error),
    onPrimary: hexToRgb(colors.buttonForeground || "#ffffff"),
  };
}

/** Helvetica cannot render ₹ — use ASCII-safe currency for PDF. */
export function formatPdfMoney(amount: number, currency: string): string {
  const code = (currency || "INR").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  if (code === "INR") return `Rs. ${formatted}`;
  return `${code} ${formatted}`;
}

export function formatPdfPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatPdfDateTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export async function loadPdfImage(
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

      const preferJpeg =
        blob.type.toLowerCase().includes("jpeg") ||
        blob.type.toLowerCase().includes("jpg");
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

export function fitImage(
  img: PdfImage,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  return {
    w: Math.max(8, img.width * scale),
    h: Math.max(8, img.height * scale),
  };
}

export function drawWrappedText(
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

export function slugifyFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** jsPDF blob with explicit MIME so react-pdf can open it reliably. */
export function pdfDocToBlob(doc: jsPDF): Blob {
  const raw = doc.output("arraybuffer") as ArrayBuffer;
  return new Blob([raw], { type: "application/pdf" });
}

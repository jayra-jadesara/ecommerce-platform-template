"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

const PDF_WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const DEFAULT_ZOOM_IDX = 2; // 100%

/** Minimal shape — avoid top-level pdfjs import (breaks webpack SSR/HMR). */
type PdfDoc = {
  numPages: number;
  cleanup?: () => void | Promise<void>;
  loadingTask?: { destroy?: () => void | Promise<void> };
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      canvas: HTMLCanvasElement;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void> };
  }>;
};

/** pdf.js 6: document uses cleanup(); destroy() lives on the loading task. */
function disposePdf(pdf: PdfDoc | null | undefined) {
  if (!pdf) return;
  try {
    const cleanup = pdf.cleanup?.();
    if (cleanup && typeof (cleanup as Promise<unknown>).then === "function") {
      void (cleanup as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* ignore */
  }
  try {
    const destroy = pdf.loadingTask?.destroy;
    if (typeof destroy === "function") {
      const result = destroy.call(pdf.loadingTask);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        void (result as Promise<unknown>).catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }
}

async function loadPdfDocument(data: Uint8Array): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  const task = pdfjs.getDocument({ data, useSystemFonts: true });
  return (await task.promise) as unknown as PdfDoc;
}

function ToolbarButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export type AdminPdfViewerProps = {
  blob: Blob | null;
  filename?: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
  showDownload?: boolean;
};

/**
 * Canvas PDF preview via pdf.js (no iframe — CSP object-src/frame-src safe).
 * Renders at devicePixelRatio so pages stay sharp at 100% zoom.
 */
export function AdminPdfViewer({
  blob,
  filename = "report.pdf",
  loading = false,
  error = null,
  className,
  showDownload = true,
}: AdminPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<PdfDoc | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
  const [docError, setDocError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [renderGen, setRenderGen] = useState(0);

  const scale = ZOOM_STEPS[zoomIdx] ?? 1;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      disposePdf(pdfRef.current);
      pdfRef.current = null;
      setNumPages(0);
      setPage(1);
      setDocError(null);
      setZoomIdx(DEFAULT_ZOOM_IDX);

      if (!blob) {
        setOpening(false);
        return;
      }

      setOpening(true);
      try {
        const buffer = await blob.arrayBuffer();
        if (cancelled) return;
        const bytes = new Uint8Array(buffer.slice(0));
        const pdf = await loadPdfDocument(bytes);
        if (cancelled) {
          disposePdf(pdf);
          return;
        }
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
        setRenderGen((g) => g + 1);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not open this PDF.";
        setDocError(`PDF preview failed: ${message}`);
      } finally {
        if (!cancelled) setOpening(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      disposePdf(pdfRef.current);
      pdfRef.current = null;
    };
  }, [blob]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || numPages < 1) return;

    let cancelled = false;

    async function paint() {
      try {
        const pdfPage = await pdf!.getPage(page);
        if (cancelled) return;

        // CSS viewport at user zoom; buffer × pixelRatio for crisp text on HiDPI.
        const pixelRatio = Math.max(
          2,
          Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2, 3),
        );
        const viewport = pdfPage.getViewport({ scale });
        const context = canvas!.getContext("2d", {
          alpha: false,
          willReadFrequently: false,
        });
        if (!context) throw new Error("Canvas 2D unavailable");

        const cssW = Math.floor(viewport.width);
        const cssH = Math.floor(viewport.height);
        canvas!.width = Math.floor(cssW * pixelRatio);
        canvas!.height = Math.floor(cssH * pixelRatio);
        canvas!.style.width = `${cssW}px`;
        canvas!.style.height = `${cssH}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, cssW, cssH);

        await pdfPage.render({
          canvasContext: context,
          canvas: canvas!,
          viewport,
        }).promise;
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not render page.";
        setDocError(`PDF preview failed: ${message}`);
      }
    }

    void paint();
    return () => {
      cancelled = true;
    };
  }, [page, scale, numPages, renderGen]);

  const download = useCallback(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [blob, filename]);

  const zoomOut = () => setZoomIdx((i) => Math.max(0, i - 1));
  const zoomIn = () => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));
  const zoomReset = () => setZoomIdx(DEFAULT_ZOOM_IDX);

  const displayError = error || docError;
  const busy = loading || opening;
  const ready = numPages > 0 && !busy && !displayError;

  return (
    <div
      className={cn(
        "flex h-[min(75vh,48rem)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
        className,
      )}
    >
      <div className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-card))] px-3 py-2">
        <ToolbarButton
          label="Previous page"
          disabled={!ready || page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </ToolbarButton>
        <span className="min-w-[5.5rem] text-center text-[12px] font-semibold tabular-nums text-[var(--color-foreground)]">
          {ready ? `Page ${page} of ${numPages}` : "—"}
        </span>
        <ToolbarButton
          label="Next page"
          disabled={!ready || page >= numPages}
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
        >
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </ToolbarButton>

        <span className="mx-1 hidden h-5 w-px bg-[var(--color-border)] sm:block" />

        <ToolbarButton
          label="Zoom out"
          disabled={!ready || zoomIdx <= 0}
          onClick={zoomOut}
        >
          <ZoomOutIcon sx={{ fontSize: 18 }} />
        </ToolbarButton>
        <span className="min-w-[3rem] text-center text-[12px] font-semibold tabular-nums text-[var(--color-muted)]">
          {Math.round(scale * 100)}%
        </span>
        <ToolbarButton
          label="Zoom in"
          disabled={!ready || zoomIdx >= ZOOM_STEPS.length - 1}
          onClick={zoomIn}
        >
          <ZoomInIcon sx={{ fontSize: 18 }} />
        </ToolbarButton>
        <ToolbarButton
          label="Reset to 100%"
          disabled={!ready}
          onClick={zoomReset}
        >
          <FitScreenOutlinedIcon sx={{ fontSize: 18 }} />
        </ToolbarButton>

        {showDownload ? (
          <button
            type="button"
            disabled={!blob || busy}
            onClick={download}
            className={cn(
              adminBtn("outline"),
              "ml-auto !min-h-8 !px-3 !text-[12px]",
            )}
          >
            <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
            Download
          </button>
        ) : (
          <span className="ml-auto text-[11px] text-[var(--color-muted)]">
            Scroll to review · 100% default
          </span>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-background))]">
        {busy ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-4 text-sm text-[var(--color-muted)]">
            {loading ? "Generating report…" : "Opening PDF…"}
          </div>
        ) : displayError ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-4 text-center text-sm text-[var(--color-error)]">
            {displayError}
          </div>
        ) : !blob ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-4 text-sm text-[var(--color-muted)]">
            Select a report above to preview the PDF.
          </div>
        ) : (
          <div className="flex justify-center p-4 sm:p-6">
            {/* No max-width shrink — keeps 100% crisp; scroll if needed */}
            <canvas
              ref={canvasRef}
              className="rounded-lg bg-white shadow-[0_8px_28px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import Dialog from "@mui/material/Dialog";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { cn } from "@/lib/cn";

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.35;

type Pan = { x: number; y: number };

/**
 * Thumbnail → clean lightbox: fit-to-view, wheel/buttons zoom, drag to pan.
 * No page scrollbars inside the dialog.
 */
export function ReplacePhotoLightbox({
  src,
  alt = "Replacement evidence",
  className,
  thumbClassName,
}: {
  src: string;
  alt?: string;
  className?: string;
  thumbClassName?: string;
}) {
  const titleId = useId();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: Pan;
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  function close() {
    setOpen(false);
    resetView();
    dragRef.current = null;
  }

  function clampZoom(value: number) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
  }

  function setZoomAround(nextZoom: number) {
    const z = clampZoom(nextZoom);
    setZoom(z);
    if (z <= 1) setPan({ x: 0, y: 0 });
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoomAround(zoom + direction * ZOOM_STEP);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({
      x: drag.origin.x + (event.clientX - drag.startX),
      y: drag.origin.y + (event.clientY - drag.startY),
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function onDoubleClick() {
    if (zoom > 1) {
      resetView();
      return;
    }
    setZoomAround(2);
  }

  useEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    if (!stage) return;
    const prevent = (event: WheelEvent) => {
      if (stage.contains(event.target as Node)) event.preventDefault();
    };
    stage.addEventListener("wheel", prevent, { passive: false });
    return () => stage.removeEventListener("wheel", prevent);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]",
          className,
          thumbClassName,
        )}
        aria-label={`View ${alt}`}
      >
        <Image src={src} alt={alt} fill unoptimized className="object-cover" />
      </button>

      <Dialog
        open={open}
        onClose={close}
        maxWidth={false}
        aria-labelledby={titleId}
        slotProps={{
          paper: {
            className:
              "!m-3 w-[min(960px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl !bg-[var(--color-card)] shadow-xl",
          },
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-sm font-semibold">
              {alt}
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              Scroll to zoom · drag when zoomed · double-click to reset
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoomAround(zoom - ZOOM_STEP)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-40"
            >
              <RemoveRoundedIcon fontSize="small" />
            </button>
            <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-[var(--color-muted)]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoomAround(zoom + ZOOM_STEP)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-40"
            >
              <AddRoundedIcon fontSize="small" />
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            >
              <CloseRoundedIcon fontSize="small" />
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          className={cn(
            "relative h-[min(72vh,560px)] touch-none select-none overflow-hidden bg-[color-mix(in_srgb,var(--color-foreground)_4%,var(--color-surface))]",
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
          )}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL + pan/zoom transforms */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full object-contain transition-transform duration-100 ease-out"
            style={{
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            }}
          />
        </div>
      </Dialog>
    </>
  );
}

"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/cn";

type ProductImageZoomProps = {
  src: string;
  alt: string;
  className?: string;
  /** Zoom multiplier inside the lens (2–3 feels natural). */
  zoom?: number;
  /**
   * Optional fixed lens diameter. When omitted, lens scales with the
   * gallery frame (~42% of the shorter side, clamped per breakpoint).
   */
  lensSize?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Product gallery zoom — circular magnifier follows the pointer (desktop).
 * Touch devices keep the plain image (no sticky lens).
 * Lens diameter tracks the frame so it stays proportional on all screens.
 */
export function ProductImageZoom({
  src,
  alt,
  className,
  zoom = 2,
  lensSize: lensSizeProp,
}: ProductImageZoomProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [lens, setLens] = useState({
    x: 0,
    y: 0,
    bgW: 0,
    bgH: 0,
    bgX: 0,
    bgY: 0,
  });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setFrameSize({ w: rect.width, h: rect.height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  const shortSide = Math.min(frameSize.w, frameSize.h) || 0;
  const lensSize =
    lensSizeProp ??
    clamp(
      shortSide * 0.42,
      shortSide > 0 && shortSide < 280 ? 88 : 110,
      shortSide > 0 && shortSide < 360 ? 140 : 200,
    );

  const updateLens = useCallback(
    (clientX: number, clientY: number, size: number) => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const half = size / 2;

      setLens({
        x,
        y,
        bgW: rect.width * zoom,
        bgH: rect.height * zoom,
        bgX: -(x * zoom) + half,
        bgY: -(y * zoom) + half,
      });
    },
    [zoom],
  );

  function onPointerEnter(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canHover || event.pointerType === "touch") return;
    setActive(true);
    updateLens(event.clientX, event.clientY, lensSize);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canHover || event.pointerType === "touch") return;
    setActive(true);
    updateLens(event.clientX, event.clientY, lensSize);
  }

  function onPointerLeave() {
    setActive(false);
  }

  const safeBgUrl = src.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return (
    <div
      ref={frameRef}
      className={cn(
        "absolute inset-0 overflow-hidden",
        canHover ? "cursor-zoom-in" : "cursor-default",
        active && "cursor-none",
        className,
      )}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        className="object-contain p-1.5 sm:p-2.5"
        sizes="(max-width: 640px) 80vw, (max-width: 900px) 92vw, min(576px, 70vh)"
        draggable={false}
      />

      {canHover && !active ? (
        <p className="pointer-events-none absolute bottom-2 left-1/2 z-[1] max-w-[90%] -translate-x-1/2 truncate px-2 text-center text-[10px] font-medium tracking-wide text-[var(--color-muted)] sm:text-[11px]">
          Hover to zoom
        </p>
      ) : null}

      {canHover && active && lensSize > 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-full border-2 border-[var(--color-primary)] shadow-[0_10px_28px_color-mix(in_srgb,var(--color-foreground)_22%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] sm:border-[2.5px]"
          style={{
            width: lensSize,
            height: lensSize,
            left: lens.x,
            top: lens.y,
            transform: "translate(-50%, -50%)",
            backgroundColor: "var(--color-surface)",
            backgroundImage: `url("${safeBgUrl}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${lens.bgW}px ${lens.bgH}px`,
            backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
          }}
        />
      ) : null}
    </div>
  );
}

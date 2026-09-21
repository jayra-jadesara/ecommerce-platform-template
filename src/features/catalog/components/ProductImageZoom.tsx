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
  /** Lens diameter in px. */
  lensSize?: number;
};

/**
 * Product gallery zoom — circular magnifier follows the pointer (desktop).
 * Touch devices keep the plain image (no sticky lens).
 * Lens is always clipped to the image frame (overflow hidden on parent).
 */
export function ProductImageZoom({
  src,
  alt,
  className,
  zoom = 2,
  lensSize = 180,
}: ProductImageZoomProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [canHover, setCanHover] = useState(false);
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

  const updateLens = useCallback(
    (clientX: number, clientY: number) => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const half = lensSize / 2;

      setLens({
        x,
        y,
        bgW: rect.width * zoom,
        bgH: rect.height * zoom,
        bgX: -(x * zoom) + half,
        bgY: -(y * zoom) + half,
      });
    },
    [lensSize, zoom],
  );

  function onPointerEnter(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canHover || event.pointerType === "touch") return;
    setActive(true);
    updateLens(event.clientX, event.clientY);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canHover || event.pointerType === "touch") return;
    setActive(true);
    updateLens(event.clientX, event.clientY);
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
        sizes="(max-width: 900px) 92vw, min(576px, 70vh)"
        draggable={false}
      />

      {canHover && !active ? (
        <p className="pointer-events-none absolute bottom-2 left-1/2 z-[1] -translate-x-1/2 text-[10px] font-medium tracking-wide text-[var(--color-muted)]">
          Hover to zoom
        </p>
      ) : null}

      {canHover && active ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-full border-[2.5px] border-[var(--color-primary)] shadow-[0_10px_28px_color-mix(in_srgb,var(--color-foreground)_22%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
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

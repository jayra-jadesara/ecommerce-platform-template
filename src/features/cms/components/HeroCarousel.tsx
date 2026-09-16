"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import type { HeroSlideConfig } from "@/features/cms/schemas";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

type HeroCarouselProps = {
  slides: HeroSlideConfig[];
  autoplayMs?: number;
  showArrows?: boolean;
  /** Fallback copy when a slide omits title */
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  className?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function HeroCarousel({
  slides,
  autoplayMs = 5000,
  showArrows = true,
  fallbackTitle = "",
  fallbackSubtitle = "",
  className,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const count = slides.length;
  const safeIndex = count ? index % count : 0;
  const slide = slides[safeIndex];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!count) return;
      setIndex((current) => (current + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused || reducedMotion || autoplayMs <= 0) return;
    const id = window.setInterval(() => go(1), autoplayMs);
    return () => window.clearInterval(id);
  }, [autoplayMs, count, go, paused, reducedMotion, safeIndex]);

  if (!slide) return null;

  const imageUrl = resolveCmsImageUrl(slide.imagePath);
  const title = slide.title?.trim() || fallbackTitle;
  const subtitle = slide.subtitle?.trim() || fallbackSubtitle;
  const description = slide.description?.trim() || "";
  const badge = slide.badge?.trim() || "";
  const ctaLabel = slide.ctaLabel?.trim() || "";
  const ctaHref = slide.ctaHref?.trim() || "/products";

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="relative grid min-h-[22rem] md:min-h-[28rem] md:grid-cols-2">
        <div className="relative z-10 flex flex-col justify-center gap-4 bg-[var(--color-primary)] px-6 py-12 text-[var(--color-button-foreground)] md:px-10 md:py-16 lg:px-14">
          <div
            className="pointer-events-none absolute -right-8 top-0 hidden h-24 w-24 bg-[var(--color-accent)] md:block"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
            aria-hidden
          />
          {badge ? (
            <p className="inline-flex w-fit rounded-full bg-[var(--color-button-foreground)] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              {badge}
            </p>
          ) : null}
          {subtitle ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-button-foreground)_80%,transparent)]">
              {subtitle}
            </p>
          ) : null}
          {title ? (
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-[2.75rem]">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="max-w-md text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-button-foreground)_88%,transparent)] md:text-base">
              {description}
            </p>
          ) : null}
          {ctaLabel ? (
            <div className="pt-2">
              <Link
                href={ctaHref}
                className={cn(
                  sfBtn("secondary"),
                  "!bg-[var(--color-button-foreground)] !text-[var(--color-primary)]",
                )}
              >
                {ctaLabel}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="relative min-h-[16rem] bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-primary)_12%)] md:min-h-full">
          {imageUrl ? (
            <Image
              key={slide.imagePath}
              src={imageUrl}
              alt=""
              fill
              priority={safeIndex === 0}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : null}
        </div>
      </div>

      {count > 1 && showArrows ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,#000_45%,transparent)] text-white backdrop-blur-sm transition hover:bg-[color-mix(in_srgb,#000_60%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] md:left-4"
          >
            <ChevronLeftIcon fontSize="small" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,#000_45%,transparent)] text-white backdrop-blur-sm transition hover:bg-[color-mix(in_srgb,#000_60%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] md:right-4"
          >
            <ChevronRightIcon fontSize="small" />
          </button>
        </>
      ) : null}

      {count > 1 ? (
        <div
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2"
          role="tablist"
          aria-label="Hero slides"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i === safeIndex
                  ? "bg-[var(--color-button-foreground)] ring-2 ring-[var(--color-primary)]"
                  : "bg-[color-mix(in_srgb,#fff_55%,transparent)] hover:bg-white",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

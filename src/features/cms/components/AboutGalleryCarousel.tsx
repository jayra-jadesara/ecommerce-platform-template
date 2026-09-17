"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import type { AboutGallerySlideConfig } from "@/features/cms/schemas";
import { cn } from "@/lib/cn";

type GallerySlide = {
  imagePath: string;
  title: string;
  description: string;
};

type AboutGalleryCarouselProps = {
  slides: AboutGallerySlideConfig[] | GallerySlide[];
  autoplayMs?: number;
  showArrows?: boolean;
  className?: string;
};

function slideHasContent(slide: GallerySlide): boolean {
  return Boolean(slide.imagePath || slide.title || slide.description);
}

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

function GalleryCard({
  slide,
  priority = false,
}: {
  slide: GallerySlide;
  priority?: boolean;
}) {
  const url = resolveCmsImageUrl(slide.imagePath || null);

  return (
    <article className="sf-about-gallery__card">
      {url ? (
        <div className="sf-about-gallery__media">
          <Image
            src={url}
            alt={slide.title || "Factory & certificates"}
            fill
            priority={priority}
            className="object-cover"
            sizes="(max-width: 480px) 90vw, (max-width: 900px) 45vw, 25vw"
          />
        </div>
      ) : null}
      {slide.title || slide.description ? (
        <div className="sf-about-gallery__body">
          {slide.title ? (
            <h3 className="sf-about-gallery__title">{slide.title}</h3>
          ) : null}
          {slide.description ? (
            <p className="sf-about-gallery__desc">{slide.description}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function AboutGalleryCarousel({
  slides,
  autoplayMs = 4500,
  showArrows = true,
  className,
}: AboutGalleryCarouselProps) {
  const usable = slides
    .map((slide) => ({
      imagePath: (slide.imagePath ?? "").trim(),
      title: (slide.title ?? "").trim(),
      description: (slide.description ?? "").trim(),
    }))
    .filter(slideHasContent);

  const reducedMotion = usePrefersReducedMotion();
  const count = usable.length;
  const shouldMarquee = count > 1 && autoplayMs > 0 && !reducedMotion;

  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);
  const pausedRef = useRef(false);
  const rafRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // Two identical halves → loop distance is half the scroll width.
    halfWidthRef.current = track.scrollWidth / 2;
  }, []);

  useEffect(() => {
    if (!shouldMarquee) {
      offsetRef.current = 0;
      if (trackRef.current) {
        trackRef.current.style.transform = "translate3d(0,0,0)";
      }
      return;
    }

    const track = trackRef.current;
    if (!track) return;

    measure();

    // px/sec — gentle constant drift (slower = easier to read).
    const speed = Math.max(16, 160 / Math.max(1, autoplayMs / 1000));

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(48, ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      if (!pausedRef.current && halfWidthRef.current > 0) {
        offsetRef.current += dirRef.current * speed * dt;
        const half = halfWidthRef.current;
        while (offsetRef.current <= -half) offsetRef.current += half;
        while (offsetRef.current > 0) offsetRef.current -= half;
        track.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const prevHalf = halfWidthRef.current || 1;
      const ratio = offsetRef.current / prevHalf;
      measure();
      if (halfWidthRef.current > 0) {
        offsetRef.current = ratio * halfWidthRef.current;
      }
    });
    ro.observe(track);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      lastTsRef.current = null;
    };
  }, [shouldMarquee, autoplayMs, measure, count]);

  const setPaused = (next: boolean) => {
    pausedRef.current = next;
  };

  if (!count) return null;

  const trackSlides = shouldMarquee ? [...usable, ...usable] : usable;

  return (
    <div className={cn("sf-about-gallery sf-about-gallery--marquee", className)}>
      <div className="sf-about-gallery__stage">
        {count > 1 && showArrows ? (
          <button
            type="button"
            aria-label="Scroll gallery left"
            onClick={() => {
              dirRef.current = -1;
            }}
            className="sf-about-gallery__nav sf-about-gallery__nav--prev"
          >
            <ChevronLeftIcon fontSize="small" />
          </button>
        ) : null}

        <div
          className={cn(
            "sf-about-gallery__viewport",
            !shouldMarquee && "sf-about-gallery__viewport--static",
          )}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (
              !e.currentTarget.contains(e.relatedTarget as Node | null)
            ) {
              setPaused(false);
            }
          }}
        >
          <div
            ref={trackRef}
            className="sf-about-gallery__track"
          >
            {trackSlides.map((slide, i) => (
              <div
                key={`${slide.title}-${slide.imagePath}-${i}`}
                className="sf-about-gallery__item"
                aria-hidden={shouldMarquee && i >= count ? true : undefined}
              >
                <GalleryCard slide={slide} priority={i === 0} />
              </div>
            ))}
          </div>
        </div>

        {count > 1 && showArrows ? (
          <button
            type="button"
            aria-label="Scroll gallery right"
            onClick={() => {
              dirRef.current = 1;
            }}
            className="sf-about-gallery__nav sf-about-gallery__nav--next"
          >
            <ChevronRightIcon fontSize="small" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

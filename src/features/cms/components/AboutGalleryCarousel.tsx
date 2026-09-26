"use client";

import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { A11y, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";
import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import type { AboutGallerySlideConfig } from "@/features/cms/schemas";
import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";
import { cn } from "@/lib/cn";

type GallerySlide = {
  imagePath: string | null;
  title: string;
  description: string;
};

function normalizeSlides(
  slides: AboutGallerySlideConfig[] | GallerySlide[],
): GallerySlide[] {
  return slides.map((slide) => ({
    imagePath: slide.imagePath?.trim() || null,
    title: slide.title?.trim() || "",
    description: slide.description?.trim() || "",
  }));
}

type SharedProps = {
  slides: AboutGallerySlideConfig[] | GallerySlide[];
  heading?: string;
  className?: string;
  highlightStyle?: HeadingHighlightStyle;
};

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Factory gallery — premium image+info cards; 2 visible on desktop, slide for more.
 * External arrows call slidePrev/slideNext (reliable vs Swiper ref navigation).
 */
export function AboutFactoryGallery({
  slides,
  heading,
  className,
  highlightStyle,
}: SharedProps) {
  const usable = normalizeSlides(slides).filter(
    (s) =>
      Boolean(s.imagePath) || Boolean(s.title) || Boolean(s.description),
  );
  if (usable.length === 0) return null;

  const reducedMotion = usePrefersReducedMotion();
  const multi = usable.length > 1;
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(() => usable.length <= 1);

  function syncEdges(swiper: SwiperInstance) {
    setAtStart(swiper.isBeginning);
    setAtEnd(swiper.isEnd);
  }

  return (
    <div className={cn("sf-about-factory", className)}>
      {heading ? (
        <div className="mb-8 md:mb-10">
          <SectionAccentHeading
            title={heading}
            highlightStyle={highlightStyle}
            align="center"
            as="h2"
            className="sf-about-factory__heading"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "sf-about-factory__slider",
          usable.length === 1 && "sf-about-factory__slider--single",
          multi && "sf-about-factory__slider--nav",
        )}
      >
        {multi ? (
          <button
            type="button"
            className="sf-about-factory__nav sf-about-factory__nav--prev"
            aria-label="Previous factory photo"
            disabled={atStart}
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <ChevronLeftRoundedIcon sx={{ fontSize: 26 }} />
          </button>
        ) : null}

        <div className="sf-about-factory__viewport">
          <Swiper
            modules={[Pagination, A11y]}
            className="sf-about-factory__swiper"
            slidesPerView={1}
            spaceBetween={14}
            slidesPerGroup={1}
            centeredSlides={false}
            grabCursor={multi}
            allowTouchMove={multi}
            watchOverflow={false}
            pagination={multi ? { clickable: true } : false}
            speed={reducedMotion ? 0 : 420}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
              syncEdges(swiper);
            }}
            onSlideChange={syncEdges}
            onResize={syncEdges}
            a11y={{
              enabled: true,
              prevSlideMessage: "Previous factory photo",
              nextSlideMessage: "Next factory photo",
            }}
            breakpoints={{
              700: {
                slidesPerView: 2,
                slidesPerGroup: 1,
                spaceBetween: 18,
              },
              1100: {
                slidesPerView: 2,
                slidesPerGroup: 1,
                spaceBetween: 22,
              },
            }}
          >
            {usable.map((slide, index) => {
              const url = resolveCmsImageUrl(slide.imagePath);
              const caption = slide.title || slide.description;
              return (
                <SwiperSlide
                  key={`factory-${index}`}
                  className="sf-about-factory__slide"
                >
                  <figure className="sf-about-factory__card">
                    <div
                      className={cn(
                        "sf-about-factory__media",
                        !url && "sf-about-factory__media--empty",
                      )}
                    >
                      {url ? (
                        <Image
                          src={url}
                          alt={slide.title || heading || "Factory"}
                          fill
                          className="sf-about-factory__img"
                          sizes="(max-width: 639px) 92vw, (max-width: 1024px) 46vw, 420px"
                          priority={index === 0}
                        />
                      ) : null}
                    </div>
                    {caption ? (
                      <figcaption className="sf-about-factory__caption">
                        {slide.title ? (
                          <span className="sf-about-factory__caption-title">
                            {slide.title}
                          </span>
                        ) : null}
                        {slide.description ? (
                          <span className="sf-about-factory__caption-desc">
                            {slide.description}
                          </span>
                        ) : null}
                      </figcaption>
                    ) : null}
                  </figure>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {multi ? (
          <button
            type="button"
            className="sf-about-factory__nav sf-about-factory__nav--next"
            aria-label="Next factory photo"
            disabled={atEnd}
            onClick={() => swiperRef.current?.slideNext()}
          >
            <ChevronRightRoundedIcon sx={{ fontSize: 26 }} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Circular certification seals — image only (no titles on storefront).
 */
export function AboutCertificatesStrip({
  slides,
  heading,
  className,
  highlightStyle,
}: SharedProps) {
  const usable = normalizeSlides(slides).filter((s) => Boolean(s.imagePath));
  if (usable.length === 0) return null;

  return (
    <div className={cn("sf-about-certs", className)}>
      {heading ? (
        <div className="mb-8 md:mb-10">
          <SectionAccentHeading
            title={heading}
            highlightStyle={highlightStyle}
            align="center"
            as="h2"
            className="sf-about-certs__heading"
          />
        </div>
      ) : null}
      <ul className="sf-about-certs__row">
        {usable.map((slide, index) => {
          const url = resolveCmsImageUrl(slide.imagePath);
          if (!url) return null;
          return (
            <li key={`cert-${index}`} className="sf-about-certs__item">
              <div className="sf-about-certs__seal">
                <Image
                  src={url}
                  alt={
                    heading
                      ? `${heading} ${index + 1}`
                      : `Certificate ${index + 1}`
                  }
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 108px, 120px"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** @deprecated Prefer AboutFactoryGallery / AboutCertificatesStrip. */
export function AboutMediaGrid({
  slides,
  heading,
  className,
  variant = "factory",
  highlightStyle,
}: SharedProps & { variant?: "factory" | "certificates" }) {
  if (variant === "certificates") {
    return (
      <AboutCertificatesStrip
        slides={slides}
        heading={heading}
        className={className}
        highlightStyle={highlightStyle}
      />
    );
  }
  return (
    <AboutFactoryGallery
      slides={slides}
      heading={heading}
      className={className}
      highlightStyle={highlightStyle}
    />
  );
}

/** @deprecated Prefer AboutFactoryGallery — kept so old imports keep compiling. */
export function AboutGalleryCarousel({
  slides,
  className,
}: {
  slides: AboutGallerySlideConfig[] | GallerySlide[];
  autoplayMs?: number;
  showArrows?: boolean;
  className?: string;
}) {
  return <AboutFactoryGallery slides={slides} className={className} />;
}

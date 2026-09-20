"use client";

import Image from "next/image";
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

/**
 * Balaji-inspired photo-first factory gallery — theme wash, editorial spans.
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

  const featured = usable.length >= 3;

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
          "sf-about-factory__grid",
          featured && "sf-about-factory__grid--featured",
        )}
      >
        {usable.map((slide, index) => {
          const url = resolveCmsImageUrl(slide.imagePath);
          const caption = slide.title || slide.description;
          return (
            <figure
              key={`factory-${index}`}
              className={cn(
                "sf-about-factory__tile",
                featured && index === 0 && "sf-about-factory__tile--hero",
              )}
            >
              {url ? (
                <div className="sf-about-factory__media">
                  <Image
                    src={url}
                    alt={slide.title || heading || "Factory"}
                    fill
                    className="object-cover"
                    sizes={
                      featured && index === 0
                        ? "(max-width: 768px) 100vw, 60vw"
                        : "(max-width: 768px) 100vw, 30vw"
                    }
                  />
                </div>
              ) : (
                <div className="sf-about-factory__media sf-about-factory__media--empty" />
              )}
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
          );
        })}
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
                  alt={heading ? `${heading} ${index + 1}` : `Certificate ${index + 1}`}
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

/** @deprecated Prefer AboutMediaGrid — kept so old imports keep compiling. */
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

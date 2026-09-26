"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Autoplay, EffectFade, Navigation, Pagination, A11y } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import type { HeroSlideConfig } from "@/features/cms/schemas";
import { sfBtn, sfDisplay } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export type HeroCampaignSlide = HeroSlideConfig & {
  /** Optional product/brand image over the campaign photo */
  foregroundImagePath?: string | null;
};

type HeroCarouselProps = {
  slides: HeroCampaignSlide[];
  autoplayMs?: number;
  showArrows?: boolean;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  fallbackDescription?: string;
  className?: string;
};

type ResolvedSlide = {
  imageUrl: string | null;
  fgUrl: string | null;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  imagePath: string;
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

function safeHref(href: string | null | undefined, fallback = "/products") {
  const t = String(href ?? "").trim();
  return t || fallback;
}

function resolveSlide(
  slide: HeroCampaignSlide,
  fallbackTitle: string,
  fallbackSubtitle: string,
  fallbackDescription: string,
): ResolvedSlide {
  return {
    imagePath: slide.imagePath,
    imageUrl: resolveCmsImageUrl(slide.imagePath),
    fgUrl: resolveCmsImageUrl(
      (slide.foregroundImagePath as string | null | undefined) ?? null,
    ),
    title: slide.title?.trim() || fallbackTitle,
    subtitle: slide.subtitle?.trim() || fallbackSubtitle,
    description: slide.description?.trim() || fallbackDescription,
    badge: slide.badge?.trim() || "",
    ctaLabel: slide.ctaLabel?.trim() || "",
    ctaHref: safeHref(slide.ctaHref),
    secondaryLabel: slide.secondaryCtaLabel?.trim() || "",
    secondaryHref: safeHref(slide.secondaryCtaHref, "/about"),
  };
}

function HeroCampaignSlideView({
  slide,
  priority,
}: {
  slide: ResolvedSlide;
  priority?: boolean;
}) {
  return (
    <div className="sf-hero-campaign__slide">
      <div className="sf-hero-campaign__media" aria-hidden={!slide.imageUrl}>
        {slide.imageUrl ? (
          <Image
            src={slide.imageUrl}
            alt=""
            fill
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="sf-hero-campaign__img"
            sizes="100vw"
          />
        ) : (
          <div className="sf-hero-campaign__fallback-bg" />
        )}
        <div className="sf-hero-campaign__scrim" />
      </div>

      <div className="sf-hero-campaign__inner">
        <div className="sf-hero-campaign__copy">
          {slide.badge ? (
            <p className="sf-hero-campaign__badge">{slide.badge}</p>
          ) : null}
          {slide.subtitle ? (
            <p className="sf-hero-campaign__eyebrow">{slide.subtitle}</p>
          ) : null}
          {slide.title ? (
            <h1 className={cn(sfDisplay(), "sf-hero-campaign__title")}>
              {slide.title}
            </h1>
          ) : null}
          {slide.description ? (
            <p className="sf-hero-campaign__desc">{slide.description}</p>
          ) : null}
          {slide.ctaLabel || slide.secondaryLabel ? (
            <div className="sf-hero-campaign__actions">
              {slide.ctaLabel ? (
                <Link
                  href={slide.ctaHref}
                  className={cn(
                    sfBtn("primary"),
                    "sf-hero-campaign__cta !min-h-0 !px-[1.15rem] !py-[0.55rem] !text-[0.8125rem] w-fit",
                  )}
                >
                  {slide.ctaLabel}
                </Link>
              ) : null}
              {slide.secondaryLabel ? (
                <Link
                  href={slide.secondaryHref}
                  className={cn(
                    sfBtn("outline"),
                    "sf-hero-campaign__cta sf-hero-campaign__cta--secondary !min-h-0 !px-[1.15rem] !py-[0.55rem] !text-[0.8125rem] w-fit",
                  )}
                >
                  {slide.secondaryLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {slide.fgUrl ? (
          <div className="sf-hero-campaign__fg">
            <Image
              src={slide.fgUrl}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 768px) 40vw, 280px"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HeroCarousel({
  slides,
  autoplayMs = 5000,
  showArrows = true,
  fallbackTitle = "",
  fallbackSubtitle = "",
  fallbackDescription = "",
  className,
}: HeroCarouselProps) {
  // Swiper mutates the DOM (wrappers, loop clones, nav). Mount it only after
  // hydration so SSR markup matches the first client paint.
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = slides.length;
  if (count === 0) return null;

  const resolved = slides.map((slide) =>
    resolveSlide(
      slide,
      fallbackTitle,
      fallbackSubtitle,
      fallbackDescription,
    ),
  );
  const first = resolved[0]!;
  const enableAutoplay =
    mounted && count > 1 && !reducedMotion && autoplayMs > 0;
  // Avoid server/client className drift from prefers-reduced-motion.
  const reducedClass = mounted && reducedMotion;

  return (
    <div
      className={cn(
        "sf-hero-campaign",
        reducedClass && "sf-hero-campaign--reduced",
        className,
      )}
    >
      {!mounted || count === 1 ? (
        <div className="sf-hero-campaign__swiper">
          <HeroCampaignSlideView slide={first} priority />
        </div>
      ) : (
        <Swiper
          modules={[EffectFade, Autoplay, Navigation, Pagination, A11y]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={reducedMotion ? 0 : 900}
          /* loop + fade stacks duplicate slides and causes overlapping copy */
          loop={false}
          watchOverflow
          autoplay={
            enableAutoplay
              ? {
                  delay: autoplayMs,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
              : false
          }
          navigation={count > 1 && showArrows}
          pagination={
            count > 1
              ? { clickable: true, dynamicBullets: false }
              : false
          }
          a11y={{
            enabled: true,
            prevSlideMessage: "Previous slide",
            nextSlideMessage: "Next slide",
          }}
          className="sf-hero-campaign__swiper"
        >
          {resolved.map((slide, index) => (
            <SwiperSlide key={`${slide.imagePath}-${index}`}>
              <HeroCampaignSlideView slide={slide} priority={index === 0} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}

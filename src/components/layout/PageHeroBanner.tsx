import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { cn } from "@/lib/cn";

type PageHeroBannerProps = {
  enabled?: boolean | null;
  imagePath?: string | null;
  /** Accessible label for the decorative banner. */
  alt?: string;
  className?: string;
};

/**
 * Shared storefront page hero (Products, About, Contact, Career).
 * Fills the first viewport below sticky header/announcement so the photo
 * is fully visible without scrolling. Page sections below start after scroll.
 * Image uses object-cover — never stretched.
 */
export function PageHeroBanner({
  enabled,
  imagePath,
  alt = "",
  className,
}: PageHeroBannerProps) {
  if (!enabled) return null;
  const url = resolveCmsImageUrl(imagePath);
  if (!url) return null;

  return (
    <div
      className={cn(
        "sf-page-banner relative w-full",
        /* First screen only — content below requires scroll */
        "h-[var(--sf-page-banner-height,calc(100svh-var(--sf-hero-chrome,6rem)))]",
        "min-h-[16rem] mb-6 md:mb-8",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          "bg-[color-mix(in_srgb,var(--color-muted)_10%,var(--color-surface))]",
          "rounded-[calc(var(--radius-default,1rem)+2px)]",
          "shadow-[0_1px_0_color-mix(in_srgb,var(--color-foreground)_4%,transparent),0_12px_28px_-16px_color-mix(in_srgb,var(--color-foreground)_22%,transparent)]",
          "ring-1 ring-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-foreground)_10%,transparent)_0%,transparent_35%,transparent_65%,color-mix(in_srgb,var(--color-foreground)_16%,transparent)_100%)]"
          aria-hidden
        />
      </div>
    </div>
  );
}

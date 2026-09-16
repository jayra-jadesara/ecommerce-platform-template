"use client";

import { useId } from "react";
import type { BlogCoverCtaStyle } from "@/features/blog/types";
import { cn } from "@/lib/cn";

export const COVER_CTA_STYLE_META: Record<
  BlogCoverCtaStyle,
  { title: string; description: string; premium?: boolean }
> = {
  COOKIE: {
    title: "Cookie",
    description: "Classic bitten-cookie badge",
  },
  PLAIN: {
    title: "Circle",
    description: "Simple round badge",
  },
  MASALA: {
    title: "Masala box",
    description: "3D spice carton icon",
    premium: true,
  },
  PACK: {
    title: "Masala packet",
    description: "3D spice pouch icon",
    premium: true,
  },
  BAND: {
    title: "Name band",
    description: "Accent product-label strip",
  },
  SQUARE: {
    title: "Square",
    description: "Soft square tile",
  },
  RIBBON: {
    title: "Ribbon seal",
    description: "Curved packaging banner",
    premium: true,
  },
  STAMP: {
    title: "Stamp",
    description: "Seal / stamp ring",
    premium: true,
  },
  NONE: {
    title: "Text only",
    description: "No badge shape",
  },
};

type CoverReadMoreBadgeProps = {
  style?: BlogCoverCtaStyle;
  className?: string;
  compact?: boolean;
};

function ReadMoreDisk({
  compact,
  className,
}: {
  compact: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "blog-cover-card__read relative z-10 inline-flex items-center justify-center rounded-full text-center font-bold uppercase leading-tight tracking-[0.08em] text-white",
        compact ? "h-8 w-8 text-[0.4rem]" : "h-11 w-11 text-[0.5rem]",
        className,
      )}
    >
      Read
      <br />
      More
    </span>
  );
}

/** 3/4 view spice carton icon — inspired by Magical Masti pack (SVG, not photo) */
function MasalaBoxIcon({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={cn("blog-cover-card__pack-icon absolute inset-0 h-full w-full", className)}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`bx-side-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-surface)" />
          <stop offset="100%" stopColor="#e8d9b8" />
        </linearGradient>
        <linearGradient id={`bx-lid-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-primary)" />
        </linearGradient>
        <linearGradient id={`bx-food-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4783a" />
          <stop offset="45%" stopColor="#8b4a28" />
          <stop offset="100%" stopColor="#5a2e18" />
        </linearGradient>
        <filter id={`bx-sh-${id}`} x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="1" dy="5" stdDeviation="3.5" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter={`url(#bx-sh-${id})`}>
        {/* Left side (cream) */}
        <path fill={`url(#bx-side-${id})`} d="M12 34 L28 20 L28 78 L12 68 Z" />
        {/* Side chef-seal hint */}
        <circle cx="20" cy="42" r="5" fill="var(--color-primary)" opacity="0.85" />
        <circle cx="20" cy="42" r="3.2" fill="var(--color-accent)" opacity="0.9" />
        {/* Side nutrition lines */}
        <path
          stroke="var(--color-primary)"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          d="M15 54h10M15 58h8M15 62h9"
        />

        {/* Front face */}
        <path fill="var(--color-surface)" d="M28 20 L78 12 L78 70 L28 78 Z" />

        {/* Top lid */}
        <path fill={`url(#bx-lid-${id})`} d="M28 20 L52 8 L88 16 L78 12 Z" />
        <path fill="#fff" opacity="0.25" d="M30 19 L52 10 L70 14 L46 22 Z" />

        {/* Front primary crown + brand bar feel */}
        <path fill="var(--color-primary)" d="M30 24 L76 16 L76 36 L30 44 Z" />
        {/* Accent yellow name strip */}
        <path fill="var(--color-accent)" d="M30 44 L76 36 L76 46 L30 54 Z" />
        {/* Food photo panel */}
        <path fill={`url(#bx-food-${id})`} d="M30 54 L76 46 L76 68 L30 76 Z" />
        {/* Food bits */}
        <ellipse cx="42" cy="60" rx="7" ry="4.5" fill="#e8a050" opacity="0.9" />
        <ellipse cx="56" cy="62" rx="6" ry="4" fill="#f0c070" opacity="0.75" />
        <circle cx="48" cy="56" r="2.8" fill="#6a9a3a" />
        <circle cx="62" cy="58" r="2.2" fill="#d4552a" />
        <circle cx="68" cy="64" r="1.8" fill="#7a9e4a" />

        {/* Veg mark */}
        <rect
          x="68"
          y="20"
          width="7"
          height="7"
          rx="1"
          fill="#f4fff6"
          stroke="#2f9e44"
          strokeWidth="1"
        />
        <circle cx="71.5" cy="23.5" r="1.9" fill="#2f9e44" />
      </g>
    </svg>
  );
}

/** Vertical spice pouch icon — inspired by Tea Masala pack (SVG, not photo) */
function MasalaPacketIcon({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={cn("blog-cover-card__pack-icon absolute inset-0 h-full w-full", className)}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`pk-face-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7efe0" />
          <stop offset="100%" stopColor="#e8d5b0" />
        </linearGradient>
        <linearGradient id={`pk-dark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1810" />
          <stop offset="100%" stopColor="var(--color-primary)" />
        </linearGradient>
        <radialGradient id={`pk-ripples-${id}`} cx="50%" cy="55%" r="40%">
          <stop offset="35%" stopColor="transparent" />
          <stop offset="48%" stopColor="var(--color-primary)" stopOpacity="0.1" />
          <stop offset="55%" stopColor="transparent" />
          <stop offset="68%" stopColor="var(--color-accent)" stopOpacity="0.14" />
          <stop offset="75%" stopColor="transparent" />
        </radialGradient>
        <filter id={`pk-sh-${id}`} x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter={`url(#pk-sh-${id})`}>
        {/* Outer pouch edge */}
        <path
          fill="var(--color-primary)"
          d="
            M22 30
            C24 14 34 8 50 8
            C66 8 76 14 78 30
            L82 62
            C82 80 68 90 50 90
            C32 90 18 80 18 62
            Z
          "
        />

        {/* Face */}
        <path
          fill={`url(#pk-face-${id})`}
          d="
            M26 32
            C28 18 36 14 50 14
            C64 14 72 18 74 32
            L77 60
            C77 76 66 84 50 84
            C34 84 23 76 23 60
            Z
          "
        />

        {/* Dark tea-leaf top */}
        <path
          fill={`url(#pk-dark-${id})`}
          d="M26 32 C28 18 36 14 50 14 C64 14 72 18 74 32 L74 40 L26 40 Z"
        />
        <circle cx="36" cy="26" r="2.2" fill="#fff" opacity="0.12" />
        <circle cx="52" cy="24" r="1.6" fill="#fff" opacity="0.1" />
        <circle cx="64" cy="28" r="1.8" fill="#fff" opacity="0.12" />

        {/* Accent product bar */}
        <rect x="26" y="40" width="48" height="9" fill="var(--color-accent)" />
        <rect x="26" y="40" width="48" height="2" fill="#fff" opacity="0.35" />

        {/* Ripples + cup */}
        <ellipse cx="50" cy="64" rx="20" ry="14" fill={`url(#pk-ripples-${id})`} />
        <ellipse
          cx="50"
          cy="62"
          rx="9"
          ry="7"
          fill="#fff"
          stroke="var(--color-primary)"
          strokeOpacity="0.2"
          strokeWidth="0.8"
        />
        <ellipse cx="50" cy="60" rx="6" ry="4" fill="var(--color-accent)" opacity="0.7" />
        <ellipse cx="50" cy="59" rx="4.5" ry="2.5" fill="#fff" opacity="0.35" />

        {/* Spices around cup */}
        <ellipse cx="32" cy="66" rx="3" ry="1.8" fill="#8b5a2b" transform="rotate(-25 32 66)" />
        <ellipse cx="68" cy="64" rx="2.8" ry="1.6" fill="#6b3a1a" transform="rotate(20 68 64)" />
        <circle cx="36" cy="74" r="2" fill="#4a7a3a" />
        <circle cx="44" cy="76" r="1.6" fill="#6a9a3a" />
        <circle cx="58" cy="75" r="1.8" fill="#c45c2a" />
        <circle cx="66" cy="72" r="1.5" fill="#8b5a2b" />

        {/* Red seal ribbon */}
        <path
          fill="var(--color-primary)"
          d="M38 66 Q50 74 62 66 Q60 76 50 78 Q40 76 38 66 Z"
        />
        <path
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          d="M40 67.5 Q50 74.5 60 67.5"
        />

        {/* Crimped top flap */}
        <path
          fill="var(--color-accent)"
          d="
            M24 30
            C28 12 38 6 50 6
            C62 6 72 12 76 30
            L70 34
            C66 18 58 14 50 14
            C42 14 34 18 30 34
            Z
          "
        />
        <path
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.5"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M30 22 L34 15 L38 22 L42 14 L46 14 L50 12 L54 14 L58 14 L62 22 L66 15 L70 22"
        />

        {/* Veg mark */}
        <rect
          x="66"
          y="16"
          width="7"
          height="7"
          rx="1"
          fill="#f4fff6"
          stroke="#2f9e44"
          strokeWidth="1"
        />
        <circle cx="69.5" cy="19.5" r="1.9" fill="#2f9e44" />
      </g>
    </svg>
  );
}

/**
 * Storefront + admin preview “Read more” badge for cover cards.
 */
export function CoverReadMoreBadge({
  style = "COOKIE",
  className,
  compact = false,
}: CoverReadMoreBadgeProps) {
  if (style === "NONE") {
    return (
      <span
        className={cn(
          "font-bold uppercase tracking-[0.14em] text-white/95 underline decoration-white/50 underline-offset-4",
          compact ? "text-[0.55rem]" : "text-[0.7rem]",
          className,
        )}
      >
        Read more
      </span>
    );
  }

  if (style === "MASALA") {
    return (
      <span
        className={cn(
          "blog-cover-card__cta blog-cover-card__cta--masala relative inline-flex items-center justify-center",
          compact ? "h-16 w-14" : "h-[5.75rem] w-[5rem]",
          className,
        )}
      >
        <MasalaBoxIcon className="scale-[1.08] -rotate-6" />
        <ReadMoreDisk compact={compact} />
      </span>
    );
  }

  if (style === "PACK") {
    return (
      <span
        className={cn(
          "blog-cover-card__cta blog-cover-card__cta--pack relative inline-flex items-center justify-center",
          compact ? "h-16 w-14" : "h-[5.75rem] w-[5rem]",
          className,
        )}
      >
        <MasalaPacketIcon className="scale-[1.06] rotate-1" />
        <ReadMoreDisk compact={compact} />
      </span>
    );
  }

  if (style === "BAND") {
    return (
      <span
        className={cn(
          "blog-cover-card__cta blog-cover-card__cta--band relative inline-flex items-center justify-center",
          compact ? "h-7 min-w-[4.6rem] px-1.5" : "h-9 min-w-[6rem] px-2.5",
          className,
        )}
      >
        <span className="blog-cover-card__name-band absolute inset-0" aria-hidden />
        <span
          className={cn(
            "relative z-10 font-extrabold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--color-foreground)_92%,#000)]",
            compact ? "text-[0.48rem]" : "text-[0.62rem]",
          )}
        >
          Read more
        </span>
      </span>
    );
  }

  if (style === "RIBBON") {
    return (
      <span
        className={cn(
          "blog-cover-card__cta blog-cover-card__cta--ribbon relative inline-flex items-center justify-center",
          compact ? "h-10 w-[4.75rem]" : "h-12 w-[6rem]",
          className,
        )}
      >
        <svg
          className="blog-cover-card__curve-ribbon absolute inset-0 h-full w-full"
          viewBox="0 0 120 48"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="blog-cover-card__curve-ribbon-edge"
            d="M6 24c8-14 28-18 54-18s46 4 54 18c-8 14-28 18-54 18S14 38 6 24z"
          />
          <path
            className="blog-cover-card__curve-ribbon-fill"
            d="M10 24c7-11 26-14.5 50-14.5s43 3.5 50 14.5c-7 11-26 14.5-50 14.5S17 35 10 24z"
          />
        </svg>
        <span
          className={cn(
            "relative z-10 font-bold uppercase tracking-[0.12em] text-white",
            compact ? "text-[0.48rem]" : "text-[0.6rem]",
          )}
        >
          Read more
        </span>
      </span>
    );
  }

  if (style === "STAMP") {
    return (
      <span
        className={cn(
          "blog-cover-card__cta blog-cover-card__cta--stamp relative inline-flex items-center justify-center",
          compact ? "h-12 w-12" : "h-[4.5rem] w-[4.5rem]",
          className,
        )}
      >
        <span className="blog-cover-card__stamp absolute inset-0" aria-hidden />
        <span
          className={cn(
            "relative z-10 text-center font-bold uppercase leading-tight tracking-[0.08em] text-white",
            compact ? "text-[0.48rem]" : "text-[0.58rem]",
          )}
        >
          Read
          <br />
          More
        </span>
      </span>
    );
  }

  if (style === "SQUARE") {
    return (
      <span
        className={cn(
          "blog-cover-card__cta blog-cover-card__cta--square relative inline-flex items-center justify-center",
          compact ? "h-12 w-12" : "h-[4.5rem] w-[4.5rem]",
          className,
        )}
      >
        <span className="blog-cover-card__square absolute inset-1" aria-hidden />
        <span
          className={cn(
            "blog-cover-card__read relative z-10 inline-flex items-center justify-center rounded-md text-center font-bold uppercase leading-tight tracking-[0.08em] text-white",
            compact ? "h-9 w-9 text-[0.48rem]" : "h-14 w-14 text-[0.62rem]",
          )}
        >
          Read
          <br />
          More
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "blog-cover-card__cta relative inline-flex items-center justify-center",
        compact ? "h-12 w-12" : "h-[4.5rem] w-[4.5rem]",
        className,
      )}
    >
      {style === "COOKIE" ? (
        <svg
          className="blog-cover-card__bite absolute inset-0 h-full w-full translate-x-1.5 translate-y-1"
          viewBox="0 0 80 80"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M40 6c18.8 0 34 15.2 34 34S58.8 74 40 74 6 58.8 6 40 21.2 6 40 6zm16 8a6 6 0 1 0 0.01 0zM66 34a6.5 6.5 0 1 0 0.01 0zM60 58a6 6 0 1 0 0.01 0zM24 60a6 6 0 1 0 0.01 0zM12 36a6.5 6.5 0 1 0 0.01 0zM22 16a6 6 0 1 0 0.01 0z"
          />
        </svg>
      ) : (
        <span
          className="blog-cover-card__bite absolute inset-1 rounded-full"
          aria-hidden="true"
        />
      )}
      <ReadMoreDisk
        compact={compact}
        className={
          compact ? "h-9 w-9 text-[0.48rem]" : "h-14 w-14 text-[0.62rem]"
        }
      />
    </span>
  );
}

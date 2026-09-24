"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { cn } from "@/lib/cn";
import type { StorefrontLoaderStyle } from "@/components/ui/storefront-loader";

type StorefrontLoaderMarkProps = {
  style: StorefrontLoaderStyle;
  className?: string;
  /** Visual size hint for spinner (MUI). */
  size?: number;
};

/**
 * Brand-colored loader mark — style comes from admin Storefront loading settings.
 */
export function StorefrontLoaderMark({
  style,
  className,
  size = 28,
}: StorefrontLoaderMarkProps) {
  if (style === "spinner") {
    return (
      <CircularProgress
        size={size}
        thickness={4}
        color="primary"
        className={className}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn("sf-loader", `sf-loader--${style}`, className)}
      data-style={style}
      aria-hidden
    >
      {style === "dots" ? (
        <>
          <span className="sf-loader__dot" />
          <span className="sf-loader__dot" />
          <span className="sf-loader__dot" />
        </>
      ) : null}
      {style === "bars" ? (
        <>
          <span className="sf-loader__bar" />
          <span className="sf-loader__bar" />
          <span className="sf-loader__bar" />
        </>
      ) : null}
      {style === "ring" || style === "pulse" ? (
        <span className="sf-loader__orb" />
      ) : null}
      {style === "dual" ? (
        <>
          <span className="sf-loader__dual sf-loader__dual--outer" />
          <span className="sf-loader__dual sf-loader__dual--inner" />
        </>
      ) : null}
      {style === "orbit" ? (
        <>
          <span className="sf-loader__orbit-core" />
          <span className="sf-loader__orbit-arm">
            <span className="sf-loader__orbit-dot" />
          </span>
        </>
      ) : null}
      {style === "wave" ? (
        <>
          <span className="sf-loader__wave-dot" />
          <span className="sf-loader__wave-dot" />
          <span className="sf-loader__wave-dot" />
          <span className="sf-loader__wave-dot" />
          <span className="sf-loader__wave-dot" />
        </>
      ) : null}
      {style === "bloom" ? (
        <>
          <span className="sf-loader__bloom" />
          <span className="sf-loader__bloom" />
          <span className="sf-loader__bloom-core" />
        </>
      ) : null}
      {style === "dash" ? <span className="sf-loader__dash" /> : null}
    </span>
  );
}

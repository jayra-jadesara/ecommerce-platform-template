"use client";

import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";
import { coerceHeadingHighlightStyle } from "@/features/theme/heading-highlight";
import { usePlatformConfig } from "@/providers/PlatformConfigProvider";
import { cn } from "@/lib/cn";

type StorefrontHeadingProps = {
  title: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  align?: "center" | "left";
};

/**
 * Page chrome heading — accent style comes from Appearance → Typography.
 * Always accents the last word (store-wide rule).
 */
export function StorefrontHeading({
  title,
  className,
  as = "h1",
  align = "left",
}: StorefrontHeadingProps) {
  const config = usePlatformConfig();
  const highlightStyle = coerceHeadingHighlightStyle(
    config.typography.headingHighlightStyle,
  );

  return (
    <SectionAccentHeading
      title={title}
      highlightStyle={highlightStyle}
      as={as}
      align={align}
      className={cn(className)}
    />
  );
}

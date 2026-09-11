"use client";

import type { CSSProperties, ReactNode } from "react";
import { colorTokensToCssVars } from "@/features/theme/css-vars";
import type { ColorTokens, ResolvedThemeMode, ThemeConfig } from "@/types";
import { cn } from "@/lib/cn";

interface ThemePreviewProps {
  theme: ThemeConfig;
  /** Which palette to preview. Defaults to light (or store default when not system). */
  mode?: ResolvedThemeMode;
  className?: string;
  children: ReactNode;
  /** Optional draft typography for admin live preview. */
  fonts?: {
    sans?: string;
    display?: string;
  };
}

/**
 * Isolated theme preview — applies CSS variables to a scoped container only.
 * Does not mutate the live document theme.
 */
export function ThemePreview({
  theme,
  mode,
  className,
  children,
  fonts,
}: ThemePreviewProps) {
  const resolved: ResolvedThemeMode =
    mode ?? (theme.defaultMode === "dark" ? "dark" : "light");
  const tokens: ColorTokens =
    resolved === "dark" ? theme.dark : theme.light;
  const vars = colorTokensToCssVars(tokens);
  const radius = theme.borderRadius ?? "8px";

  const style = {
    ...vars,
    colorScheme: resolved,
    backgroundColor: "var(--color-background)",
    color: "var(--color-foreground)",
    borderRadius: radius,
    ["--radius-default" as string]: radius,
    ...(fonts?.sans ? { ["--font-sans" as string]: fonts.sans } : null),
    ...(fonts?.display ? { ["--font-display" as string]: fonts.display } : null),
    fontFamily: fonts?.sans ?? "var(--font-sans), ui-sans-serif, sans-serif",
  } as CSSProperties;

  return (
    <div
      className={cn("theme-preview", className)}
      style={style}
      data-theme={resolved}
      data-preview-radius={radius}
    >
      {children}
    </div>
  );
}

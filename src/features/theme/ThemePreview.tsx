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
}

/**
 * Isolated theme preview — applies CSS variables to a scoped container only.
 * Does not mutate the live document theme. Ready for Admin Theme Editor (Phase 5).
 */
export function ThemePreview({
  theme,
  mode,
  className,
  children,
}: ThemePreviewProps) {
  const resolved: ResolvedThemeMode =
    mode ?? (theme.defaultMode === "dark" ? "dark" : "light");
  const tokens: ColorTokens =
    resolved === "dark" ? theme.dark : theme.light;
  const vars = colorTokensToCssVars(tokens);

  const style = {
    ...vars,
    colorScheme: resolved,
    backgroundColor: "var(--color-background)",
    color: "var(--color-foreground)",
    borderRadius: theme.borderRadius,
  } as CSSProperties;

  return (
    <div className={cn("theme-preview", className)} style={style} data-theme={resolved}>
      {children}
    </div>
  );
}

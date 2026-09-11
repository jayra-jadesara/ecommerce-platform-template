"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { getAdminPath } from "@/config/admin-route";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import {
  extractColorsFromImageFile,
  extractColorsFromImageUrl,
  generateBrandThemeFromColors,
  type GeneratedBrandTheme,
} from "@/features/theme/logo-branding";
import type { ColorTokens } from "@/types";

export const LOGO_THEME_SUGGESTION_KEY = "platform-logo-theme-suggestion";

export type LogoThemeSuggestion = {
  light: ColorTokens;
  dark: ColorTokens;
  sourceColors: string[];
  updatedAt: number;
};

export function readLogoThemeSuggestion(): LogoThemeSuggestion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LOGO_THEME_SUGGESTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LogoThemeSuggestion;
  } catch {
    return null;
  }
}

export function writeLogoThemeSuggestion(theme: GeneratedBrandTheme): void {
  if (typeof window === "undefined") return;
  const payload: LogoThemeSuggestion = {
    light: theme.light,
    dark: theme.dark,
    sourceColors: theme.sourceColors,
    updatedAt: Date.now(),
  };
  sessionStorage.setItem(LOGO_THEME_SUGGESTION_KEY, JSON.stringify(payload));
  logoThemeSuggestionListeners.forEach((listener) => listener());
}

export function clearLogoThemeSuggestion(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LOGO_THEME_SUGGESTION_KEY);
  logoThemeSuggestionListeners.forEach((listener) => listener());
}

const logoThemeSuggestionListeners = new Set<() => void>();

function subscribeLogoThemeSuggestion(onStoreChange: () => void) {
  logoThemeSuggestionListeners.add(onStoreChange);
  return () => logoThemeSuggestionListeners.delete(onStoreChange);
}

interface LogoThemeSuggestProps {
  logoUrl?: string | null;
  mode?: "branding" | "appearance";
  onApplyPreview?: (theme: GeneratedBrandTheme) => void;
  className?: string;
}

export function LogoThemeSuggest({
  logoUrl,
  mode = "branding",
  onApplyPreview,
  className,
}: LogoThemeSuggestProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestion = useSyncExternalStore(
    subscribeLogoThemeSuggestion,
    readLogoThemeSuggestion,
    () => null,
  );

  const generate = useCallback(
    async (source?: string | File) => {
      setBusy(true);
      setError(null);
      try {
        let colors: string[] = [];
        if (source instanceof File) {
          colors = await extractColorsFromImageFile(source);
        } else if (typeof source === "string" && source) {
          colors = await extractColorsFromImageUrl(source);
        } else if (logoUrl) {
          colors = await extractColorsFromImageUrl(logoUrl);
        }
        const theme = generateBrandThemeFromColors(colors);
        if (!theme) {
          setError("Could not build a theme from this logo. Try another image.");
          return null;
        }
        writeLogoThemeSuggestion(theme);
        return theme;
      } catch {
        setError(
          "Logo analysis failed. Check the image is reachable, then try again.",
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [logoUrl],
  );

  if (!logoUrl && !suggestion) return null;

  return (
    <section
      className={cn(
        "rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            Logo branding
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-foreground)]">
            {suggestion
              ? "Brand theme generated from your logo"
              : "Create a brand theme from your logo"}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Preview colors first. Nothing is saved until you apply and save in Appearance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !logoUrl}
            className={adminBtn("secondary")}
            onClick={() => void generate(logoUrl || undefined)}
          >
            {busy ? "Analyzing…" : suggestion ? "Regenerate theme" : "Generate from logo"}
          </button>
          {mode === "branding" ? (
            <Link href={getAdminPath("/settings/theme")} className={adminBtn("primary")}>
              Customize colors
            </Link>
          ) : (
            <button
              type="button"
              disabled={!suggestion || busy}
              className={adminBtn("primary")}
              onClick={() => {
                if (!suggestion) return;
                onApplyPreview?.({
                  light: suggestion.light,
                  dark: suggestion.dark,
                  sourceColors: suggestion.sourceColors,
                });
              }}
            >
              Apply suggested theme
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}

      {suggestion ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {suggestion.sourceColors.map((color) => (
              <span
                key={color}
                title={color}
                className="h-8 w-8 rounded-full border border-[var(--color-border)]"
                style={{ background: color }}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniThemePreview label="Light" tokens={suggestion.light} />
            <MiniThemePreview label="Dark" tokens={suggestion.dark} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          {logoUrl
            ? "Click Generate from logo to analyze colors and preview a theme."
            : "Upload a logo to generate a first-pass brand theme automatically."}
        </p>
      )}
    </section>
  );
}

function MiniThemePreview({
  label,
  tokens,
}: {
  label: string;
  tokens: ColorTokens;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-[var(--color-border)]"
      style={{ background: tokens.background, color: tokens.foreground }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-medium"
        style={{
          background: tokens.headerBackground,
          color: tokens.headerForeground,
        }}
      >
        <span>{label}</span>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: tokens.buttonBackground,
            color: tokens.buttonForeground,
          }}
        >
          Shop
        </span>
      </div>
      <div className="p-3">
        <div
          className="rounded-md border p-3"
          style={{ background: tokens.card, borderColor: tokens.border }}
        >
          <div
            className="mb-2 h-10 rounded"
            style={{ background: tokens.surface }}
          />
          <p className="text-xs font-semibold">Product</p>
          <p className="text-[10px]" style={{ color: tokens.muted }}>
            From your brand palette
          </p>
        </div>
      </div>
    </div>
  );
}

/** Helper for branding upload handlers to regenerate after logo file selection. */
export async function suggestThemeFromLogoFile(
  file: File,
): Promise<GeneratedBrandTheme | null> {
  const colors = await extractColorsFromImageFile(file);
  const theme = generateBrandThemeFromColors(colors);
  if (theme) writeLogoThemeSuggestion(theme);
  return theme;
}

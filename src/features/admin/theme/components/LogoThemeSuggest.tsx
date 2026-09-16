"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import Link from "next/link";
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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

const logoThemeSuggestionListeners = new Set<() => void>();

/** Cached snapshot — getSnapshot must return stable refs for useSyncExternalStore. */
let cachedSuggestionRaw: string | null | undefined;
let cachedSuggestion: LogoThemeSuggestion | null = null;

function notifyLogoThemeSuggestionListeners() {
  logoThemeSuggestionListeners.forEach((listener) => listener());
}

export function readLogoThemeSuggestion(): LogoThemeSuggestion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LOGO_THEME_SUGGESTION_KEY);
    if (raw === cachedSuggestionRaw) {
      return cachedSuggestion;
    }
    cachedSuggestionRaw = raw;
    if (!raw) {
      cachedSuggestion = null;
      return null;
    }
    cachedSuggestion = JSON.parse(raw) as LogoThemeSuggestion;
    return cachedSuggestion;
  } catch {
    cachedSuggestionRaw = null;
    cachedSuggestion = null;
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
  const raw = JSON.stringify(payload);
  sessionStorage.setItem(LOGO_THEME_SUGGESTION_KEY, raw);
  cachedSuggestionRaw = raw;
  cachedSuggestion = payload;
  notifyLogoThemeSuggestionListeners();
}

export function clearLogoThemeSuggestion(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LOGO_THEME_SUGGESTION_KEY);
  cachedSuggestionRaw = null;
  cachedSuggestion = null;
  notifyLogoThemeSuggestionListeners();
}

function subscribeLogoThemeSuggestion(onStoreChange: () => void) {
  logoThemeSuggestionListeners.add(onStoreChange);
  return () => {
    logoThemeSuggestionListeners.delete(onStoreChange);
  };
}

const ROLE_LABELS = ["Primary", "Secondary", "Accent"] as const;

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

  const appearanceHref = getAdminPath("/settings/theme");

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-card)),var(--color-card)_60%)] px-4 py-3.5">
        <div className="flex min-w-0 flex-1 gap-2.5">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]"
            aria-hidden
          >
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 20 }} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <PaletteOutlinedIcon sx={{ fontSize: 13 }} />
              Generate colors from logo
            </p>
            <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-foreground)]">
              {suggestion
                ? "Brand theme ready from your logo"
                : "Create a brand theme from your logo"}
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !logoUrl}
            className={cn(adminBtn("secondary"), "inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-sm")}
            onClick={() => void generate(logoUrl || undefined)}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 17 }} />
            {busy
              ? "Analyzing…"
              : suggestion
                ? "Regenerate"
                : "Generate"}
          </button>
          {mode === "branding" ? (
            <Link
              href={appearanceHref}
              className={cn(adminBtn("primary"), "inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-sm")}
            >
              <TuneOutlinedIcon sx={{ fontSize: 17 }} />
              Apply in Appearance
            </Link>
          ) : (
            <button
              type="button"
              disabled={!suggestion || busy}
              className={cn(adminBtn("primary"), "inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-sm")}
              onClick={() => {
                if (!suggestion) return;
                onApplyPreview?.({
                  light: suggestion.light,
                  dark: suggestion.dark,
                  sourceColors: suggestion.sourceColors,
                });
              }}
            >
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 17 }} />
              Apply suggested theme
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5">
        {mode === "branding" && suggestion ? (
          <div className="flex flex-wrap items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-foreground)]">
            <SaveOutlinedIcon
              sx={{ fontSize: 16, marginTop: "1px" }}
              className="shrink-0 text-[var(--color-primary)]"
            />
            <p className="min-w-0 flex-1">
              <span className="font-semibold">Colors are not saved on this page.</span>{" "}
              Generate stores a preview in this browser. Open{" "}
              <Link
                href={appearanceHref}
                className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Appearance
              </Link>
              , click <span className="font-semibold">Apply suggested theme</span>, then{" "}
              <span className="font-semibold">Save</span> there to publish.
            </p>
          </div>
        ) : null}

        {mode === "appearance" && suggestion ? (
          <p className="text-xs text-[var(--color-muted)]">
            Apply loads light + dark tokens into this form. Use Save on Appearance to
            publish them to the storefront.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        ) : null}

        {suggestion ? (
          <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch">
            <div className="flex flex-wrap gap-3 lg:flex-col lg:justify-center">
              {suggestion.sourceColors.slice(0, 3).map((color, index) => (
                <div
                  key={`${ROLE_LABELS[index]}-${color}`}
                  className="flex items-center gap-2"
                >
                  <span
                    title={color}
                    className="h-8 w-8 shrink-0 rounded-full border border-[var(--color-border)]"
                    style={{ background: color }}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
                      {ROLE_LABELS[index] ?? `Color ${index + 1}`}
                    </p>
                    <p className="font-mono text-[10px] uppercase text-[var(--color-muted)]">
                      {color}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <MiniThemePreview
                label="Light"
                icon={<LightModeOutlinedIcon sx={{ fontSize: 14 }} />}
                tokens={suggestion.light}
              />
              <MiniThemePreview
                label="Dark"
                icon={<DarkModeOutlinedIcon sx={{ fontSize: 14 }} />}
                tokens={suggestion.dark}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            {logoUrl
              ? "Generate a theme from your logo, then apply it in Appearance and save."
              : "Upload a logo to generate a first-pass brand theme automatically."}
          </p>
        )}
      </div>
    </section>
  );
}

function MiniThemePreview({
  label,
  icon,
  tokens,
}: {
  label: string;
  icon: ReactNode;
  tokens: ColorTokens;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-[var(--color-border)]"
      style={{ background: tokens.background, color: tokens.foreground }}
    >
      <div
        className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium"
        style={{
          background: tokens.headerBackground,
          color: tokens.headerForeground,
        }}
      >
        <span className="inline-flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span
          className="rounded px-2 py-0.5 text-[9px] font-semibold"
          style={{
            background: tokens.buttonBackground,
            color: tokens.buttonForeground,
          }}
        >
          Shop
        </span>
      </div>
      <div className="p-2">
        <div
          className="rounded-md border p-2"
          style={{ background: tokens.card, borderColor: tokens.border }}
        >
          <div
            className="mb-1.5 h-6 rounded"
            style={{ background: tokens.surface }}
          />
          <p className="text-[10px] font-semibold">Product</p>
          <p className="text-[9px]" style={{ color: tokens.muted }}>
            Brand palette
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

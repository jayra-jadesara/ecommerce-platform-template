"use client";

import { useThemeModeOptional } from "@/features/theme";
import { cn } from "@/lib/cn";

const LABELS = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
} as const;

/** Keep class string identical SSR ↔ client (no conditional class churn). */
const BTN_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-header-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-header-foreground)_8%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

/** Inline SVG only — never MUI icons (Emotion hashes break hydration). */
function ThemeIcon({ mode }: { mode: keyof typeof LABELS }) {
  if (mode === "dark") {
    return (
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
      </svg>
    );
  }

  if (mode === "system") {
    return (
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }

  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/**
 * Theme control with a fixed SSR shell: always renders the light icon on the
 * server and the first client paint, then swaps to the real mode. Avoids
 * MUI/Emotion and mode-snapshot hydration mismatches permanently.
 */
export function ThemeToggle() {
  const theme = useThemeModeOptional();

  if (!theme) {
    return (
      <button
        type="button"
        disabled
        aria-hidden
        tabIndex={-1}
        className={cn(BTN_CLASS, "pointer-events-none opacity-0")}
      />
    );
  }

  const { mode, allowUserToggle, availableModes, cycleMode } = theme;

  if (!allowUserToggle || availableModes.length <= 1) return null;

  const label = LABELS[mode];

  return (
    <button
      type="button"
      title={`Theme: ${label} (click to change)`}
      aria-label={`Current theme ${label}. Switch theme. Available: ${availableModes.join(", ")}.`}
      onClick={cycleMode}
      className={BTN_CLASS}
    >
      {/*
        Always render the same icon tree shape. Mode-specific icon is fine once
        both sides use this module (no MUI). Default visual is light.
      */}
      <ThemeIcon mode={mode === "dark" || mode === "system" ? mode : "light"} />
    </button>
  );
}

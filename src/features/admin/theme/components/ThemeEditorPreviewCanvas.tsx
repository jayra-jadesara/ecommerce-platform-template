"use client";

import type { BrandConfig, ResolvedThemeMode, ThemeConfig } from "@/types";
import { ThemePreview } from "@/features/theme/ThemePreview";

export function ThemeEditorPreviewCanvas({
  theme,
  mode,
  brand,
}: {
  theme: ThemeConfig;
  mode: ResolvedThemeMode;
  brand: BrandConfig;
}) {
  const logo =
    mode === "dark" && brand.logoDarkUrl ? brand.logoDarkUrl : brand.logoUrl;

  return (
    <ThemePreview theme={theme} mode={mode} className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="min-h-[28rem]">
        <header
          className="flex items-center justify-between border-b px-4 py-3"
          style={{
            background: "var(--color-header-background)",
            color: "var(--color-header-foreground)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2 font-semibold">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-7 w-auto" />
            ) : (
              brand.name
            )}
          </div>
          <nav className="hidden gap-4 text-sm sm:flex" aria-label="Preview">
            <span>Home</span>
            <span>Products</span>
            <span>About</span>
          </nav>
        </header>

        <section className="px-4 py-8" style={{ background: "var(--color-background)" }}>
          <p
            className="text-3xl font-semibold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            {brand.name}
          </p>
          <p className="mt-2 max-w-md text-sm" style={{ color: "var(--color-muted)" }}>
            {brand.tagline ?? "Sample storefront preview for theme editing."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{
                background: "var(--color-button-background)",
                color: "var(--color-button-foreground)",
                borderRadius: "var(--radius-default, 8px)",
              }}
            >
              Primary action
            </button>
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
                background: "var(--color-surface)",
              }}
            >
              Secondary
            </button>
          </div>
        </section>

        <section className="grid gap-3 px-4 pb-8 sm:grid-cols-2">
          <article
            className="rounded-xl border p-4"
            style={{
              background: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            <div
              className="mb-3 h-24 rounded-lg"
              style={{ background: "var(--color-primary)", opacity: 0.25 }}
            />
            <h3 className="font-semibold" style={{ color: "var(--color-foreground)" }}>
              Sample product
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Generic preview card — not live catalog data.
            </p>
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--color-accent)" }}>
              From $24.00
            </p>
          </article>

          <article
            className="rounded-xl border p-4"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--color-foreground)" }}
              htmlFor="preview-email"
            >
              Email
            </label>
            <input
              id="preview-email"
              readOnly
              value="customer@example.com"
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-foreground)",
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span
                className="rounded-full px-2 py-1"
                style={{ background: "var(--color-success)", color: "#fff" }}
              >
                Success
              </span>
              <span
                className="rounded-full px-2 py-1"
                style={{ background: "var(--color-warning)", color: "#111" }}
              >
                Warning
              </span>
              <span
                className="rounded-full px-2 py-1"
                style={{ background: "var(--color-error)", color: "#fff" }}
              >
                Error
              </span>
            </div>
          </article>
        </section>

        <footer
          className="border-t px-4 py-5 text-sm"
          style={{
            background: "var(--color-footer-background)",
            color: "var(--color-footer-foreground)",
            borderColor: "var(--color-border)",
          }}
        >
          © {new Date().getFullYear()} {brand.name}
        </footer>
      </div>
    </ThemePreview>
  );
}

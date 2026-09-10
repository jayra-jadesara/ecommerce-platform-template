"use client";

import type { BrandConfig, ResolvedThemeMode, ThemeConfig } from "@/types";
import { ThemePreview } from "@/features/theme/ThemePreview";

const PREVIEW_NAV = ["Home", "Shop", "About", "Contact"];

function meaningfulTagline(tagline: string | undefined) {
  const t = tagline?.trim();
  if (!t) return null;
  if (t.toLowerCase() === "your store, your brand.") return null;
  return t;
}

/**
 * Admin Appearance live preview — readable mock of storefront chrome.
 * Never stretches the logo as a full-bleed hero (logos clash with overlay text).
 */
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
  const tagline = meaningfulTagline(brand.tagline);
  /** Lifestyle / OG image only — never fall back to logo for cover. */
  const lifestyleImage = brand.socialImageUrl?.trim() || null;

  return (
    <ThemePreview
      theme={theme}
      mode={mode}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
    >
      <div
        className="text-[var(--color-foreground)]"
        style={{ background: "var(--color-background)" }}
      >
        {/* Header */}
        <header
          className="flex items-center gap-2 border-b px-3 py-2.5"
          style={{
            background: "var(--color-header-background)",
            color: "var(--color-header-foreground)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-7 w-auto max-w-[5.5rem] object-contain"
              />
            ) : (
              <span className="truncate font-[family-name:var(--font-display)] text-sm font-semibold">
                {brand.name}
              </span>
            )}
          </div>

          <nav
            className="hidden items-center gap-2.5 text-[10px] font-medium sm:flex"
            aria-label="Preview"
          >
            {PREVIEW_NAV.map((label, i) => (
              <span
                key={label}
                className="whitespace-nowrap"
                style={
                  i === 0
                    ? { color: "var(--color-primary)" }
                    : { opacity: 0.7 }
                }
              >
                {label}
              </span>
            ))}
          </nav>

          <div
            className="ml-1 flex shrink-0 items-center gap-1"
            style={{ color: "var(--color-header-foreground)" }}
            aria-hidden
          >
            {["⌕", "♡", "BAG"].map((icon) => (
              <span
                key={icon}
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[9px] font-semibold"
                style={{
                  borderColor: "color-mix(in srgb, var(--color-header-foreground) 18%, transparent)",
                }}
              >
                {icon === "BAG" ? "1" : icon}
              </span>
            ))}
          </div>
        </header>

        {/* Hero — split: copy + visual. Logo stays in a card, not as cover. */}
        <section
          className="relative overflow-hidden"
          style={{
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)), var(--color-background) 55%, color-mix(in srgb, var(--color-accent) 14%, var(--color-surface)))",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 90% 10%, color-mix(in srgb, var(--color-accent) 45%, transparent), transparent 60%), radial-gradient(ellipse 50% 60% at 0% 100%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 55%)",
            }}
          />

          <div className="relative grid gap-4 px-3 py-5 sm:grid-cols-[1.1fr_0.9fr] sm:items-center sm:gap-3 sm:px-4 sm:py-6">
            <div className="space-y-2.5">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--color-primary)" }}
              >
                {brand.name}
              </p>
              <p
                className="font-[family-name:var(--font-display)] text-xl font-semibold leading-tight tracking-tight sm:text-2xl"
                style={{ color: "var(--color-foreground)" }}
              >
                {tagline || "Explore our collection"}
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <span
                  className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold"
                  style={{
                    background: "var(--color-primary)",
                    color: "var(--color-button-foreground)",
                    borderRadius: "var(--radius-default, 8px)",
                  }}
                >
                  Shop now
                </span>
                <span
                  className="rounded-md border px-2.5 py-1.5 text-[10px] font-semibold"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-foreground)",
                    background: "var(--color-card)",
                    borderRadius: "var(--radius-default, 8px)",
                  }}
                >
                  Browse catalog
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2" aria-hidden>
              <div
                className="flex aspect-square w-[42%] items-center justify-center overflow-hidden border p-2 shadow-sm"
                style={{
                  background: "var(--color-card)",
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius-default, 12px)",
                }}
              >
                {logo || lifestyleImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lifestyleImage || logo!}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span
                    className="font-[family-name:var(--font-display)] text-2xl font-semibold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {(brand.name || "B").slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="flex w-[48%] flex-col gap-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="overflow-hidden border"
                    style={{
                      background: "var(--color-card)",
                      borderColor: "var(--color-border)",
                      borderRadius: "var(--radius-default, 10px)",
                    }}
                  >
                    <div
                      className="aspect-[5/4]"
                      style={{
                        background:
                          i === 0
                            ? "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 35%, var(--color-surface)), var(--color-surface))"
                            : "linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 32%, var(--color-surface)), var(--color-surface))",
                      }}
                    />
                    <div className="px-1.5 py-1">
                      <div
                        className="h-1.5 w-3/4 rounded"
                        style={{
                          background:
                            "color-mix(in srgb, var(--color-foreground) 18%, transparent)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Categories — forced 3 columns for narrow preview pane */}
        <section className="px-3 py-4">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-primary)" }}
          >
            Shop
          </p>
          <p
            className="mt-1 font-[family-name:var(--font-display)] text-sm font-semibold"
            style={{ color: "var(--color-foreground)" }}
          >
            Shop by category
          </p>
          <div
            className="mt-3 gap-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            {["Category one", "Category two", "Category three"].map(
              (name, i) => (
                <article
                  key={name}
                  className="min-w-0 overflow-hidden border"
                  style={{
                    background: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "var(--radius-default, 10px)",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      background:
                        i === 0
                          ? "color-mix(in srgb, var(--color-primary) 22%, var(--color-surface))"
                          : i === 1
                            ? "color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))"
                            : "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
                    }}
                  />
                  <p
                    className="truncate px-1.5 py-1.5 text-center text-[9px] font-semibold"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {name}
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        {/* Products */}
        <section
          className="gap-2.5 px-3 pb-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          }}
        >
          {["Example Product", "Featured Pick"].map((name, i) => (
            <article
              key={name}
              className="min-w-0 overflow-hidden border"
              style={{
                background: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-default, 10px)",
              }}
            >
              <div
                style={{
                  aspectRatio: "4 / 5",
                  background:
                    i === 0
                      ? "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 28%, transparent), var(--color-surface))"
                      : "linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 26%, transparent), var(--color-surface))",
                }}
              />
              <div className="space-y-1 p-2">
                <p
                  className="text-[8px] uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Collection
                </p>
                <h3
                  className="truncate text-[10px] font-semibold"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {name}
                </h3>
                <span
                  className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-semibold"
                  style={{
                    background: "var(--color-primary)",
                    color: "var(--color-button-foreground)",
                    borderRadius: "var(--radius-default, 6px)",
                  }}
                >
                  Add to cart
                </span>
              </div>
            </article>
          ))}
        </section>

        <footer
          className="border-t px-3 py-3 text-[10px]"
          style={{
            background: "var(--color-footer-background)",
            color: "var(--color-footer-foreground)",
            borderColor: "var(--color-border)",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{brand.name}</p>
            {tagline ? (
              <p className="mt-0.5 line-clamp-2 opacity-70">{tagline}</p>
            ) : null}
          </div>
          <div className="min-w-0 opacity-70">
            <p className="font-semibold opacity-100">Shop</p>
            <p className="mt-0.5">Products</p>
          </div>
          <div className="min-w-0 opacity-70">
            <p className="font-semibold opacity-100">Support</p>
            <p className="mt-0.5">Contact</p>
          </div>
        </footer>
      </div>
    </ThemePreview>
  );
}

"use client";

import type { CSSProperties } from "react";
import type { BrandConfig, ResolvedThemeMode, ThemeConfig } from "@/types";
import { ThemePreview } from "@/features/theme/ThemePreview";
import type {
  ButtonHoverOption,
  ButtonStyleOption,
  CardMotionOption,
  ImageMotionOption,
  StoreFeel,
  ThreeFeel,
} from "@/features/motion-3d/studio-ui";

const PREVIEW_NAV = ["Home", "Shop", "About", "Contact"];
const PRODUCTS = [
  { name: "Example Product", price: "$48", tone: "primary" as const, has3d: true },
  { name: "Featured Pick", price: "$62", tone: "accent" as const, has3d: false },
  { name: "Daily Essential", price: "$36", tone: "primary" as const, has3d: false },
];

function meaningfulTagline(tagline: string | undefined) {
  const t = tagline?.trim();
  if (!t) return null;
  if (t.toLowerCase() === "your store, your brand.") return null;
  return t;
}

function previewButtonStyle(
  style: ButtonStyleOption,
  hover: ButtonHoverOption,
  showHover: boolean,
): CSSProperties {
  const radius =
    style === "floating" || style === "pill"
      ? "999px"
      : "var(--radius-default, 8px)";

  const base: CSSProperties = {
    borderRadius: radius,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    lineHeight: 1.2,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
  };

  if (style === "outline") {
    Object.assign(base, {
      background: "transparent",
      color: "var(--color-primary)",
      borderWidth: 2,
      borderColor: "var(--color-primary)",
    });
  } else if (style === "soft") {
    Object.assign(base, {
      background:
        "color-mix(in srgb, var(--color-primary) 18%, var(--color-card))",
      color: "var(--color-primary)",
      borderWidth: 1,
      borderColor:
        "color-mix(in srgb, var(--color-primary) 30%, transparent)",
    });
  } else if (style === "floating") {
    Object.assign(base, {
      background: "var(--color-button-background, var(--color-primary))",
      color: "var(--color-button-foreground, #fff)",
      boxShadow:
        "0 8px 18px color-mix(in srgb, var(--color-primary) 32%, transparent)",
    });
  } else {
    Object.assign(base, {
      background: "var(--color-button-background, var(--color-primary))",
      color: "var(--color-button-foreground, #fff)",
    });
  }

  if (showHover && hover === "lift") {
    base.boxShadow =
      "0 6px 14px color-mix(in srgb, var(--color-foreground) 14%, transparent)";
  } else if (showHover && hover === "scale") {
    base.transform = "scale(1.05)";
  } else if (showHover && hover === "glow") {
    base.boxShadow =
      "0 0 0 3px color-mix(in srgb, var(--color-primary) 26%, transparent)";
  }

  return base;
}

function cardShellStyle(
  cardMotion: CardMotionOption,
  motionActive: boolean,
): CSSProperties {
  const base: CSSProperties = {
    background: "var(--color-card)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "var(--radius-default, 12px)",
    overflow: "hidden",
    transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
  };
  if (!motionActive || cardMotion === "clean") return base;
  if (cardMotion === "lift" || cardMotion === "float") {
    return {
      ...base,
      boxShadow:
        "0 10px 22px color-mix(in srgb, var(--color-foreground) 12%, transparent)",
      borderColor:
        "color-mix(in srgb, var(--color-primary) 28%, var(--color-border))",
      transform: cardMotion === "float" ? "translateY(-2px)" : "translateY(-3px)",
    };
  }
  if (cardMotion === "zoom") {
    return {
      ...base,
      boxShadow:
        "0 8px 18px color-mix(in srgb, var(--color-foreground) 10%, transparent)",
      transform: "scale(1.02)",
    };
  }
  return {
    ...base,
    boxShadow:
      "0 0 0 2px color-mix(in srgb, var(--color-primary) 22%, transparent), 0 10px 22px color-mix(in srgb, var(--color-primary) 12%, transparent)",
  };
}

function imageTransform(
  imageMotion: ImageMotionOption,
  motionActive: boolean,
): string {
  if (!motionActive || imageMotion === "none") {
    return "rotateY(-8deg) rotateX(5deg)";
  }
  if (imageMotion === "gentle-zoom") return "scale(1.08) rotateY(-6deg)";
  if (imageMotion === "lift") return "translateY(-4px) rotateY(-8deg)";
  return "translateY(-2px) rotateY(-10deg) rotateX(6deg)";
}

/**
 * Phase 25.3 — realistic miniature storefront inside a browser frame.
 */
export function ThemeEditorPreviewCanvas({
  theme,
  mode,
  brand,
  previewMotion = false,
  preview3d = false,
  motionActive = true,
  threeActive = false,
  product3dEnabled = false,
  storeFeel = "MODERN",
  cardMotion = "lift",
  imageMotion = "lift",
  threeFeel = "NONE",
  buttonStyle = "solid",
  buttonHover = "glow",
  device = "desktop",
  fonts,
}: {
  theme: ThemeConfig;
  mode: ResolvedThemeMode;
  brand: BrandConfig;
  previewMotion?: boolean;
  preview3d?: boolean;
  motionActive?: boolean;
  threeActive?: boolean;
  product3dEnabled?: boolean;
  storeFeel?: StoreFeel;
  cardMotion?: CardMotionOption;
  imageMotion?: ImageMotionOption;
  threeFeel?: ThreeFeel;
  buttonStyle?: ButtonStyleOption;
  buttonHover?: ButtonHoverOption;
  device?: "desktop" | "mobile";
  fonts?: { sans?: string; display?: string };
}) {
  const logo =
    mode === "dark" && brand.logoDarkUrl ? brand.logoDarkUrl : brand.logoUrl;
  const tagline = meaningfulTagline(brand.tagline);
  const lifestyleImage = brand.socialImageUrl?.trim() || null;
  // Always reflect draft motion in the live preview; toolbar toggle still
  // indicates whether the merchant wants motion emphasized while editing.
  const playMotion = motionActive;
  const threeOn = threeActive && (preview3d || threeFeel !== "NONE");
  const product3dOn = threeActive && product3dEnabled;
  const showHover = buttonHover !== "none";
  const ctaStyle = previewButtonStyle(buttonStyle, buttonHover, showHover);
  const cardStyle = cardShellStyle(cardMotion, motionActive);
  const isMobilePreview = device === "mobile";

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
      data-preview-device={device}
      style={isMobilePreview ? { maxWidth: "22rem", marginInline: "auto" } : undefined}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--color-border)",
          background: "var(--color-card)",
        }}
      >
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--color-muted)_55%,transparent)]" />
          <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--color-muted)_55%,transparent)]" />
          <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--color-muted)_55%,transparent)]" />
        </span>
        <p className="truncate text-[10px] font-medium text-[var(--color-muted)]">
          {brand.name || "Preview Store"}
        </p>
      </div>

      <ThemePreview
        theme={theme}
        mode={mode}
        fonts={fonts}
        className="theme-editor-live-preview"
      >
        <div
          className={
            playMotion
              ? `text-[var(--color-foreground)] sf-feel-preview sf-feel-preview--${storeFeel.toLowerCase()}`
              : "text-[var(--color-foreground)]"
          }
          style={{ background: "var(--color-background)" }}
          data-store-feel={storeFeel.toLowerCase()}
          data-card-motion={cardMotion}
          data-image-motion={imageMotion}
          data-button-style={buttonStyle}
          data-product-3d={product3dOn ? "on" : "off"}
          data-preview-motion={
            !playMotion ? "off" : previewMotion ? "on" : "draft"
          }
          data-preview-3d={threeOn ? "on" : "off"}
        >
          <header
            className="flex items-center gap-2 px-3 py-2.5"
            style={{
              background: "var(--color-header-background)",
              color: "var(--color-header-foreground)",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--color-border)",
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
                <span
                  className="truncate text-sm font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-display), var(--font-sans), ui-sans-serif, sans-serif",
                  }}
                >
                  {brand.name}
                </span>
              )}
            </div>
            <nav className="flex gap-2 text-[10px] font-medium" aria-label="Preview">
              {PREVIEW_NAV.map((label, i) => (
                <span
                  key={label}
                  style={i === 0 ? { color: "var(--color-primary)" } : { opacity: 0.65 }}
                >
                  {label}
                </span>
              ))}
            </nav>
          </header>

          <section
            className="relative px-3 py-5"
            style={{
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--color-primary) 16%, var(--color-surface)), var(--color-background) 60%, color-mix(in srgb, var(--color-accent) 14%, var(--color-surface)))",
            }}
          >
            {threeOn ? (
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(circle at 78% 40%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 42%), radial-gradient(circle at 22% 70%, color-mix(in srgb, var(--color-accent) 24%, transparent), transparent 46%)",
                }}
              />
            ) : null}
            <div className="relative space-y-2">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--color-primary)" }}
              >
                {brand.name}
              </p>
              <p
                className="text-lg font-semibold leading-tight sm:text-xl"
                style={{
                  fontFamily:
                    "var(--font-display), var(--font-sans), ui-sans-serif, sans-serif",
                }}
              >
                {tagline || "Explore Collection"}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2.5 py-1.5 text-[10px]" style={ctaStyle}>
                  Shop Now
                </span>
                <span className="px-2.5 py-1.5 text-[10px]" style={ctaStyle}>
                  View Collection
                </span>
              </div>
            </div>
          </section>

          <section className="px-3 py-3">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--color-primary)" }}
            >
              Shop
            </p>
            <p className="mt-1 text-sm font-semibold">Shop by category</p>
            <div
              className="mt-2 gap-2"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            >
              {["Category one", "Category two", "Category three"].map((name, i) => (
                <article key={name} style={cardStyle}>
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      background:
                        i === 0
                          ? "color-mix(in srgb, var(--color-primary) 28%, var(--color-surface))"
                          : i === 1
                            ? "color-mix(in srgb, var(--color-accent) 26%, var(--color-surface))"
                            : "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
                    }}
                  />
                  <p className="truncate px-1 py-1.5 text-center text-[9px] font-semibold">
                    {name}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="px-3 pb-3">
            <div className="mb-2 flex items-end justify-between">
              <p className="text-sm font-semibold">Featured picks</p>
              <span className="text-[8px] font-semibold uppercase text-[var(--color-muted)]">
                {cardMotion} · {imageMotion}
              </span>
            </div>
            <div
              className="gap-2"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            >
              {PRODUCTS.map((item) => {
                const a =
                  item.tone === "primary"
                    ? "var(--color-primary)"
                    : "var(--color-accent)";
                return (
                  <article key={item.name} style={cardStyle}>
                    <div
                      className="relative"
                      style={{
                        aspectRatio: "4 / 5",
                        background: `linear-gradient(165deg, color-mix(in srgb, ${a} 30%, var(--color-surface)), var(--color-surface))`,
                        overflow: "hidden",
                      }}
                    >
                      {product3dOn && item.has3d ? (
                        <span
                          className="absolute left-1 top-1 z-[2] rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
                          style={{
                            background: "var(--color-foreground)",
                            color: "var(--color-background)",
                          }}
                        >
                          3D
                        </span>
                      ) : null}
                      <div
                        className="absolute inset-[12%] flex items-center justify-center"
                        style={{ perspective: "600px" }}
                        aria-hidden
                      >
                        {/* Never stretches the logo — contained media, not full-bleed cover */}
                        {lifestyleImage && !item.has3d ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={lifestyleImage}
                            alt=""
                            className="max-h-[80%] max-w-[80%] object-contain"
                            style={{
                              transform: imageTransform(imageMotion, motionActive),
                              transition: "transform 0.25s ease",
                            }}
                          />
                        ) : (
                          <div
                            className={
                              product3dOn && item.has3d
                                ? "sf-preview-product-mesh sf-preview-product-mesh--live"
                                : "sf-preview-product-mesh"
                            }
                            style={{
                              width: "78%",
                              aspectRatio: "1",
                              borderRadius:
                                threeFeel === "IMMERSIVE" ? "1.1rem" : "0.9rem",
                              background: `linear-gradient(145deg, color-mix(in srgb, ${a} 55%, white), color-mix(in srgb, ${a} 70%, var(--color-primary)))`,
                              boxShadow:
                                "0 12px 20px color-mix(in srgb, var(--color-foreground) 16%, transparent)",
                              transform:
                                product3dOn && item.has3d
                                  ? undefined
                                  : imageTransform(imageMotion, motionActive),
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 p-2">
                      <h3 className="truncate text-[10px] font-semibold">
                        {item.name}
                      </h3>
                      <p
                        className="text-[10px] font-semibold"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {item.price}
                      </p>
                      <span className="inline-flex px-2 py-1 text-[8px]" style={ctaStyle}>
                        Add to Cart
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-2 px-3 pb-3">
            <div
              className="rounded-xl px-3 py-2.5 text-center"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--color-border)",
                background:
                  "color-mix(in srgb, var(--color-accent) 12%, var(--color-card))",
              }}
            >
              <p className="text-[10px] font-semibold">Seasonal banner</p>
              <p className="mt-0.5 text-[9px] text-[var(--color-muted)]">
                Explore Collection
              </p>
            </div>
            <div
              className="rounded-xl px-3 py-3 text-center"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--color-border)",
                background:
                  "color-mix(in srgb, var(--color-primary) 10%, var(--color-card))",
              }}
            >
              <p className="text-sm font-semibold">Ready to shop?</p>
              <button
                type="button"
                className="mt-2 px-3 py-1.5 text-[10px]"
                style={ctaStyle}
              >
                Shop Now
              </button>
            </div>
          </section>

          <footer
            className="grid grid-cols-3 gap-2 px-3 py-3 text-[10px]"
            style={{
              background: "var(--color-footer-background)",
              color: "var(--color-footer-foreground)",
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "var(--color-border)",
            }}
          >
            <p className="truncate font-semibold">{brand.name}</p>
            <p className="opacity-75">Shop</p>
            <p className="opacity-75">Support</p>
          </footer>
        </div>
      </ThemePreview>
    </div>
  );
}

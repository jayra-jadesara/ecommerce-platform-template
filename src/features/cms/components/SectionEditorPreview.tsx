"use client";

import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import type { SupportedSectionType } from "@/features/cms/schemas";
import { SECTION_TYPE_LABELS } from "@/features/cms/schemas";
import { sfBtn, sfDisplay } from "@/components/ui/storefront-classes";
import {
  pageOptionLabel,
} from "@/features/admin/ui/StorePageLinkField";

export { STORE_PAGE_OPTIONS } from "@/features/admin/ui/StorePageLinkField";

function pageLabel(href: string | null | undefined): string {
  if (!href) return "";
  return pageOptionLabel(href) || href;
}

type PreviewConfig = Record<string, unknown>;

function text(value: unknown, fallback = ""): string {
  const t = String(value ?? "").trim();
  return t || fallback;
}

function PreviewShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          Live preview
        </p>
        <p className="text-[11px] text-[var(--color-muted)]">Shopper view</p>
      </div>
      {children}
      {footer ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function HeroPreview({ config }: { config: PreviewConfig }) {
  const fallbackTitle = text(config.title, "Your headline here");
  const fallbackSubtitle = text(config.subtitle);
  const fallbackDescription = text(
    config.description,
    "Supporting text appears here for shoppers.",
  );

  const rawSlides = Array.isArray(config.slides) ? config.slides : [];
  const firstSlide =
    (rawSlides.find((item) => {
      const s = (item ?? {}) as Record<string, unknown>;
      return Boolean(String(s.imagePath ?? "").trim());
    }) as Record<string, unknown> | undefined) ??
    (rawSlides[0] as Record<string, unknown> | undefined);

  const imagePath =
    String(firstSlide?.imagePath ?? "").trim() ||
    String(config.backgroundImagePath ?? "").trim() ||
    null;
  const bg = resolveCmsImageUrl(imagePath);

  const title = text(firstSlide?.title, fallbackTitle);
  const subtitle = text(firstSlide?.subtitle, fallbackSubtitle);
  const description = text(firstSlide?.description, fallbackDescription);
  const badge = text(firstSlide?.badge);
  const primaryLabel = text(
    firstSlide?.ctaLabel,
    text(config.primaryButtonText),
  );
  const secondaryLabel = text(
    firstSlide?.secondaryCtaLabel,
    text(config.secondaryButtonText),
  );
  const primaryHref =
    (firstSlide?.ctaHref as string | null | undefined) ||
    (config.primaryButtonLink as string | null | undefined) ||
    null;
  const secondaryHref =
    (firstSlide?.secondaryCtaHref as string | null | undefined) ||
    (config.secondaryButtonLink as string | null | undefined) ||
    null;
  const slideCount = Math.max(rawSlides.length, imagePath || title ? 1 : 0);

  return (
    <PreviewShell
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
            Campaign hero
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {slideCount} slide{slideCount === 1 ? "" : "s"} · full-bleed
            preview of the first campaign
          </p>
          {primaryLabel ? (
            <p className="text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-foreground)]">
                {primaryLabel}
              </span>
              {primaryHref ? (
                <>
                  {" "}
                  → {pageLabel(primaryHref)}{" "}
                  <code className="text-[10px] opacity-70">{primaryHref}</code>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">Main button hidden</p>
          )}
          {secondaryLabel ? (
            <p className="text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-foreground)]">
                {secondaryLabel}
              </span>
              {secondaryHref ? (
                <>
                  {" "}
                  → {pageLabel(secondaryHref)}{" "}
                  <code className="text-[10px] opacity-70">{secondaryHref}</code>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      }
    >
      <div className="relative min-h-[14rem] overflow-hidden bg-[var(--color-foreground)]">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-foreground))]"
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--color-foreground)_78%,transparent)] via-[color-mix(in_srgb,var(--color-foreground)_45%,transparent)] to-transparent"
          aria-hidden
        />
        <div className="relative z-[1] flex min-h-[14rem] flex-col justify-end gap-2 p-5 text-white sm:max-w-[70%] sm:justify-center">
          {badge ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
              {badge}
            </p>
          ) : null}
          {subtitle ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {subtitle}
            </p>
          ) : null}
          <h3 className={`${sfDisplay()} text-xl leading-tight text-white sm:text-2xl`}>
            {title}
          </h3>
          {description ? (
            <p className="max-w-md text-xs leading-relaxed text-white/85">
              {description}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-2">
            {primaryLabel ? (
              <span
                className={`${sfBtn("primary")} pointer-events-none !min-h-9 !px-3 !text-xs`}
              >
                {primaryLabel}
              </span>
            ) : null}
            {secondaryLabel ? (
              <span className="pointer-events-none inline-flex min-h-9 items-center rounded-md border border-white/45 bg-white/10 px-3 text-xs font-semibold text-white">
                {secondaryLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function SimpleBlockPreview({
  eyebrow,
  heading,
  body,
  buttonText,
  buttonLink,
  imagePath,
}: {
  eyebrow: string;
  heading: string;
  body?: string;
  buttonText?: string;
  buttonLink?: string | null;
  imagePath?: string | null;
}) {
  const img = resolveCmsImageUrl(imagePath);
  return (
    <PreviewShell
      footer={
        buttonText && buttonLink ? (
          <p className="text-xs text-[var(--color-muted)]">
            Button{" "}
            <span className="font-semibold text-[var(--color-foreground)]">{buttonText}</span>{" "}
            → {pageLabel(buttonLink)}{" "}
            <code className="text-[10px] opacity-70">{buttonLink}</code>
          </p>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">No button yet</p>
        )
      }
    >
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
          <h3 className={`${sfDisplay()} text-lg text-[var(--color-foreground)]`}>
            {heading}
          </h3>
          {body ? (
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">{body}</p>
          ) : null}
          {buttonText ? (
            <span className={`${sfBtn("primary")} pointer-events-none !min-h-9 !w-fit !px-3 !text-xs`}>
              {buttonText}
            </span>
          ) : null}
        </div>
        {img ? (
          <div className="relative h-24 w-28 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
      </div>
    </PreviewShell>
  );
}

function ListPreview({
  title,
  description,
  items,
  emptyHint,
}: {
  title: string;
  description?: string;
  items: Array<{ title: string; detail?: string }>;
  emptyHint: string;
}) {
  return (
    <PreviewShell>
      <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <h3 className={`${sfDisplay()} text-lg text-[var(--color-foreground)]`}>{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-[var(--color-muted)]">{description}</p>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted)]">
            {emptyHint}
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.slice(0, 6).map((item) => (
              <li
                key={`${item.title}-${item.detail ?? ""}`}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              >
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {item.title}
                </p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PreviewShell>
  );
}

function ProductsPreview({ config }: { config: PreviewConfig }) {
  const source = String(config.source ?? "FEATURED_PRODUCTS");
  const categoryId = String(config.categoryId ?? "").trim();
  const productIds = Array.isArray(config.productIds)
    ? (config.productIds as string[])
    : [];
  const sourceLabel =
    source === "LATEST_PRODUCTS"
      ? "Latest products"
      : source === "CATEGORY_PRODUCTS"
        ? categoryId
          ? "One category"
          : "One category (pick a category)"
        : source === "SELECTED_PRODUCTS"
          ? productIds.length
            ? `${productIds.length} hand-picked`
            : "Hand-picked (select products)"
          : "Featured products";
  const limit = Number(config.limit ?? 8) || 8;
  const previewCount =
    source === "SELECTED_PRODUCTS" && productIds.length > 0
      ? Math.min(limit, productIds.length, 6)
      : Math.min(limit, 6);
  const needsSetup =
    (source === "CATEGORY_PRODUCTS" && !categoryId) ||
    (source === "SELECTED_PRODUCTS" && productIds.length === 0);

  return (
    <PreviewShell
      footer={
        <p className="text-[0.7rem] text-[var(--color-muted)]">
          Shows up to <strong>{limit}</strong> · {sourceLabel}
        </p>
      }
    >
      <div className="space-y-2 p-3">
        <div className="text-center">
          <p className={`${sfDisplay()} text-sm`}>
            {text(config.title, "Featured products")}
          </p>
          {text(config.description) ? (
            <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--color-muted)] line-clamp-2">
              {text(config.description)}
            </p>
          ) : null}
        </div>
        {needsSetup ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-xs text-[var(--color-muted)]">
            {source === "CATEGORY_PRODUCTS"
              ? "Choose a category on the left"
              : "Pick products on the left"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {Array.from({ length: previewCount }, (_, i) => (
              <div
                key={i}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5"
              >
                <div className="mb-1.5 aspect-square rounded bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))]" />
                <p className="truncate text-[0.65rem] font-medium">
                  Product {i + 1}
                </p>
                <p className="text-[0.6rem] text-[var(--color-muted)]">
                  Store catalog
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PreviewShell>
  );
}

function CategoriesPreview({ config }: { config: PreviewConfig }) {
  const cols = Number(config.columns ?? 3) || 3;
  const ids = Array.isArray(config.categoryIds) ? config.categoryIds : [];
  const placeholders = ["Seasoning", "Grinded", "Blended", "Whole"];
  const count = ids.length > 0 ? Math.min(ids.length, 4) : Math.min(cols, 4);
  return (
    <PreviewShell
      footer={
        <p className="text-[0.7rem] text-[var(--color-muted)]">
          {ids.length
            ? `${ids.length} selected`
            : "All active (automatic)"}{" "}
          · {cols} columns
        </p>
      }
    >
      <div className="space-y-2 p-3">
        <div className="text-center">
          <p className={`${sfDisplay()} text-sm`}>
            {text(config.title, "Shop by category")}
          </p>
          {text(config.description) ? (
            <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--color-muted)] line-clamp-2">
              {text(config.description)}
            </p>
          ) : null}
        </div>
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))`,
          }}
        >
          {placeholders.slice(0, count).map((name) => (
            <div
              key={name}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-3 text-center text-[0.7rem] font-semibold"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

/**
 * Live preview for any homepage section while editing in admin.
 */
export function SectionEditorPreview({
  sectionType,
  config,
}: {
  sectionType: SupportedSectionType;
  config: PreviewConfig;
}) {
  if (sectionType === "hero") {
    return <HeroPreview config={config} />;
  }

  if (sectionType === "products") {
    return <ProductsPreview config={config} />;
  }

  if (sectionType === "categories") {
    return <CategoriesPreview config={config} />;
  }

  if (sectionType === "other_information") {
    const picks = [
      config.showStory ? "Story" : null,
      config.showVisionMission ? "Vision & mission" : null,
      config.showFactory ? "Factory" : null,
      config.showCertificates ? "Certificates" : null,
      config.showTrain ? "Heritage train" : null,
    ].filter(Boolean);
    return (
      <PreviewShell>
        <div className="space-y-2 p-4 text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            Other information
          </p>
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            From Content → About
          </p>
          {picks.length > 0 ? (
            <p className="text-xs text-[var(--color-muted)]">
              Showing: {picks.join(" · ")}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              Turn on at least one block to show on the homepage.
            </p>
          )}
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "about") {
    const portrait = resolveCmsImageUrl(config.imagePath as string | null);
    const engineWheel = resolveCmsImageUrl(
      (config.engineWheelImagePath as string | null) ?? null,
    );
    const stops = (
      (config.timelineItems as Array<{
        year?: string;
        label?: string;
      }>) ?? []
    ).filter((item) => text(item.year) || text(item.label));
    const factorySlides = (
      (config.factorySlides as Array<{
        imagePath?: string | null;
        title?: string;
      }>) ?? []
    ).filter(
      (slide) =>
        Boolean(slide.imagePath?.trim()) || Boolean(slide.title?.trim()),
    );
    const certSlides = (
      (config.certificatesSlides as Array<{
        imagePath?: string | null;
      }>) ?? []
    ).filter((slide) => Boolean(slide.imagePath?.trim()));
    const showFactory =
      Boolean(config.factoryEnabled) && factorySlides.length > 0;
    const showCerts =
      Boolean(config.certificatesEnabled) && certSlides.length > 0;
    const showVm =
      Boolean(config.visionMissionEnabled) &&
      (Boolean(text(config.visionText)) || Boolean(text(config.missionText)));
    return (
      <PreviewShell>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2 text-left">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              About
            </p>
            <h3 className={`${sfDisplay()} text-lg`}>
              {text(config.heading, "A Visionary Beyond Generations")}
            </h3>
            {text(config.description) ? (
              <p className="text-xs leading-relaxed text-[var(--color-muted)] line-clamp-4">
                {text(config.description)}
              </p>
            ) : null}
            {text(config.quote) ? (
              <p className="text-xs italic text-[var(--color-primary)]">
                “{text(config.quote)}”
                {text(config.quoteAuthor)
                  ? ` — ${text(config.quoteAuthor)}`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="relative min-h-[8rem] overflow-hidden rounded-lg bg-[var(--color-primary)]">
            {portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portrait}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            ) : (
              <p className="flex h-full items-center justify-center p-3 text-center text-xs text-[var(--color-button-foreground)] opacity-80">
                Portrait image
              </p>
            )}
            {text(config.imageCaptionName) ? (
              <div className="absolute bottom-2 left-2 rounded bg-[color-mix(in_srgb,var(--color-accent)_90%,#fff)] px-2 py-1 text-[0.65rem] font-semibold text-white">
                {text(config.imageCaptionName)}
                {text(config.imageCaptionRole)
                  ? ` · ${text(config.imageCaptionRole)}`
                  : ""}
              </div>
            ) : null}
          </div>
        </div>
        {showVm ? (
          <div className="border-t border-[var(--color-border)] px-4 py-3 text-center">
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Vision & mission
            </p>
            <p className="text-xs text-[var(--color-foreground)] line-clamp-2">
              {text(config.visionText) || text(config.missionText)}
            </p>
          </div>
        ) : null}
        {showFactory ? (
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              {text(config.factoryHeading, "Factory")} · {factorySlides.length}{" "}
              photo{factorySlides.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {factorySlides.slice(0, 3).map((slide, i) => {
                const src = resolveCmsImageUrl(slide.imagePath ?? null);
                return (
                  <div
                    key={`prev-factory-${i}`}
                    className={
                      i === 0 && factorySlides.length >= 3
                        ? "relative col-span-2 row-span-2 min-h-[4.5rem] overflow-hidden rounded-md bg-[var(--color-surface)]"
                        : "relative aspect-[4/3] overflow-hidden rounded-md bg-[var(--color-surface)]"
                    }
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {showCerts ? (
          <div className="border-t border-[var(--color-border)] px-4 py-3 text-center">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              {text(config.certificatesHeading, "Certificates")} ·{" "}
              {certSlides.length} seal{certSlides.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {certSlides.slice(0, 6).map((slide, i) => {
                const src = resolveCmsImageUrl(slide.imagePath ?? null);
                return (
                  <div
                    key={`prev-cert-${i}`}
                    className="relative h-10 w-10 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))] bg-[var(--color-surface)]"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="absolute inset-0 h-full w-full object-contain p-1"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {stops.length > 0 ? (
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Heritage train
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <div className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  Engine
                </span>
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-card)]">
                  {engineWheel ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={engineWheel}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[0.55rem] text-[var(--color-muted)]">
                      ◆
                    </span>
                  )}
                </span>
              </div>
              {stops.map((stop, index) => (
                  <div
                    key={`preview-stop-${index}`}
                    className="flex min-w-[5.25rem] shrink-0 flex-col items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-2"
                  >
                    <span className="max-w-full truncate text-[0.7rem] font-bold text-[var(--color-primary)]">
                      {text(stop.year, `Bogie ${index + 1}`)}
                    </span>
                    {text(stop.label) ? (
                      <span className="max-w-full truncate text-[0.55rem] text-[var(--color-muted)]">
                        {text(stop.label)}
                      </span>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                        {engineWheel ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={engineWheel}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[0.45rem] text-[var(--color-muted)]">
                            •
                          </span>
                        )}
                      </span>
                      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                        {engineWheel ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={engineWheel}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[0.45rem] text-[var(--color-muted)]">
                            •
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <p className="text-[0.65rem] text-[var(--color-muted)]">
              Add bogie milestones to show the heritage train here.
            </p>
          </div>
        )}
      </PreviewShell>
    );
  }

  if (sectionType === "career") {
    const paras = (
      (config.introParagraphs as string[] | undefined) ?? []
    ).filter((p) => Boolean(p?.trim()));
    return (
      <PreviewShell>
        <div className="space-y-2 p-4 text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            Career
          </p>
          <h3 className={`${sfDisplay()} text-lg`}>
            {text(config.heading, "Careers")}
          </h3>
          {paras.slice(0, 2).map((p, i) => (
            <p
              key={i}
              className="text-xs leading-relaxed text-[var(--color-muted)] line-clamp-3"
            >
              {p}
            </p>
          ))}
          <p className="text-[0.65rem] text-[var(--color-muted)]">
            Invite: {text(config.ctaText) || "—"} · Form{" "}
            {config.formEnabled === false ? "hidden" : "enabled"} · no CV upload
          </p>
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "cta") {
    return (
      <PreviewShell
        footer={
          text(config.buttonText) && config.buttonLink ? (
            <p className="text-[0.7rem] text-[var(--color-muted)]">
              → {pageLabel(String(config.buttonLink))}
            </p>
          ) : null
        }
      >
        <div className="relative overflow-hidden px-3 py-4 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 72%)",
            }}
          />
          <div className="relative space-y-1.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              Call to action
            </p>
            <h3 className={`${sfDisplay()} text-base leading-snug`}>
              {text(config.heading, "Heading")}
            </h3>
            {text(config.description) ? (
              <p className="mx-auto max-w-sm text-[0.7rem] leading-relaxed text-[var(--color-muted)] line-clamp-3">
                {text(config.description)}
              </p>
            ) : null}
            {text(config.buttonText) ? (
              <div className="pt-1">
                <span
                  className={`${sfBtn("primary")} pointer-events-none !min-h-8 !px-3 !text-[0.7rem]`}
                >
                  {text(config.buttonText)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "text_image") {
    return (
      <SimpleBlockPreview
        eyebrow={SECTION_TYPE_LABELS[sectionType]}
        heading={text(config.heading, "Heading")}
        body={text(config.description)}
        buttonText={text(config.buttonText) || undefined}
        buttonLink={(config.buttonLink as string) || null}
        imagePath={config.imagePath as string | null}
      />
    );
  }

  if (sectionType === "banner") {
    const img = resolveCmsImageUrl(config.imagePath as string | null);
    return (
      <PreviewShell
        footer={
          text(config.buttonText) && config.link ? (
            <p className="text-xs text-[var(--color-muted)]">
              Button → {pageLabel(String(config.link))}
            </p>
          ) : null
        }
      >
        <div className="relative min-h-[9rem] overflow-hidden bg-[var(--color-surface)]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          ) : null}
          <div className="relative z-[1] flex min-h-[9rem] flex-col items-center justify-center gap-2 p-4 text-center">
            <h3 className={`${sfDisplay()} text-lg`}>
              {text(config.title, "Banner title")}
            </h3>
            {text(config.description) ? (
              <p className="max-w-sm text-xs text-[var(--color-muted)]">
                {text(config.description)}
              </p>
            ) : null}
            {text(config.buttonText) ? (
              <span className={`${sfBtn("primary")} pointer-events-none !min-h-9 !px-3 !text-xs`}>
                {text(config.buttonText)}
              </span>
            ) : null}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "features") {
    const items = Array.isArray(config.items)
      ? (config.items as Array<{
          icon?: string;
          title?: string;
          description?: string;
        }>).filter((i) => String(i.title ?? "").trim())
      : [];
    return (
      <PreviewShell>
        <div className="space-y-2.5 p-3">
          <div className="text-center">
            <p className={`${sfDisplay()} text-sm`}>
              {text(config.title, "Why choose us")}
            </p>
            {text(config.description) ? (
              <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--color-muted)] line-clamp-2">
                {text(config.description)}
              </p>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-xs text-[var(--color-muted)]">
              Add feature cards on the left
            </p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {items.slice(0, 6).map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  className="rounded-md border border-[var(--color-border)] px-2 py-2"
                >
                  <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    {text(item.icon, "star")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug">
                    {text(item.title, "Feature")}
                  </p>
                  {text(item.description) ? (
                    <p className="mt-0.5 text-[0.65rem] leading-snug text-[var(--color-muted)] line-clamp-2">
                      {text(item.description)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "statistics") {
    const items = Array.isArray(config.items)
      ? (config.items as Array<{ value?: string; label?: string }>).filter(
          (i) => String(i.value ?? "").trim() || String(i.label ?? "").trim(),
        )
      : [];
    return (
      <PreviewShell>
        <div className="space-y-2.5 p-3">
          <p className={`${sfDisplay()} text-center text-sm`}>
            {text(config.title, "By the numbers")}
          </p>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-xs text-[var(--color-muted)]">
              Add numbers on the left
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-1.5">
              {items.slice(0, 8).map((item, index) => (
                <li
                  key={`${item.value}-${item.label}-${index}`}
                  className="rounded-md border border-[var(--color-border)] px-2 py-2 text-center"
                >
                  <p className={`${sfDisplay()} text-base leading-none`}>
                    {text(item.value, "—")}
                  </p>
                  <p className="mt-1 text-[0.65rem] leading-snug text-[var(--color-muted)]">
                    {text(item.label, "Label")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "testimonials") {
    const items = Array.isArray(config.items)
      ? (config.items as Array<{ customerName?: string; quote?: string }>).map((i) => ({
          title: text(i.customerName, "Customer"),
          detail: text(i.quote),
        }))
      : [];
    return (
      <ListPreview
        title={text(config.title, "What customers say")}
        items={items}
        emptyHint="Add quotes as: name|role|quote|rating"
      />
    );
  }

  if (sectionType === "faq") {
    const items = Array.isArray(config.items)
      ? (config.items as Array<{
          question?: string;
          answer?: string;
          active?: boolean;
        }>)
          .filter((i) => i.active !== false && String(i.question ?? "").trim())
          .map((i) => ({
            question: text(i.question, "Question"),
            answer: text(i.answer, "Answer appears here."),
          }))
      : [];
    return (
      <PreviewShell>
        <div className="space-y-2 p-3">
          <p className={`${sfDisplay()} text-center text-sm`}>
            {text(config.title, "FAQ")}
          </p>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-xs text-[var(--color-muted)]">
              Add questions and answers on the left
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item, index) => {
                const open = index === 0;
                return (
                  <li
                    key={`${item.question}-${index}`}
                    className={`overflow-hidden rounded-md border border-[var(--color-border)] ${
                      open
                        ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <span className="text-[0.6rem] font-bold tabular-nums text-[var(--color-primary)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-snug">
                        {item.question}
                      </span>
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          open
                            ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                            : "border border-[var(--color-border)] text-[var(--color-primary)]"
                        }`}
                        aria-hidden
                      >
                        {open ? "−" : "+"}
                      </span>
                    </div>
                    {open ? (
                      <p className="border-t border-[var(--color-border)] px-2 py-1.5 text-[0.7rem] leading-relaxed text-[var(--color-muted)]">
                        {item.answer}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PreviewShell>
    );
  }

  if (sectionType === "newsletter") {
    return (
      <SimpleBlockPreview
        eyebrow="Newsletter"
        heading={text(config.heading ?? config.title, "Stay in the loop")}
        body={text(config.description, "Get updates about new products.")}
        buttonText={text(config.buttonText, "Subscribe")}
        buttonLink={null}
      />
    );
  }

  return (
    <PreviewShell>
      <div className="p-4">
        <p className="text-sm font-medium">{SECTION_TYPE_LABELS[sectionType]}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {text(config.title ?? config.heading, "Edit fields to update this block")}
        </p>
      </div>
    </PreviewShell>
  );
}

/** @deprecated use SectionEditorPreview */
export function HeroEditorPreview({ config }: { config: PreviewConfig }) {
  return <SectionEditorPreview sectionType="hero" config={config} />;
}

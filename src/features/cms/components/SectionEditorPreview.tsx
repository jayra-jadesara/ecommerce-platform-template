"use client";

import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import type { SupportedSectionType } from "@/features/cms/schemas";
import { SECTION_TYPE_LABELS } from "@/features/cms/schemas";
import { sfBtn, sfDisplay } from "@/components/ui/storefront-classes";
import {
  pageOptionLabel,
  STORE_PAGE_OPTIONS,
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
  const title = text(config.title, "Your headline here");
  const subtitle = text(config.subtitle);
  const description = text(
    config.description,
    "Supporting text appears here for shoppers.",
  );
  const bg = resolveCmsImageUrl(config.backgroundImagePath as string | null);
  const fg = resolveCmsImageUrl(config.foregroundImagePath as string | null);
  const align =
    config.alignment === "center"
      ? "items-center text-center"
      : config.alignment === "right"
        ? "items-end text-right"
        : "items-start text-left";
  const justify =
    config.alignment === "center"
      ? "justify-center"
      : config.alignment === "right"
        ? "justify-end"
        : "justify-start";
  const primaryLabel = text(config.primaryButtonText);
  const secondaryLabel = text(config.secondaryButtonText);
  const primaryHref = (config.primaryButtonLink as string) || null;
  const secondaryHref = (config.secondaryButtonLink as string) || null;

  return (
    <PreviewShell
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
            Where buttons go
          </p>
          {primaryLabel && primaryHref ? (
            <p className="text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-foreground)]">
                {primaryLabel}
              </span>{" "}
              → {pageLabel(primaryHref)}{" "}
              <code className="text-[10px] opacity-70">{primaryHref}</code>
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">Main button hidden</p>
          )}
          {secondaryLabel && secondaryHref ? (
            <p className="text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-foreground)]">
                {secondaryLabel}
              </span>{" "}
              → {pageLabel(secondaryHref)}{" "}
              <code className="text-[10px] opacity-70">{secondaryHref}</code>
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">Second button hidden</p>
          )}
        </div>
      }
    >
      <div className="relative min-h-[13rem] overflow-hidden">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        ) : (
          <div className="hero-3d-css-backdrop absolute inset-0" aria-hidden />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--color-foreground)_72%,transparent)] via-[color-mix(in_srgb,var(--color-foreground)_40%,transparent)] to-transparent"
          aria-hidden
        />
        <div
          className={`relative z-[1] flex min-h-[13rem] gap-4 p-5 ${fg ? "flex-col sm:flex-row sm:items-center" : "flex-col"}`}
        >
          <div className={`flex max-w-md flex-1 flex-col gap-2 text-white ${align}`}>
            {subtitle ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                {subtitle}
              </p>
            ) : null}
            <h3 className={`${sfDisplay()} text-xl leading-tight text-white`}>{title}</h3>
            <p className="text-xs leading-relaxed text-white/85">{description}</p>
            <div className={`mt-1 flex flex-wrap gap-2 ${justify}`}>
              {primaryLabel ? (
                <span className={`${sfBtn("primary")} pointer-events-none !min-h-9 !px-3 !text-xs`}>
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
          {fg ? (
            <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/10 sm:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fg} alt="" className="h-full w-full object-contain p-2" />
            </div>
          ) : null}
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
  const sourceLabel =
    source === "LATEST_PRODUCTS"
      ? "Newest products"
      : source === "CATEGORY_PRODUCTS"
        ? "Products from one category"
        : source === "SELECTED_PRODUCTS"
          ? "Hand-picked products"
          : "Featured products";
  const limit = Number(config.limit ?? 8) || 8;
  return (
    <PreviewShell
      footer={
        <p className="text-xs text-[var(--color-muted)]">
          Shows up to <strong>{limit}</strong> items from: {sourceLabel}
        </p>
      }
    >
      <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h3 className={`${sfDisplay()} text-lg`}>
          {text(config.title, "Featured products")}
        </h3>
        {text(config.description) ? (
          <p className="text-xs text-[var(--color-muted)]">{text(config.description)}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: Math.min(limit, 6) }, (_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            >
              <div className="mb-2 aspect-square rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))]" />
              <p className="truncate text-[11px] font-medium">Product {i + 1}</p>
              <p className="text-[10px] text-[var(--color-muted)]">From catalog</p>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function CategoriesPreview({ config }: { config: PreviewConfig }) {
  const cols = Number(config.columns ?? 3) || 3;
  const ids = Array.isArray(config.categoryIds) ? config.categoryIds : [];
  return (
    <PreviewShell
      footer={
        <p className="text-xs text-[var(--color-muted)]">
          {ids.length
            ? `${ids.length} selected categor${ids.length === 1 ? "y" : "ies"}`
            : "All active categories (automatic)"}{" "}
          · {cols} columns
        </p>
      }
    >
      <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h3 className={`${sfDisplay()} text-lg`}>
          {text(config.title, "Shop by category")}
        </h3>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))` }}
        >
          {["Seasoning", "Grinded", "Blended"].slice(0, cols).map((name) => (
            <div
              key={name}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-4 text-center text-xs font-semibold"
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

  if (sectionType === "about" || sectionType === "cta" || sectionType === "text_image") {
    return (
      <SimpleBlockPreview
        eyebrow={SECTION_TYPE_LABELS[sectionType]}
        heading={text(config.heading, "Heading")}
        body={text(config.description)}
        buttonText={text(config.buttonText) || undefined}
        buttonLink={(config.buttonLink as string) || null}
        imagePath={
          sectionType === "cta" ? null : (config.imagePath as string | null)
        }
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
      ? (config.items as Array<{ title?: string; description?: string }>).map((i) => ({
          title: text(i.title, "Feature"),
          detail: text(i.description),
        }))
      : [];
    return (
      <ListPreview
        title={text(config.title, "Why choose us")}
        description={text(config.description)}
        items={items}
        emptyHint="Add features as: icon|title|description"
      />
    );
  }

  if (sectionType === "statistics") {
    const items = Array.isArray(config.items)
      ? (config.items as Array<{ value?: string; label?: string }>).map((i) => ({
          title: text(i.value, "0"),
          detail: text(i.label),
        }))
      : [];
    return (
      <ListPreview
        title={text(config.title, "By the numbers")}
        items={items}
        emptyHint="Add stats as: value|label"
      />
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
      ? (config.items as Array<{ question?: string; answer?: string }>).map((i) => ({
          title: text(i.question, "Question"),
          detail: text(i.answer),
        }))
      : [];
    return (
      <ListPreview
        title={text(config.title, "FAQ")}
        items={items}
        emptyHint="Add FAQ as: question|answer"
      />
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

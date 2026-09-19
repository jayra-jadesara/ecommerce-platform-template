import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Motion } from "@/features/animation";
import type { AnimationConfig, VisualEffectsConfig } from "@/types";
import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";
import { coerceHeadingHighlightStyle } from "@/features/theme/heading-highlight";
import type { StorefrontSection } from "@/features/cms/storefront";
import type {
  SectionConfigMap,
  SupportedSectionType,
} from "@/features/cms/schemas";
import {
  resolveCmsImageUrl,
  sectionShellClassName,
} from "@/features/cms/section-styles";
import { NewsletterSignup } from "@/features/cms/components/NewsletterSignup";
import { HeroCarousel } from "@/features/cms/components/HeroCarousel";
import { FaqAccordion } from "@/features/cms/components/FaqAccordion";
import {
  AboutBlocks,
  aboutBlocksForFullPage,
} from "@/features/cms/components/AboutBlocks";
import { OtherInformationFromAbout } from "@/features/cms/components/OtherInformationFromAbout";
import { defaultPlatformConfig } from "@/config/defaults";
import {
  sfBtn,
  sfDisplay,
  sfEyebrow,
  sfSectionInner,
} from "@/components/ui/storefront-classes";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";
import {
  resolveMotionConfig,
  sectionMotionOverrideFromConfig,
} from "@/features/motion-3d";

type Props = {
  section: StorefrontSection;
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
  currency?: string;
  isAuthenticated?: boolean;
  headingHighlightStyle?: HeadingHighlightStyle;
};

function SectionMotion({
  section,
  animation,
  children,
  className,
}: {
  section: StorefrontSection;
  animation: AnimationConfig;
  children: ReactNode;
  className?: string;
}) {
  const cfg = section.config as SectionConfigMap[SupportedSectionType];
  const common = cfg as SectionConfigMap["hero"];
  const override = sectionMotionOverrideFromConfig(common);
  const effective = resolveMotionConfig({
    global: animation,
    section: override,
    reducedMotion: false,
  });

  if (!effective.shouldAnimate) {
    return <section className={className}>{children}</section>;
  }

  return (
    <Motion
      as="section"
      animation={animation}
      sectionOverride={override}
      className={className}
    >
      {children}
    </Motion>
  );
}

function SafeLink({
  href,
  children,
  className,
}: {
  href: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (!href) return null;
  const external = href.startsWith("http");
  if (external) {
    return (
      <a href={href} className={className} rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function buttonClass(variant: "primary" | "secondary" = "primary") {
  return sfBtn(variant === "secondary" ? "outline" : "primary");
}

export function SectionRenderer({
  section,
  animation,
  visualEffects = defaultPlatformConfig.visualEffects,
  currency = defaultPlatformConfig.store.currency,
  isAuthenticated = false,
  headingHighlightStyle: highlightStyleProp,
}: Props) {
  const cfg = section.config;
  const shell = sectionShellClassName(cfg as SectionConfigMap["hero"]);
  const highlightStyle = coerceHeadingHighlightStyle(
    highlightStyleProp ??
      defaultPlatformConfig.typography.headingHighlightStyle,
  );
  const accentFromConfig = () => ({
    highlightStyle,
  });

  switch (section.sectionType) {
    case "hero": {
      const c = cfg as SectionConfigMap["hero"];
      const configuredSlides = Array.isArray(c.slides)
        ? c.slides.filter((s) => Boolean(s?.imagePath?.trim()))
        : [];

      const slides =
        configuredSlides.length > 0
          ? configuredSlides.map((s) => ({
              ...s,
              foregroundImagePath: null as string | null,
            }))
          : [
              {
                imagePath:
                  c.backgroundImagePath?.trim() ||
                  c.foregroundImagePath?.trim() ||
                  "_",
                title: c.title,
                subtitle: c.subtitle,
                description: c.description,
                badge: "",
                ctaLabel: c.primaryButtonText ?? "",
                ctaHref: c.primaryButtonLink ?? "/products",
                secondaryCtaLabel: c.secondaryButtonText ?? "",
                secondaryCtaHref: c.secondaryButtonLink ?? "/about",
                foregroundImagePath:
                  c.backgroundImagePath?.trim() && c.foregroundImagePath?.trim()
                    ? c.foregroundImagePath
                    : null,
              },
            ];

      const hasRenderable =
        configuredSlides.length > 0 ||
        Boolean(c.backgroundImagePath?.trim()) ||
        Boolean(c.foregroundImagePath?.trim()) ||
        Boolean(c.title?.trim()) ||
        Boolean(c.subtitle?.trim()) ||
        Boolean(c.description?.trim()) ||
        Boolean(c.primaryButtonText?.trim());

      if (!hasRenderable) return null;

      return (
        <SectionMotion
          section={section}
          animation={animation}
          className="w-full bg-transparent py-0"
        >
          <HeroCarousel
            slides={slides}
            autoplayMs={c.autoplayMs ?? 5000}
            showArrows={c.showArrows !== false}
            fallbackTitle={c.title}
            fallbackSubtitle={c.subtitle}
            fallbackDescription={c.description}
          />
        </SectionMotion>
      );
    }

    case "categories": {
      const c = cfg as SectionConfigMap["categories"];
      const cats = section.resolved?.categories ?? [];
      if (cats.length === 0) return null;
      const heading = c.title?.trim() || "Explore our Collections";
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            <div className="mx-auto max-w-3xl text-center">
              <SectionAccentHeading
                title={heading}
                {...accentFromConfig()}
              />
              {c.description ? (
                <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--color-muted)] sm:text-base">
                  {c.description}
                </p>
              ) : null}
            </div>
            <ul className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-5 sm:gap-6">
              {cats.map((cat) => (
                <li key={cat.id} className="w-48 shrink-0 sm:w-56 md:w-60">
                  <Link
                    href={`/categories/${encodeURIComponent(cat.slug)}`}
                    className="group block overflow-hidden rounded-[var(--radius-default,0.75rem)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[var(--radius-default,0.75rem)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-primary)_10%)]">
                      {cat.imageUrl ? (
                        <Image
                          src={cat.imageUrl}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                          sizes="240px"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-[var(--color-primary)]"
                          aria-hidden
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 60%)",
                          }}
                        >
                          {cat.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="px-1 pt-2.5 text-center">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        {cat.name}
                      </p>
                      {cat.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-muted)]">
                          {cat.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SectionMotion>
      );
    }

    case "products": {
      const c = cfg as SectionConfigMap["products"];
      const products = section.resolved?.products ?? [];
      if (products.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            {c.title ? (
              <div className="mx-auto max-w-3xl text-center">
                <SectionAccentHeading title={c.title} {...accentFromConfig()} />
                {c.description ? (
                  <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">
                    {c.description}
                  </p>
                ) : null}
              </div>
            ) : c.description ? (
              <p className="mx-auto max-w-2xl text-center text-sm text-[var(--color-muted)]">
                {c.description}
              </p>
            ) : null}
            <ul className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4">
              {products.map((product) => (
                <li key={product.id} className="flex h-full min-w-0">
                  <ProductCard
                    product={product}
                    currency={currency}
                    isAuthenticated={isAuthenticated}
                  />
                </li>
              ))}
            </ul>
          </div>
        </SectionMotion>
      );
    }

    case "banner":
    case "image": {
      const c = cfg as SectionConfigMap["banner"] | SectionConfigMap["image"];
      const imagePath =
        "imagePath" in c ? c.imagePath : (c as SectionConfigMap["image"]).imagePath;
      const url = resolveCmsImageUrl(imagePath);
      if (!url && section.sectionType === "image") return null;
      const banner = c as SectionConfigMap["banner"];
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            <div className="relative min-h-[14rem] overflow-hidden rounded-[var(--radius-default,1rem)] border border-[var(--color-border)] md:min-h-[18rem]">
              {url ? (
                <Image
                  src={url}
                  alt={"altText" in c ? c.altText || "" : ""}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  aria-hidden
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 35%, var(--color-surface)), color-mix(in srgb, var(--color-accent) 25%, var(--color-card)))",
                  }}
                />
              )}
              {section.sectionType === "banner" ? (
                <div
                  className={`relative z-10 flex min-h-[14rem] flex-col justify-end gap-3 p-6 md:min-h-[18rem] md:p-10 ${
                    banner.overlayStyle === "strong"
                      ? "bg-gradient-to-t from-black/65 via-black/35 to-transparent text-white"
                      : banner.overlayStyle === "soft"
                        ? "bg-gradient-to-t from-black/45 via-black/20 to-transparent text-white"
                        : ""
                  } ${
                    banner.alignment === "center"
                      ? "items-center text-center"
                      : banner.alignment === "right"
                        ? "items-end text-right"
                        : "items-start"
                  }`}
                >
                  {banner.title ? (
                    <h2 className={`${sfDisplay()} text-2xl md:text-3xl`}>
                      {banner.title}
                    </h2>
                  ) : null}
                  {banner.description ? (
                    <p className="max-w-xl text-sm opacity-90 md:text-base">
                      {banner.description}
                    </p>
                  ) : null}
                  {banner.buttonText && banner.link ? (
                    <SafeLink href={banner.link} className={buttonClass("primary")}>
                      {banner.buttonText}
                    </SafeLink>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "text_image": {
      const c = cfg as SectionConfigMap["text_image"];
      const heading = c.heading ?? "";
      const description = c.description ?? "";
      const url = resolveCmsImageUrl(c.imagePath);
      const imageLeft = c.imagePosition === "left";
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
            <div className={imageLeft ? "md:order-2" : ""}>
              {heading ? (
                <SectionAccentHeading title={heading} {...accentFromConfig()} />
              ) : null}
              {description ? (
                <p className="mt-3 whitespace-pre-wrap text-[var(--color-muted)]">
                  {description}
                </p>
              ) : null}
              {c.buttonText && c.buttonLink ? (
                <div className="mt-5">
                  <SafeLink href={c.buttonLink} className={buttonClass("primary")}>
                    {c.buttonText}
                  </SafeLink>
                </div>
              ) : null}
            </div>
            {url ? (
              <div
                className={`relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] ${imageLeft ? "md:order-1" : ""}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="480px"
                />
              </div>
            ) : null}
          </div>
        </SectionMotion>
      );
    }

    case "about": {
      const c = cfg as SectionConfigMap["about"];
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <AboutBlocks
            config={c}
            blocks={aboutBlocksForFullPage()}
            headingHighlightStyle={highlightStyle}
            priorityStoryImage
          />
        </SectionMotion>
      );
    }

    case "other_information": {
      const c = cfg as SectionConfigMap["other_information"];
      return (
        <OtherInformationFromAbout
          flags={{
            showStory: c.showStory,
            showVisionMission: c.showVisionMission,
            showFactory: c.showFactory,
            showCertificates: c.showCertificates,
            showTrain: c.showTrain,
            backgroundStyle: c.backgroundStyle,
            spacingPreset: c.spacingPreset,
          }}
          headingHighlightStyle={highlightStyle}
        />
      );
    }

    case "career": {
      const c = cfg as SectionConfigMap["career"];
      const paragraphs = (c.introParagraphs ?? []).filter((p) =>
        Boolean(p?.trim()),
      );
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-3xl px-4 text-center">
            {c.heading ? (
              <SectionAccentHeading title={c.heading} {...accentFromConfig()} />
            ) : null}
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="mt-4 text-sm leading-relaxed text-[var(--color-foreground)] md:text-base"
              >
                {p}
              </p>
            ))}
            {c.ctaText ? (
              <p className="mt-6 text-sm font-medium text-[var(--color-foreground)]">
                {c.ctaText}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              Full careers experience (roles + apply form) lives on{" "}
              <SafeLink href="/career" className="underline-offset-2 hover:underline">
                /career
              </SafeLink>
              .
            </p>
          </div>
        </SectionMotion>
      );
    }

    case "features": {
      const c = cfg as SectionConfigMap["features"];
      if (c.items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            {c.title ? (
              <div className="mx-auto max-w-3xl text-center">
                <SectionAccentHeading title={c.title} {...accentFromConfig()} />
                {c.description ? (
                  <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">
                    {c.description}
                  </p>
                ) : null}
              </div>
            ) : c.description ? (
              <p className="mx-auto max-w-2xl text-center text-sm text-[var(--color-muted)]">
                {c.description}
              </p>
            ) : null}
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.items.map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  className="rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
                >
                  {item.icon ? (
                    <p className={sfEyebrow()}>{item.icon}</p>
                  ) : null}
                  <h3 className="mt-2 font-semibold text-[var(--color-foreground)]">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </SectionMotion>
      );
    }

    case "statistics": {
      const c = cfg as SectionConfigMap["statistics"];
      const items = c.items.filter(
        (i) => i.value.trim() || i.label.trim(),
      );
      if (items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            {c.title ? (
              <div className="mb-6 text-center">
                <SectionAccentHeading title={c.title} {...accentFromConfig()} />
              </div>
            ) : null}
            <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item, index) => (
                <li key={`${item.label}-${index}`} className="text-center">
                  <p className="font-[family-name:var(--font-display)] text-3xl font-semibold">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{item.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </SectionMotion>
      );
    }

    case "testimonials": {
      const c = cfg as SectionConfigMap["testimonials"];
      if (c.items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-6xl px-4">
            {c.title ? (
              <div className="text-center">
                <SectionAccentHeading title={c.title} {...accentFromConfig()} />
              </div>
            ) : null}
            <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {c.items.map((item, index) => (
                <li
                  key={`${item.customerName}-${index}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
                >
                  <p className="text-sm leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                  <p className="mt-4 font-medium">{item.customerName}</p>
                  {item.companyOrTitle ? (
                    <p className="text-sm text-[var(--color-muted)]">
                      {item.companyOrTitle}
                    </p>
                  ) : null}
                  {item.rating ? (
                    <p className="mt-1 text-xs text-[var(--color-muted)]" aria-label={`Rating ${item.rating} of 5`}>
                      {"★".repeat(item.rating)}
                      {"☆".repeat(5 - item.rating)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </SectionMotion>
      );
    }

    case "faq": {
      const c = cfg as SectionConfigMap["faq"];
      const items = c.items
        .filter((i) => i.active && i.question.trim())
        .map((i) => ({ question: i.question, answer: i.answer }));
      if (items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            <div className="mx-auto max-w-3xl">
              {c.title ? (
                <div className="text-center">
                  <SectionAccentHeading title={c.title} {...accentFromConfig()} />
                </div>
              ) : null}
              <div className={c.title ? "mt-6" : undefined}>
                <FaqAccordion items={items} />
              </div>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "cta": {
      const c = cfg as SectionConfigMap["cta"];
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className={sfSectionInner()}>
            <div className="relative overflow-hidden rounded-[var(--radius-default,1rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-center md:px-10 md:py-14">
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 0%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 70%)",
                }}
              />
              <div className="relative">
                {c.heading ? (
                  <SectionAccentHeading
                    title={c.heading}
                    {...accentFromConfig()}
                  />
                ) : null}
                {c.description ? (
                  <p className="mx-auto mt-3 max-w-xl text-[var(--color-muted)]">
                    {c.description}
                  </p>
                ) : null}
                {c.buttonText && c.buttonLink ? (
                  <div className="mt-6">
                    <SafeLink href={c.buttonLink} className={buttonClass("primary")}>
                      {c.buttonText}
                    </SafeLink>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "newsletter": {
      const c = cfg as SectionConfigMap["newsletter"];
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-xl px-4 text-center">
            {c.heading ? (
              <SectionAccentHeading title={c.heading} {...accentFromConfig()} />
            ) : null}
            {c.description ? (
              <p className="mt-2 text-[var(--color-muted)]">{c.description}</p>
            ) : null}
            <NewsletterSignup
              buttonText={c.buttonText || "Subscribe"}
              successMessage={c.successMessage || "Thanks — you're on the list."}
            />
          </div>
        </SectionMotion>
      );
    }

    case "text": {
      const c = cfg as SectionConfigMap["text"];
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-3xl px-4">
            {c.heading ? (
              <div className="text-center">
                <SectionAccentHeading
                  title={c.heading}
                  {...accentFromConfig()}
                />
              </div>
            ) : null}
            {c.body ? (
              <p className="mt-3 whitespace-pre-wrap text-center text-[var(--color-muted)]">{c.body}</p>
            ) : null}
          </div>
        </SectionMotion>
      );
    }

    default:
      return null;
  }
}

export function HomepageSections({
  sections,
  animation,
  visualEffects = defaultPlatformConfig.visualEffects,
  currency = defaultPlatformConfig.store.currency,
  isAuthenticated = false,
  headingHighlightStyle,
}: {
  sections: StorefrontSection[];
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
  currency?: string;
  isAuthenticated?: boolean;
  headingHighlightStyle?: HeadingHighlightStyle;
}) {
  return (
    <div className="space-y-0">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          animation={animation}
          visualEffects={visualEffects}
          currency={currency}
          isAuthenticated={isAuthenticated}
          headingHighlightStyle={headingHighlightStyle}
        />
      ))}
    </div>
  );
}

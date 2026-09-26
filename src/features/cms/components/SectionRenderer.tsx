import type { CSSProperties, ReactNode } from "react";
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
  ImageFrameStyle,
} from "@/features/cms/schemas";
import {
  sectionCtaHref,
  sectionCtaVisible,
} from "@/features/cms/schemas";
import {
  resolveCmsImageUrl,
  sectionShellClassName,
  sectionShellStyle,
} from "@/features/cms/section-styles";
import { NewsletterSignup } from "@/features/cms/components/NewsletterSignup";
import { HeroCarousel } from "@/features/cms/components/HeroCarousel";
import { FaqAccordion } from "@/features/cms/components/FaqAccordion";
import { FeatureIcon } from "@/features/cms/components/FeatureIcon";
import { ReelsShowcase } from "@/features/reels/components/ReelsShowcase";
import type { StorefrontReel } from "@/features/reels/types";
import {
  AboutBlocks,
  aboutBlocksForFullPage,
} from "@/features/cms/components/AboutBlocks";
import { OtherInformationFromAbout } from "@/features/cms/components/OtherInformationFromAbout";
import { defaultPlatformConfig } from "@/config/defaults";
import {
  sfBtn,
  sfSectionInner,
} from "@/components/ui/storefront-classes";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { StarRating } from "@/features/reviews/components/StarRating";
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
  storeName?: string;
  isAuthenticated?: boolean;
  headingHighlightStyle?: HeadingHighlightStyle;
};

function SectionMotion({
  section,
  animation,
  children,
  className,
  style,
}: {
  section: StorefrontSection;
  animation: AnimationConfig;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
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
    return (
      <section className={className} style={style}>
        {children}
      </section>
    );
  }

  return (
    <Motion
      as="section"
      animation={animation}
      sectionOverride={override}
      className={className}
      style={style}
    >
      {children}
    </Motion>
  );
}

function mediaFrameClass(
  base: "sf-media-banner__frame" | "sf-text-image__frame",
  style: ImageFrameStyle | string | null | undefined,
): string {
  const frame: ImageFrameStyle =
    style === "plain" ||
    style === "border" ||
    style === "shadow" ||
    style === "elevated"
      ? style
      : "elevated";
  return `${base} ${base}--${frame}`;
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
  storeName,
  isAuthenticated = false,
  headingHighlightStyle: highlightStyleProp,
}: Props) {
  const cfg = section.config;
  const shell = sectionShellClassName(cfg as SectionConfigMap["hero"]);
  const shellStyle = sectionShellStyle(cfg as SectionConfigMap["hero"]);
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
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
      const rawPath =
        "imagePath" in c ? c.imagePath : (c as SectionConfigMap["image"]).imagePath;
      const url = resolveCmsImageUrl(
        typeof rawPath === "string" ? rawPath.trim() || null : null,
      );
      const banner = c as SectionConfigMap["banner"];
      const isBanner = section.sectionType === "banner";
      const showBannerButton = isBanner && sectionCtaVisible(banner);
      const hasBannerCopy = Boolean(
        banner.title?.trim() ||
          banner.description?.trim() ||
          showBannerButton,
      );
      // Old default was "elevated" (floating card). Treat that as plain so
      // banners align with newsletter / other section planes.
      const bannerFrame =
        !isBanner
          ? "elevated"
          : banner.imageFrameStyle === "border" ||
              banner.imageFrameStyle === "shadow"
            ? banner.imageFrameStyle
            : "plain";

      // Image section: require a real image. Banner: require image or copy.
      if (!url) {
        if (!isBanner) return null;
        if (!hasBannerCopy) return null;
      }

      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail">
              <div
                className={
                  isBanner
                    ? "sf-media-banner"
                    : "sf-media-banner sf-media-banner--image"
                }
              >
                <div
                  className={mediaFrameClass(
                    "sf-media-banner__frame",
                    bannerFrame,
                  )}
                >
                  {url ? (
                    <Image
                      src={url}
                      alt={"altText" in c ? c.altText || "" : ""}
                      fill
                      className="object-cover"
                      sizes="100vw"
                      unoptimized
                    />
                  ) : (
                    <div className="sf-media-banner__fallback" aria-hidden />
                  )}
                  {isBanner && hasBannerCopy ? (
                    <div
                      className={[
                        "sf-media-banner__overlay",
                        banner.overlayStyle === "strong"
                          ? "sf-media-banner__overlay--strong"
                          : banner.overlayStyle === "soft"
                            ? "sf-media-banner__overlay--soft"
                            : "sf-media-banner__overlay--none",
                        banner.alignment === "center"
                          ? "sf-media-banner__overlay--center"
                          : banner.alignment === "right"
                            ? "sf-media-banner__overlay--right"
                            : "sf-media-banner__overlay--left",
                      ].join(" ")}
                    >
                      {banner.title ? (
                        <h2 className="sf-media-banner__title">{banner.title}</h2>
                      ) : null}
                      {banner.description ? (
                        <p className="sf-media-banner__lede">
                          {banner.description}
                        </p>
                      ) : null}
                      {showBannerButton ? (
                        <SafeLink
                          href={sectionCtaHref(banner, "/products")}
                          className={buttonClass("primary")}
                        >
                          {banner.buttonText}
                        </SafeLink>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "text_image": {
      const c = cfg as SectionConfigMap["text_image"];
      const heading = (c.heading ?? "").trim();
      const description = (c.description ?? "").trim();
      const url = resolveCmsImageUrl(
        typeof c.imagePath === "string" ? c.imagePath.trim() || null : null,
      );
      const imageLeft = c.imagePosition === "left";
      const hasButton = sectionCtaVisible(c);
      if (!heading && !description && !url && !hasButton) return null;

      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail">
            <div
              className={[
                "sf-text-image",
                url ? "sf-text-image__grid" : "sf-text-image__solo",
                url && imageLeft ? "sf-text-image__grid--image-left" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="sf-text-image__copy">
                {heading ? (
                  <SectionAccentHeading
                    title={heading}
                    {...accentFromConfig()}
                  />
                ) : null}
                {description ? (
                  <p className="sf-text-image__body">{description}</p>
                ) : null}
                {hasButton ? (
                  <SafeLink
                    href={sectionCtaHref(c, "/products")}
                    className={buttonClass("primary")}
                  >
                    {c.buttonText}
                  </SafeLink>
                ) : null}
              </div>
              {url ? (
                <div className="sf-text-image__media">
                  <div
                    className={mediaFrameClass(
                      "sf-text-image__frame",
                      c.imageFrameStyle,
                    )}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 60vw"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "about": {
      const c = cfg as SectionConfigMap["about"];
      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail sf-features">
              {c.title || c.description ? (
                <div className="sf-features__intro">
                  {c.title ? (
                    <SectionAccentHeading
                      title={c.title}
                      {...accentFromConfig()}
                    />
                  ) : null}
                  {c.description ? (
                    <p className="sf-features__lede">{c.description}</p>
                  ) : null}
                </div>
              ) : null}
              <ul
                className={
                  c.items.length === 4
                    ? "sf-features__grid sf-features__grid--quad"
                    : "sf-features__grid"
                }
              >
                {c.items.map((item, index) => (
                  <li
                    key={`${item.title}-${index}`}
                    className="sf-features__card"
                  >
                    {item.icon ? (
                      <span className="sf-features__icon">
                        <FeatureIcon id={item.icon} />
                      </span>
                    ) : null}
                    <h3 className="sf-features__title">{item.title}</h3>
                    {item.description ? (
                      <p className="sf-features__body">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail sf-stats">
            {c.title ? (
              <div className="sf-stats__intro">
                <SectionAccentHeading title={c.title} {...accentFromConfig()} />
              </div>
            ) : null}
            <ul className="sf-stats__grid">
              {items.map((item, index) => (
                <li key={`${item.label}-${index}`} className="sf-stats__item">
                  <p className="sf-stats__value">{item.value}</p>
                  <p className="sf-stats__label">{item.label}</p>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "testimonials": {
      const c = cfg as SectionConfigMap["testimonials"];
      if (c.items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail sf-quotes">
              {c.title ? (
                <div className="sf-quotes__intro">
                  <SectionAccentHeading title={c.title} {...accentFromConfig()} />
                </div>
              ) : null}
              <ul className="sf-quotes__grid">
                {c.items.map((item, index) => (
                  <li
                    key={`${item.customerName}-${index}`}
                    className="sf-quotes__card"
                  >
                    <p className="sf-quotes__text">{item.quote}</p>
                    <div className="sf-quotes__meta">
                      <div className="sf-quotes__who">
                        <p className="sf-quotes__name">
                          {item.customerName.trim() || "Customer"}
                        </p>
                        {item.companyOrTitle ? (
                          <p className="sf-quotes__role">
                            {item.companyOrTitle}
                          </p>
                        ) : null}
                      </div>
                      {item.rating ? (
                        <StarRating
                          value={item.rating}
                          size="sm"
                          aria-label={`Rating ${item.rating} of 5`}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail mx-auto w-full">
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
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail">
            <div className="sf-cta-band">
              <div className="sf-cta-band__glow" aria-hidden />
              <div className="sf-cta-band__frame" aria-hidden />
              <div className="sf-cta-band__inner">
                {c.heading ? (
                  <SectionAccentHeading
                    title={c.heading}
                    {...accentFromConfig()}
                  />
                ) : null}
                {c.description ? (
                  <p className="sf-cta-band__lede">{c.description}</p>
                ) : null}
                {c.buttonText && c.buttonLink ? (
                  <div className="sf-cta-band__action">
                    <SafeLink
                      href={c.buttonLink}
                      className={buttonClass("primary")}
                    >
                      {c.buttonText}
                    </SafeLink>
                  </div>
                ) : null}
              </div>
            </div>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "newsletter": {
      const c = cfg as SectionConfigMap["newsletter"];
      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-home-rail">
              <div className="sf-newsletter-band">
                <div className="sf-newsletter-band__inner">
                  {c.heading ? (
                    <SectionAccentHeading
                      title={c.heading}
                      {...accentFromConfig()}
                    />
                  ) : null}
                  {c.description ? (
                    <p className="sf-newsletter-band__lede">{c.description}</p>
                  ) : null}
                  <NewsletterSignup
                    buttonText={c.buttonText || "Subscribe"}
                    successMessage={
                      c.successMessage || "Thanks — you're on the list."
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "text": {
      const c = cfg as SectionConfigMap["text"];
      const heading = (c.heading ?? "").trim();
      const body = (c.body ?? "").trim();
      if (!heading && !body) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <div className="sf-rich-text">
              {heading ? (
                <div className="sf-rich-text__intro">
                  <SectionAccentHeading
                    title={heading}
                    {...accentFromConfig()}
                  />
                </div>
              ) : null}
              {body ? <p className="sf-rich-text__body">{body}</p> : null}
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "reels": {
      const c = cfg as SectionConfigMap["reels"];
      const reels = (section.resolved?.reels ?? []) as StorefrontReel[];
      if (!reels.length) return null;
      const autoplayMuted =
        typeof section.resolved?.autoplayMuted === "boolean"
          ? section.resolved.autoplayMuted
          : c.autoplayMuted;
      const visibleSlides =
        typeof section.resolved?.visibleSlides === "number"
          ? section.resolved.visibleSlides
          : 3;
      return (
        <SectionMotion section={section} animation={animation} className={shell} style={shellStyle}>
          <div className={sfSectionInner()}>
            <ReelsShowcase
              reels={reels}
              currency={currency}
              storeName={storeName}
              heading={c.title || undefined}
              visibleSlides={visibleSlides}
              autoplayMuted={autoplayMuted}
              headingHighlightStyle={highlightStyle}
            />
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
  storeName,
  isAuthenticated = false,
  headingHighlightStyle,
}: {
  sections: StorefrontSection[];
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
  currency?: string;
  storeName?: string;
  isAuthenticated?: boolean;
  headingHighlightStyle?: HeadingHighlightStyle;
}) {
  return (
    <div className="sf-home-stack">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          animation={animation}
          visualEffects={visualEffects}
          currency={currency}
          storeName={storeName}
          isAuthenticated={isAuthenticated}
          headingHighlightStyle={headingHighlightStyle}
        />
      ))}
    </div>
  );
}

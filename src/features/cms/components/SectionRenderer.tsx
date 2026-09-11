import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Motion } from "@/features/animation";
import type { AnimationConfig, VisualEffectsConfig } from "@/types";
import type { StorefrontSection } from "@/features/cms/storefront";
import type {
  HeroLayoutPreset,
  SectionConfigMap,
  SupportedSectionType,
} from "@/features/cms/schemas";
import {
  resolveCmsImageUrl,
  sectionShellClassName,
} from "@/features/cms/section-styles";
import { NewsletterSignup } from "@/features/cms/components/NewsletterSignup";
import { Hero3DSlot } from "@/components/three/Hero3DSlot";
import { defaultPlatformConfig } from "@/config/defaults";
import {
  sfBtn,
  sfDisplay,
  sfEyebrow,
  sfSectionInner,
} from "@/components/ui/storefront-classes";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";

type Props = {
  section: StorefrontSection;
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
  currency?: string;
  isAuthenticated?: boolean;
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
  const enabled = common.animationEnabled !== false;
  const preset = common.animationPreset ?? "fade-up";

  if (!enabled || preset === "none") {
    return <section className={className}>{children}</section>;
  }

  return (
    <Motion
      as="section"
      animation={animation}
      preset={preset}
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

function themeHeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 8% 12%, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 55%), radial-gradient(ellipse 55% 50% at 92% 88%, color-mix(in srgb, var(--color-accent) 22%, transparent), transparent 50%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 70%, transparent), transparent)",
      }}
    />
  );
}

function HeroCopy({
  c,
  alignClass,
  justifyClass,
  centered,
}: {
  c: SectionConfigMap["hero"];
  alignClass: string;
  justifyClass: string;
  centered?: boolean;
}) {
  return (
    <div
      className={`relative z-10 flex flex-col gap-4 ${alignClass} ${centered ? "mx-auto max-w-3xl" : "max-w-xl"}`}
    >
      {c.subtitle ? <p className={sfEyebrow()}>{c.subtitle}</p> : null}
      {c.title ? (
        <h1
          className={`${sfDisplay()} text-4xl leading-[1.08] md:text-5xl lg:text-[3.25rem]`}
        >
          {c.title}
        </h1>
      ) : null}
      {c.description ? (
        <p className="max-w-xl text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
          {c.description}
        </p>
      ) : null}
      <div className={`mt-2 flex flex-wrap gap-3 ${justifyClass}`}>
        {c.primaryButtonText && c.primaryButtonLink ? (
          <SafeLink href={c.primaryButtonLink} className={buttonClass("primary")}>
            {c.primaryButtonText}
          </SafeLink>
        ) : null}
        {c.secondaryButtonText && c.secondaryButtonLink ? (
          <SafeLink
            href={c.secondaryButtonLink}
            className={buttonClass("secondary")}
          >
            {c.secondaryButtonText}
          </SafeLink>
        ) : null}
      </div>
    </div>
  );
}

function HeroVisual({
  fg,
  hero3dOn,
  c,
  visualEffects,
  animation,
}: {
  fg: string | null;
  hero3dOn: boolean;
  c: SectionConfigMap["hero"];
  visualEffects: VisualEffectsConfig;
  animation: AnimationConfig;
}) {
  return (
    <div className="relative z-10 mx-auto min-h-[12rem] w-full max-w-md overflow-hidden rounded-[var(--radius-default,1rem)] md:mx-0 md:min-h-[16rem]">
      {hero3dOn ? (
        <Hero3DSlot
          className="absolute inset-0"
          preset={c.scene3dPreset || visualEffects.heroPreset}
          quality={visualEffects.quality}
          enabled={hero3dOn}
          mobileEnabled={visualEffects.mobileEnabled}
          respectReducedMotion={visualEffects.respectReducedMotion}
          animationStoreEnabled={animation.enabled}
          rotationSpeed={c.scene3dRotationSpeed}
          cameraDistance={c.scene3dCameraDistance}
          fallback={
            fg ? null : (
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 60%)",
                }}
              />
            )
          }
        />
      ) : null}
      {fg ? (
        <div className="relative aspect-[4/3] w-full md:min-h-[16rem]">
          <Image
            src={fg}
            alt=""
            fill
            className="object-contain p-3 md:p-4"
            sizes="(max-width: 768px) 100vw, 360px"
            priority
          />
        </div>
      ) : !hero3dOn ? (
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-primary) 32%, transparent), transparent 58%), radial-gradient(circle at 75% 70%, color-mix(in srgb, var(--color-accent) 24%, transparent), transparent 50%)",
          }}
        />
      ) : null}
    </div>
  );
}

export function SectionRenderer({
  section,
  animation,
  visualEffects = defaultPlatformConfig.visualEffects,
  currency = defaultPlatformConfig.store.currency,
  isAuthenticated = false,
}: Props) {
  const cfg = section.config;
  const shell = sectionShellClassName(cfg as SectionConfigMap["hero"]);

  switch (section.sectionType) {
    case "hero": {
      const c = cfg as SectionConfigMap["hero"];
      const bg = resolveCmsImageUrl(c.backgroundImagePath);
      const fg = resolveCmsImageUrl(c.foregroundImagePath);
      const preset = (c.layoutPreset ?? "SPLIT") as HeroLayoutPreset;
      const alignClass =
        c.alignment === "center"
          ? "text-center items-center"
          : c.alignment === "right"
            ? "text-right items-end"
            : "text-left items-start";
      const justifyClass =
        c.alignment === "center"
          ? "justify-center"
          : c.alignment === "right"
            ? "justify-end"
            : "justify-start";
      const hero3dOn =
        Boolean(c.enable3d) &&
        visualEffects.enabled &&
        visualEffects.heroEnabled;

      const isFullBleed = preset === "FULL_BLEED" || preset === "CENTERED";
      const imageLeft = preset === "IMAGE_LEFT";
      const splitLike =
        preset === "SPLIT" ||
        preset === "IMAGE_RIGHT" ||
        preset === "IMAGE_LEFT";

      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div
            className={
              isFullBleed
                ? "relative overflow-hidden"
                : `${sfSectionInner()} relative`
            }
          >
            <div
              className={`relative overflow-hidden ${
                isFullBleed
                  ? "min-h-[22rem] md:min-h-[26rem]"
                  : "rounded-[var(--radius-default,1rem)] border border-[var(--color-border)] bg-[var(--color-card)]"
              }`}
            >
              {bg ? (
                <Image
                  src={bg}
                  alt=""
                  fill
                  className={`object-cover ${isFullBleed ? "opacity-50" : "opacity-35"}`}
                  sizes="100vw"
                  priority
                />
              ) : (
                themeHeroBackdrop()
              )}

              {isFullBleed && hero3dOn ? (
                <Hero3DSlot
                  className="pointer-events-none absolute inset-0 opacity-70"
                  preset={c.scene3dPreset || visualEffects.heroPreset}
                  quality={visualEffects.quality}
                  enabled={hero3dOn}
                  mobileEnabled={visualEffects.mobileEnabled}
                  respectReducedMotion={visualEffects.respectReducedMotion}
                  animationStoreEnabled={animation.enabled}
                  rotationSpeed={c.scene3dRotationSpeed}
                  cameraDistance={c.scene3dCameraDistance}
                  fallback={null}
                />
              ) : null}

              {isFullBleed ? (
                <div
                  className={`${sfSectionInner()} relative flex min-h-[20rem] flex-col justify-center py-12 md:min-h-[24rem] md:py-16`}
                >
                  <HeroCopy
                    c={c}
                    alignClass={alignClass}
                    justifyClass={justifyClass}
                    centered={preset === "CENTERED" || c.alignment === "center"}
                  />
                  {fg && preset === "FULL_BLEED" ? (
                    <div className="relative mt-8 h-40 w-full max-w-md md:h-52">
                      <Image
                        src={fg}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="400px"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className={`relative grid items-center gap-8 px-5 py-10 md:gap-10 md:px-10 md:py-14 ${
                    splitLike ? "md:grid-cols-2" : ""
                  }`}
                >
                  <div className={imageLeft ? "md:order-2" : undefined}>
                    <HeroCopy
                      c={c}
                      alignClass={alignClass}
                      justifyClass={justifyClass}
                    />
                  </div>
                  <div className={imageLeft ? "md:order-1" : undefined}>
                    <HeroVisual
                      fg={fg}
                      hero3dOn={hero3dOn}
                      c={c}
                      visualEffects={visualEffects}
                      animation={animation}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
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
                accentWord={
                  /\bcollections?\b/i.test(heading)
                    ? "Collections"
                    : /\brange\b/i.test(heading)
                      ? "range"
                      : undefined
                }
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
                <SectionAccentHeading title={c.title} />
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

    case "text_image":
    case "about": {
      const c = cfg as SectionConfigMap["text_image"] | SectionConfigMap["about"];
      const heading = "heading" in c ? c.heading : "";
      const description = c.description ?? "";
      const imagePath = c.imagePath;
      const url = resolveCmsImageUrl(imagePath);
      const imageLeft =
        section.sectionType === "text_image" &&
        (c as SectionConfigMap["text_image"]).imagePosition === "left";
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div
            className={`mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2 ${
              imageLeft ? "" : ""
            }`}
          >
            <div className={imageLeft ? "md:order-2" : ""}>
              {heading ? <SectionAccentHeading title={heading} /> : null}
              {description ? (
                <p className="mt-3 whitespace-pre-wrap text-[var(--color-muted)]">
                  {description}
                </p>
              ) : null}
              {"buttonText" in c && c.buttonText && c.buttonLink ? (
                <div className="mt-5">
                  <SafeLink href={c.buttonLink} className={buttonClass("primary")}>
                    {c.buttonText}
                  </SafeLink>
                </div>
              ) : null}
            </div>
            {url ? (
              <div className={`relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] ${imageLeft ? "md:order-1" : ""}`}>
                <Image src={url} alt="" fill className="object-cover" sizes="480px" />
              </div>
            ) : null}
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
                <SectionAccentHeading title={c.title} />
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
      if (c.items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-6xl px-4">
            {c.title ? (
              <div className="mb-6 text-center">
                <SectionAccentHeading title={c.title} />
              </div>
            ) : null}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.items.map((item, index) => (
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
                <SectionAccentHeading title={c.title} />
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
      const items = c.items.filter((i) => i.active);
      if (items.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-3xl px-4">
            {c.title ? (
              <div className="text-center">
                <SectionAccentHeading title={c.title} />
              </div>
            ) : null}
            <dl className="mt-6 space-y-4">
              {items.map((item, index) => (
                <div
                  key={`${item.question}-${index}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                >
                  <dt className="font-medium">{item.question}</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
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
                  <SectionAccentHeading title={c.heading} />
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
            {c.heading ? <SectionAccentHeading title={c.heading} /> : null}
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
                <SectionAccentHeading title={c.heading} />
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
}: {
  sections: StorefrontSection[];
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
  currency?: string;
  isAuthenticated?: boolean;
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
        />
      ))}
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Motion } from "@/features/animation";
import type { AnimationConfig, VisualEffectsConfig } from "@/types";
import type { StorefrontSection } from "@/features/cms/storefront";
import type { SectionConfigMap, SupportedSectionType } from "@/features/cms/schemas";
import {
  resolveCmsImageUrl,
  sectionShellClassName,
} from "@/features/cms/section-styles";
import { formatMoney } from "@/features/catalog/money";
import { NewsletterSignup } from "@/features/cms/components/NewsletterSignup";
import { Hero3DSlot } from "@/components/three/Hero3DSlot";
import { defaultPlatformConfig } from "@/config/defaults";

type Props = {
  section: StorefrontSection;
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
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
  if (variant === "secondary") {
    return "inline-flex min-h-11 items-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium";
  }
  return "inline-flex min-h-11 items-center rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)]";
}

export function SectionRenderer({
  section,
  animation,
  visualEffects = defaultPlatformConfig.visualEffects,
}: Props) {
  const cfg = section.config;
  const shell = sectionShellClassName(cfg as SectionConfigMap["hero"]);

  switch (section.sectionType) {
    case "hero": {
      const c = cfg as SectionConfigMap["hero"];
      const bg = resolveCmsImageUrl(c.backgroundImagePath);
      const fg = resolveCmsImageUrl(c.foregroundImagePath);
      const align =
        c.alignment === "center"
          ? "text-center items-center"
          : c.alignment === "right"
            ? "text-right items-end"
            : "text-left items-start";
      const hero3dOn =
        Boolean(c.enable3d) &&
        visualEffects.enabled &&
        visualEffects.heroEnabled;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]">
            {hero3dOn ? (
              <Hero3DSlot
                className="pointer-events-none absolute inset-0 opacity-80"
                preset={c.scene3dPreset || visualEffects.heroPreset}
                quality={visualEffects.quality}
                enabled={hero3dOn}
                mobileEnabled={visualEffects.mobileEnabled}
                respectReducedMotion={visualEffects.respectReducedMotion}
                animationStoreEnabled={animation.enabled}
                rotationSpeed={c.scene3dRotationSpeed}
                cameraDistance={c.scene3dCameraDistance}
                fallback={
                  bg ? null : (
                    <div
                      className="pointer-events-none absolute inset-0 opacity-90"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(ellipse 70% 55% at 0% 0%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 55%)",
                      }}
                    />
                  )
                }
              />
            ) : null}
            {bg ? (
              <Image
                src={bg}
                alt=""
                fill
                className="object-cover opacity-40"
                sizes="100vw"
                priority
              />
            ) : !hero3dOn ? (
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(ellipse 70% 55% at 0% 0%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 55%)",
                }}
              />
            ) : null}
            <div className={`relative flex flex-col gap-4 px-4 py-12 md:px-8 md:py-16 ${align}`}>
              {c.subtitle ? (
                <p className="text-sm font-medium text-[var(--color-muted)]">
                  {c.subtitle}
                </p>
              ) : null}
              {c.title ? (
                <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-5xl">
                  {c.title}
                </h1>
              ) : null}
              {c.description ? (
                <p className="max-w-2xl text-lg text-[var(--color-muted)]">
                  {c.description}
                </p>
              ) : null}
              <div className={`mt-2 flex flex-wrap gap-3 ${c.alignment === "center" ? "justify-center" : c.alignment === "right" ? "justify-end" : ""}`}>
                {c.primaryButtonText && c.primaryButtonLink ? (
                  <SafeLink href={c.primaryButtonLink} className={buttonClass("primary")}>
                    {c.primaryButtonText}
                  </SafeLink>
                ) : null}
                {c.secondaryButtonText && c.secondaryButtonLink ? (
                  <SafeLink href={c.secondaryButtonLink} className={buttonClass("secondary")}>
                    {c.secondaryButtonText}
                  </SafeLink>
                ) : null}
              </div>
              {fg ? (
                <div className="relative mt-6 h-48 w-full max-w-md md:h-64">
                  <Image src={fg} alt="" fill className="object-contain" sizes="400px" />
                </div>
              ) : null}
            </div>
          </div>
        </SectionMotion>
      );
    }

    case "categories": {
      const c = cfg as SectionConfigMap["categories"];
      const cats = section.resolved?.categories ?? [];
      if (cats.length === 0) return null;
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-6xl px-4">
            {c.title ? <h2 className="text-2xl font-semibold">{c.title}</h2> : null}
            {c.description ? (
              <p className="mt-2 text-[var(--color-muted)]">{c.description}</p>
            ) : null}
            <ul
              className={`mt-6 grid gap-4 ${
                c.columns === 2
                  ? "sm:grid-cols-2"
                  : c.columns === 4
                    ? "sm:grid-cols-2 lg:grid-cols-4"
                    : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {cats.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/products?category=${encodeURIComponent(cat.slug)}`}
                    className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:border-[var(--color-primary)]"
                  >
                    <p className="font-medium">{cat.name}</p>
                    {cat.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                        {cat.description}
                      </p>
                    ) : null}
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
          <div className="mx-auto max-w-6xl px-4">
            {c.title ? <h2 className="text-2xl font-semibold">{c.title}</h2> : null}
            {c.description ? (
              <p className="mt-2 text-[var(--color-muted)]">{c.description}</p>
            ) : null}
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.slug}`}
                    className="block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    <div className="relative aspect-square bg-[var(--color-surface)]">
                      {product.primaryImageUrl ? (
                        <Image
                          src={product.primaryImageUrl}
                          alt={product.primaryImageAlt || product.name}
                          fill
                          className="object-cover"
                          sizes="240px"
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="font-medium">{product.name}</p>
                      {product.minPrice != null ? (
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {formatMoney(product.minPrice)}
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
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl px-4">
            <div className="relative min-h-[200px] overflow-hidden rounded-2xl border border-[var(--color-border)]">
              {url ? (
                <Image src={url} alt={"altText" in c ? c.altText || "" : ""} fill className="object-cover" sizes="100vw" />
              ) : null}
              {section.sectionType === "banner" ? (
                <div
                  className={`relative z-10 flex flex-col gap-3 p-8 md:p-12 ${
                    banner.overlayStyle === "strong"
                      ? "bg-black/50 text-white"
                      : banner.overlayStyle === "soft"
                        ? "bg-black/25 text-white"
                        : ""
                  } ${
                    banner.alignment === "center"
                      ? "items-center text-center"
                      : banner.alignment === "right"
                        ? "items-end text-right"
                        : "items-start"
                  }`}
                >
                  {banner.title ? <h2 className="text-2xl font-semibold">{banner.title}</h2> : null}
                  {banner.description ? <p className="max-w-xl opacity-90">{banner.description}</p> : null}
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
              {heading ? <h2 className="text-2xl font-semibold">{heading}</h2> : null}
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
          <div className="mx-auto max-w-6xl px-4">
            {c.title ? <h2 className="text-2xl font-semibold">{c.title}</h2> : null}
            {c.description ? (
              <p className="mt-2 text-[var(--color-muted)]">{c.description}</p>
            ) : null}
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.items.map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
                >
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                    {item.icon}
                  </p>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
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
            {c.title ? <h2 className="mb-6 text-2xl font-semibold">{c.title}</h2> : null}
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
            {c.title ? <h2 className="text-2xl font-semibold">{c.title}</h2> : null}
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
            {c.title ? <h2 className="text-2xl font-semibold">{c.title}</h2> : null}
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
          <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-10 text-center">
            {c.heading ? <h2 className="text-2xl font-semibold">{c.heading}</h2> : null}
            {c.description ? (
              <p className="mt-3 text-[var(--color-muted)]">{c.description}</p>
            ) : null}
            {c.buttonText && c.buttonLink ? (
              <div className="mt-6">
                <SafeLink href={c.buttonLink} className={buttonClass("primary")}>
                  {c.buttonText}
                </SafeLink>
              </div>
            ) : null}
          </div>
        </SectionMotion>
      );
    }

    case "newsletter": {
      const c = cfg as SectionConfigMap["newsletter"];
      return (
        <SectionMotion section={section} animation={animation} className={shell}>
          <div className="mx-auto max-w-xl px-4 text-center">
            {c.heading ? <h2 className="text-2xl font-semibold">{c.heading}</h2> : null}
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
            {c.heading ? <h2 className="text-2xl font-semibold">{c.heading}</h2> : null}
            {c.body ? (
              <p className="mt-3 whitespace-pre-wrap text-[var(--color-muted)]">{c.body}</p>
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
}: {
  sections: StorefrontSection[];
  animation: AnimationConfig;
  visualEffects?: VisualEffectsConfig;
}) {
  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          animation={animation}
          visualEffects={visualEffects}
        />
      ))}
    </div>
  );
}

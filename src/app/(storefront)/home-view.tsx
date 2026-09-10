import Image from "next/image";
import Link from "next/link";
import { Motion } from "@/features/animation";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import type {
  StorefrontCategory,
  StorefrontProductCard,
} from "@/features/catalog/storefront";
import {
  sfBtn,
  sfDisplay,
  sfEyebrow,
  sfSectionInner,
} from "@/components/ui/storefront-classes";
import type { PlatformConfig } from "@/types";

interface HomeViewProps {
  config: PlatformConfig;
  products?: StorefrontProductCard[];
  categories?: StorefrontCategory[];
  currency?: string;
}

function meaningfulText(value: string | undefined | null) {
  const t = value?.trim();
  if (!t) return null;
  if (t.toLowerCase() === "your store, your brand.") return null;
  return t;
}

/**
 * Fallback homepage when no published CMS sections exist.
 * Product-first hero when catalog images exist; all copy from brand/CMS only.
 */
export function HomeView({
  config,
  products = [],
  categories = [],
  currency,
}: HomeViewProps) {
  const storeCurrency = currency ?? config.store.currency;
  const featured = products.slice(0, 8);
  const collection = categories.slice(0, 6);
  const tagline = meaningfulText(config.brand.tagline);

  const productHeroImages = featured
    .filter((p) => Boolean(p.primaryImageUrl))
    .slice(0, 3);
  const heroBackdrop =
    config.brand.socialImageUrl ||
    productHeroImages[0]?.primaryImageUrl ||
    null;

  return (
    <div className="pb-4">
      {/* Full-bleed product / brand hero */}
      <section className="relative isolate min-h-[min(78vh,42rem)] overflow-hidden border-b border-[var(--color-border)]">
        {heroBackdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroBackdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 sf-hero" aria-hidden />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--color-foreground)_72%,transparent)] via-[color-mix(in_srgb,var(--color-foreground)_45%,transparent)] to-transparent"
          aria-hidden
        />
        <div
          className={`${sfSectionInner()} relative z-[1] grid min-h-[min(78vh,42rem)] items-center gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:py-20`}
        >
          <Motion
            as="div"
            animation={config.animation}
            preset="fade-up"
            className="max-w-xl space-y-5 text-white"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,white_80%,var(--color-accent))]">
              {config.brand.name}
            </p>
            <h1
              className={`${sfDisplay()} text-4xl leading-[1.05] text-white sm:text-5xl lg:text-[3.5rem]`}
            >
              {tagline || config.brand.name}
            </h1>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default,0.5rem)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-button-foreground)] shadow-[0_10px_28px_color-mix(in_srgb,var(--color-primary)_40%,transparent)]"
              >
                Shop now
              </Link>
              {collection[0] ? (
                <Link
                  href={`/categories/${collection[0].slug}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default,0.5rem)] border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Shop {collection[0].name}
                </Link>
              ) : (
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default,0.5rem)] border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Browse catalog
                </Link>
              )}
            </div>
          </Motion>

          {productHeroImages.length > 0 ? (
            <Motion
              as="div"
              animation={config.animation}
              preset="fade-up"
              className="relative hidden md:block"
            >
              <ul className="flex items-end justify-center gap-3 lg:gap-4">
                {productHeroImages.map((product, index) => (
                  <li
                    key={product.id}
                    className={
                      index === 1
                        ? "relative z-[1] w-[42%] -translate-y-4"
                        : "w-[30%] opacity-95"
                    }
                  >
                    <Link
                      href={`/products/${product.slug}`}
                      className="block overflow-hidden rounded-[var(--radius-default,1rem)] border border-white/25 bg-[color-mix(in_srgb,white_12%,transparent)] shadow-[0_24px_50px_rgba(0,0,0,0.35)] backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <div className="relative aspect-[3/4] w-full bg-[color-mix(in_srgb,white_8%,transparent)]">
                        <Image
                          src={product.primaryImageUrl!}
                          alt={product.primaryImageAlt || product.name}
                          fill
                          priority={index === 0}
                          loading={index === 0 ? "eager" : "lazy"}
                          className="object-contain p-3"
                          sizes="220px"
                        />
                      </div>
                      <p className="truncate px-3 py-2.5 text-center text-xs font-semibold text-white">
                        {product.name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Motion>
          ) : null}
        </div>
      </section>

      {collection.length > 0 ? (
        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)] py-12 md:py-16">
          <div className={sfSectionInner()}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={sfEyebrow()}>Shop</p>
                <h2 className={`${sfDisplay()} mt-2 text-2xl md:text-3xl`}>
                  Shop by category
                </h2>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                View all products
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              {collection.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-default,14px)] border border-[var(--color-border)] bg-[var(--color-card)] transition-colors hover:border-[var(--color-primary)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))]">
                      {category.imageUrl ? (
                        <Image
                          src={category.imageUrl}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                          sizes="160px"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-primary)]">
                          {category.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <p className="px-3 py-3 text-center text-sm font-semibold text-[var(--color-foreground)]">
                      {category.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="py-12 md:py-16">
        <div className={sfSectionInner()}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={sfEyebrow()}>Catalog</p>
              <h2 className={`${sfDisplay()} mt-2 text-2xl md:text-3xl`}>
                Featured products
              </h2>
            </div>
            <Link href="/products" className={sfBtn("outline")}>
              Shop all
            </Link>
          </div>

          {featured.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-4">
              {featured.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard product={product} currency={storeCurrency} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[var(--radius-default,14px)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
              <p className={`${sfDisplay()} text-xl`}>Products coming soon</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted)]">
                Publish products with images in the admin catalog to feature them
                here.
              </p>
              <Link href="/products" className={`${sfBtn("primary")} mt-6`}>
                Browse catalog
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

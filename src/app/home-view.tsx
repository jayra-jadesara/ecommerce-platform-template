"use client";

import { LinkButton } from "@/components/common/LinkButton";
import { Motion } from "@/features/animation";
import type { PlatformConfig } from "@/types";

interface HomeViewProps {
  config: PlatformConfig;
}

export function HomeView({ config }: HomeViewProps) {
  return (
    <>
      <Motion
        as="section"
        animation={config.animation}
        preset="fade-up"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 100%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 50%)",
          }}
        />

        <div className="relative px-6 py-16 md:px-12 md:py-24">
          <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-5xl">
            {config.brand.name}
          </p>
          {config.brand.tagline ? (
            <p className="mt-4 max-w-xl text-lg text-[var(--color-muted)]">
              {config.brand.tagline}
            </p>
          ) : null}
          <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)]">
            White-label storefront foundation — theme, layout, and content are
            configuration-driven for each client deployment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/products" variant="contained" color="primary">
              Browse products
            </LinkButton>
            <LinkButton href="/about" variant="outlined" color="primary">
              Learn more
            </LinkButton>
          </div>
        </div>
      </Motion>

      <Motion
        as="section"
        animation={config.animation}
        preset="fade-up"
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {[
          {
            title: "Semantic theme",
            body: "Colors flow through CSS tokens and MUI — swap brands without rewriting components.",
          },
          {
            title: "Safe motion",
            body: "Framer Motion presets are allow-listed so admins can tune intensity without arbitrary code.",
          },
          {
            title: "Ready for data",
            body: "Feature folders and services are structured for Supabase, auth, cart, and checkout next.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-foreground)]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {item.body}
            </p>
          </article>
        ))}
      </Motion>
    </>
  );
}

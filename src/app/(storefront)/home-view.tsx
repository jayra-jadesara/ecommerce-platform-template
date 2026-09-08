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
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 0% 0%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 55%), radial-gradient(ellipse 55% 45% at 100% 100%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 50%)",
          }}
        />

        <div className="relative px-4 py-12 md:px-6 md:py-16 lg:px-8">
          <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-5xl lg:text-6xl">
            {config.brand.name}
          </p>
          {config.brand.tagline ? (
            <p className="mt-4 max-w-2xl text-lg text-[var(--color-muted)] md:text-xl">
              {config.brand.tagline}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/products" variant="contained" color="primary">
              Shop now
            </LinkButton>
            <LinkButton href="/about" variant="outlined" color="primary">
              About us
            </LinkButton>
          </div>
        </div>
      </Motion>

      <Motion
        as="section"
        animation={config.animation}
        preset="fade-up"
        className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6"
      >
        {[
          {
            title: "Quality products",
            body: "Browse a curated catalog built for everyday shopping.",
          },
          {
            title: "Secure checkout",
            body: "Cart and payments are ready when you are.",
          },
          {
            title: "Your brand",
            body: "Colors, logo, and content are fully customizable.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6"
          >
            <h2 className="text-base font-semibold text-[var(--color-foreground)] md:text-lg">
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

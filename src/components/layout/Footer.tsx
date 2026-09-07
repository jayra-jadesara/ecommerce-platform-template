import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type { BrandConfig, NavigationConfig } from "@/types";

interface FooterProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
}

export function Footer({ brand, navigation }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <Container className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-foreground)]">
            {brand.name}
          </p>
          {brand.tagline ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {brand.tagline}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            © {year} {brand.name}. All rights reserved.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-4">
            {navigation.footer.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}

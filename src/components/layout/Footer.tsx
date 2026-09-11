import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { sfEyebrow } from "@/components/ui/storefront-classes";
import type {
  BrandConfig,
  ContactConfig,
  FooterChromeConfig,
  NavigationConfig,
  SocialLinksConfig,
} from "@/types";

interface FooterProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
  footer: FooterChromeConfig;
  contact: ContactConfig;
  social: SocialLinksConfig;
}

const SOCIAL_LABELS: Array<{ key: keyof SocialLinksConfig; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X" },
  { key: "whatsapp", label: "WhatsApp" },
];

export function Footer({
  brand,
  navigation,
  footer,
  contact,
  social,
}: FooterProps) {
  if (!footer.enabled) return null;

  const year = new Date().getFullYear();
  const copyright =
    footer.copyrightText?.trim() ||
    `© ${year} ${brand.name}. All rights reserved.`;

  const socialLinks = SOCIAL_LABELS.filter(({ key }) => Boolean(social[key]));
  const hasContact =
    footer.showContact &&
    Boolean(
      contact.email ||
        contact.phone ||
        contact.addressLine1 ||
        contact.city ||
        contact.country,
    );
  const shopLinks = navigation.primary.slice(0, 6);
  const supportLinks = navigation.footer;

  const ctaLine =
    footer.description?.trim() ||
    (brand.tagline?.trim() &&
    brand.tagline.trim().toLowerCase() !== "your store, your brand."
      ? brand.tagline.trim()
      : null);

  return (
    <footer className="mt-auto bg-[var(--color-footer-background)] text-[var(--color-footer-foreground)]">
      {ctaLine ? (
        <div className="border-b border-[color-mix(in_srgb,var(--color-footer-foreground)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_88%,black_12%)]">
          <Container className="flex flex-col items-start justify-between gap-4 py-5 sm:flex-row sm:items-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-button-foreground)]">
              {ctaLine}
            </p>
            <Link
              href="/products"
              className="inline-flex min-h-10 items-center rounded-md bg-[var(--color-button-foreground)] px-4 text-sm font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90"
            >
              Shop now
            </Link>
          </Container>
        </div>
      ) : null}

      <Container className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-14">
        <div className="lg:col-span-1">
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-footer-foreground)]">
            {brand.name}
          </p>
          {(footer.description ||
            (brand.tagline?.trim() &&
              brand.tagline.trim().toLowerCase() !== "your store, your brand.")) && (
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-footer-foreground)_72%,transparent)]">
              {footer.description || brand.tagline}
            </p>
          )}
          {footer.showSocial && socialLinks.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map(({ key, label }) => (
                <li key={key}>
                  <a
                    href={social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-full border border-[color-mix(in_srgb,var(--color-footer-foreground)_18%,transparent)] px-3 text-xs font-medium text-[color-mix(in_srgb,var(--color-footer-foreground)_75%,transparent)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-footer-foreground)]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {shopLinks.length > 0 ? (
          <nav aria-label="Shop">
            <p className={`${sfEyebrow()} !text-[var(--color-accent)]`}>Shop</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {shopLinks.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    className="text-sm text-[color-mix(in_srgb,var(--color-footer-foreground)_75%,transparent)] transition-colors hover:text-[var(--color-footer-foreground)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {footer.navVisible && supportLinks.length > 0 ? (
          <nav aria-label="Support">
            <p className={`${sfEyebrow()} !text-[var(--color-accent)]`}>Support</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {supportLinks.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-[color-mix(in_srgb,var(--color-footer-foreground)_75%,transparent)] transition-colors hover:text-[var(--color-footer-foreground)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {hasContact ? (
          <div>
            <p className={`${sfEyebrow()} !text-[var(--color-accent)]`}>Contact</p>
            <dl className="mt-4 space-y-2 text-sm text-[color-mix(in_srgb,var(--color-footer-foreground)_75%,transparent)]">
              {contact.email ? (
                <div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-[var(--color-footer-foreground)]"
                  >
                    {contact.email}
                  </a>
                </div>
              ) : null}
              {contact.phone ? <div>{contact.phone}</div> : null}
              {contact.phoneSecondary ? (
                <div>{contact.phoneSecondary}</div>
              ) : null}
              {[
                contact.addressLine1,
                contact.addressLine2,
                [contact.city, contact.state, contact.postalCode]
                  .filter(Boolean)
                  .join(", "),
                contact.country,
              ]
                .filter(Boolean)
                .map((line) => (
                  <div key={String(line)}>{line}</div>
                ))}
            </dl>
          </div>
        ) : null}
      </Container>

      <div className="border-t border-[color-mix(in_srgb,var(--color-footer-foreground)_12%,transparent)]">
        <Container className="py-4 text-center text-xs text-[color-mix(in_srgb,var(--color-footer-foreground)_65%,transparent)]">
          <p>{copyright}</p>
        </Container>
      </div>
    </footer>
  );
}

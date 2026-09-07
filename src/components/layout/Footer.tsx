import Link from "next/link";
import { Container } from "@/components/layout/Container";
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

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-footer-background)] text-[var(--color-footer-foreground)]">
      <Container className="grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-footer-foreground)]">
            {brand.name}
          </p>
          {(footer.description || brand.tagline) && (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {footer.description || brand.tagline}
            </p>
          )}
          <p className="mt-4 text-xs text-[var(--color-muted)]">{copyright}</p>
        </div>

        {footer.navVisible ? (
          <nav aria-label="Footer">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Links
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {navigation.footer.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-footer-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div />
        )}

        <div className="space-y-6">
          {hasContact ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Contact
              </p>
              <dl className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
                {contact.email ? <div>{contact.email}</div> : null}
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

          {footer.showSocial && socialLinks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Social
              </p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {socialLinks.map(({ key, label }) => (
                  <li key={key}>
                    <a
                      href={social[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-footer-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {footer.showNewsletter ? (
            <p className="text-sm text-[var(--color-muted)]">
              Newsletter signup will be available in a later phase.
            </p>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}

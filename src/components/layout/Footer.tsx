import Image from "next/image";
import Link from "next/link";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { Container } from "@/components/layout/Container";
import { FooterNavLinks } from "@/components/layout/FooterNavLinks";
import type {
  BrandConfig,
  ContactConfig,
  FooterChromeConfig,
  FooterFeaturedProduct,
  NavigationConfig,
  SocialLinksConfig,
} from "@/types";
import type { ReactNode } from "react";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  formatPhoneDisplay,
  formatPhoneTelHref,
} from "@/lib/phone";

interface FooterProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
  footer: FooterChromeConfig;
  contact: ContactConfig;
  social: SocialLinksConfig;
  featuredProduct?: FooterFeaturedProduct | null;
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

const SOCIAL_ITEMS: Array<{
  key: keyof SocialLinksConfig;
  label: string;
  icon: ReactNode;
}> = [
  { key: "linkedin", label: "LinkedIn", icon: <LinkedInIcon sx={{ fontSize: 18 }} /> },
  { key: "facebook", label: "Facebook", icon: <FacebookIcon sx={{ fontSize: 18 }} /> },
  { key: "x", label: "X", icon: <XGlyph /> },
  { key: "instagram", label: "Instagram", icon: <InstagramIcon sx={{ fontSize: 18 }} /> },
  { key: "youtube", label: "YouTube", icon: <YouTubeIcon sx={{ fontSize: 18 }} /> },
  { key: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon sx={{ fontSize: 18 }} /> },
];

export function Footer({
  brand,
  navigation,
  footer,
  contact,
  social,
  featuredProduct = null,
}: FooterProps) {
  if (!footer.enabled) return null;

  const year = new Date().getFullYear();
  const copyright = `© ${year} ${brand.name}. All rights reserved.`;

  const socialSafe = social ?? {};
  const contactSafe = contact ?? {};

  const socialLinks = SOCIAL_ITEMS.filter(({ key }) =>
    Boolean(socialSafe[key]),
  );
  const hasContact =
    footer.showContact &&
    Boolean(
      contactSafe.email ||
        contactSafe.phone ||
        contactSafe.phoneSecondary ||
        contactSafe.addressLine1 ||
        contactSafe.city ||
        contactSafe.country,
    );
  const shopLinks = navigation.primary.slice(0, 6);
  const supportLinks = navigation.footer;
  const showFeatured =
    footer.showFeaturedProduct && Boolean(featuredProduct);
  const showLogo = Boolean(footer.showLogo && brand.logoUrl);

  const brandBlurb =
    footer.description?.trim() ||
    (brand.tagline?.trim() &&
    brand.tagline.trim().toLowerCase() !== "your store, your brand."
      ? brand.tagline.trim()
      : null);

  return (
    <footer className="sf-footer-shell relative">
      {showFeatured && featuredProduct ? (
        <div className="sf-footer-feature pointer-events-none absolute left-1/2 top-0 z-[3] flex w-full -translate-x-1/2 -translate-y-[42%] justify-center px-4">
          <Link
            href={`/products/${featuredProduct.slug}`}
            className="pointer-events-auto group flex max-w-[8.5rem] flex-col items-center sm:max-w-[13rem]"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[var(--color-card)] shadow-[0_18px_40px_color-mix(in_srgb,var(--color-foreground)_18%,transparent)] ring-2 ring-[color-mix(in_srgb,#fff_70%,var(--color-accent))] transition-transform motion-safe:group-hover:-translate-y-1">
              {featuredProduct.imageUrl ? (
                <Image
                  src={featuredProduct.imageUrl}
                  alt={featuredProduct.name}
                  fill
                  className="object-contain p-2.5"
                  sizes="208px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-lg font-semibold text-[var(--color-primary)]">
                  {featuredProduct.name.slice(0, 1)}
                </div>
              )}
            </div>
            <span className="sr-only">{featuredProduct.name}</span>
          </Link>
        </div>
      ) : null}

      <div className="sf-footer-curve" aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            className="sf-footer-curve-fill"
            d="M0,80 C240,20 480,0 720,0 C960,0 1200,20 1440,80 L1440,120 L0,120 Z"
          />
        </svg>
      </div>

      <div className="sf-footer-body">
        <Container className="pb-7 pt-2 md:pb-12 md:pt-4 lg:pb-14">
          <div className="sf-footer-cluster mx-auto max-w-5xl">
            <div className="sf-footer-brand">
              <p className="sf-footer-ink font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight md:text-2xl">
                {brand.name}
              </p>
              {brandBlurb ? (
                <p className="sf-footer-muted mt-1.5 line-clamp-3 max-w-[20rem] text-xs leading-relaxed md:mt-2.5 md:line-clamp-none md:max-w-[16rem] md:text-sm">
                  {brandBlurb}
                </p>
              ) : null}
              {showLogo ? (
                <div className="mt-2.5 md:mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.logoUrl!}
                    alt={brand.logoAlt ?? brand.name}
                    className="h-9 w-auto max-w-[8rem] object-contain object-left md:h-14 md:max-w-[10rem]"
                  />
                </div>
              ) : null}
            </div>

            {shopLinks.length > 0 ? (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)] md:text-[0.7rem]">
                  Products
                </p>
                <div className="sf-footer-nav mt-1.5 md:mt-2.5">
                  <FooterNavLinks items={shopLinks} ariaLabel="Products" />
                </div>
              </div>
            ) : null}

            {footer.navVisible && supportLinks.length > 0 ? (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)] md:text-[0.7rem]">
                  Explore
                </p>
                <div className="sf-footer-nav mt-1.5 md:mt-2.5">
                  <FooterNavLinks items={supportLinks} ariaLabel="Explore" />
                </div>
              </div>
            ) : null}

            <div className="sf-footer-contact">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)] md:text-[0.7rem]">
                Contact
              </p>
              {hasContact ? (
                <ul className="sf-footer-muted mt-1.5 space-y-1 text-xs md:mt-2.5 md:space-y-1.5 md:text-sm">
                  {contactSafe.phone ? (
                    <li>
                      <a
                        href={
                          formatPhoneTelHref(
                            contactSafe.phone,
                            contactSafe.phoneCountryCode ||
                              DEFAULT_PHONE_COUNTRY_CODE,
                          ) ?? undefined
                        }
                        className="hover:text-[var(--color-primary)]"
                      >
                        {formatPhoneDisplay(
                          contactSafe.phone,
                          contactSafe.phoneCountryCode ||
                            DEFAULT_PHONE_COUNTRY_CODE,
                        )}
                      </a>
                    </li>
                  ) : null}
                  {contactSafe.phoneSecondary ? (
                    <li>
                      <a
                        href={
                          formatPhoneTelHref(
                            contactSafe.phoneSecondary,
                            contactSafe.phoneCountryCode ||
                              DEFAULT_PHONE_COUNTRY_CODE,
                          ) ?? undefined
                        }
                        className="hover:text-[var(--color-primary)]"
                      >
                        {formatPhoneDisplay(
                          contactSafe.phoneSecondary,
                          contactSafe.phoneCountryCode ||
                            DEFAULT_PHONE_COUNTRY_CODE,
                        )}
                      </a>
                    </li>
                  ) : null}
                  {contactSafe.email ? (
                    <li>
                      <a
                        href={`mailto:${contactSafe.email}`}
                        className="underline underline-offset-2 hover:text-[var(--color-primary)]"
                      >
                        {contactSafe.email}
                      </a>
                    </li>
                  ) : null}
                  {contactSafe.addressLine1 ||
                  contactSafe.city ||
                  contactSafe.country ? (
                    <li className="leading-relaxed">
                      {[
                        contactSafe.addressLine1,
                        contactSafe.city,
                        contactSafe.state,
                        contactSafe.postalCode,
                        contactSafe.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="sf-footer-muted mt-1.5 text-xs md:mt-2.5 md:text-sm">
                  Add contact details in Store settings.
                </p>
              )}

              {footer.showSocial ? (
                <div className="mt-3 md:mt-5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)] md:text-[0.7rem]">
                    Connect with us
                  </p>
                  {socialLinks.length > 0 ? (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5 md:mt-2.5 md:gap-2">
                      {socialLinks.map(({ key, label, icon }) => (
                        <li key={key}>
                          <a
                            href={socialSafe[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={label}
                            title={label}
                            className="sf-footer-social-chip"
                          >
                            {icon}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="sf-footer-muted mt-1.5 text-xs md:mt-2.5 md:text-sm">
                      Add social links in Store settings.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </Container>

        <div className="sf-footer-bar">
          <Container className="py-2.5 text-[0.7rem] md:py-3.5 md:text-xs">
            <p>{copyright}</p>
          </Container>
        </div>
      </div>
    </footer>
  );
}

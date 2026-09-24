import Link from "next/link";
import {
  PageShell,
  PageHeroBanner,
  StorefrontBreadcrumb,
} from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getPlatformConfigAsync } from "@/config/site.server";
import { sfBtn } from "@/components/ui/storefront-classes";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { ContactMailtoForm } from "@/features/cms/components/ContactMailtoForm";
import { resolveContactMapsEmbedUrl } from "@/lib/google-maps-embed";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  formatPhoneDisplay,
  formatPhoneTelHref,
} from "@/lib/phone";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const DEFAULT_HEADING = "Let’s connect";
const DEFAULT_SUPPORT = "Our representative will get back to you shortly";

export default async function ContactPage() {
  const { contact, store, brand, social } = await getPlatformConfigAsync();
  const email = contact.email ?? store.supportEmail;
  const phone = contact.phone ?? store.supportPhone;
  const dialCode =
    contact.phoneCountryCode ||
    store.phoneCountryCode ||
    DEFAULT_PHONE_COUNTRY_CODE;
  const companyName = store.legalName?.trim() || brand.name;
  const heading = contact.pageHeading?.trim() || DEFAULT_HEADING;
  const support = contact.pageSupport?.trim() || DEFAULT_SUPPORT;

  const addressLines = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state, contact.postalCode].filter(Boolean).join(", "),
    contact.country,
  ].filter(Boolean) as string[];

  const phones = [phone, contact.phoneSecondary].filter(Boolean) as string[];
  const phoneRows = phones
    .map((national) => ({
      national,
      display: formatPhoneDisplay(national, dialCode),
      href: formatPhoneTelHref(national, dialCode),
    }))
    .filter((row) => row.display && row.href);

  const socialEntries: Array<{ label: string; href: string }> = [];
  const socialMap = [
    ["Instagram", social.instagram],
    ["Facebook", social.facebook],
    ["YouTube", social.youtube],
    ["LinkedIn", social.linkedin],
    ["X", social.x],
    ["WhatsApp", social.whatsapp],
  ] as const;
  for (const [label, href] of socialMap) {
    if (href) socialEntries.push({ label, href });
  }

  const hasDetails = Boolean(
    email || phoneRows.length || addressLines.length || socialEntries.length,
  );
  const bannerOn = Boolean(
    contact.bannerEnabled && contact.bannerImagePath?.trim(),
  );
  const spotlightOn = Boolean(
    contact.spotlightEnabled && contact.spotlightImagePath?.trim(),
  );
  const spotlightImageUrl = spotlightOn
    ? resolveCmsImageUrl(contact.spotlightImagePath)
    : null;
  const mapsEmbedUrl = resolveContactMapsEmbedUrl({
    mapEnabled: contact.mapEnabled !== false,
    embedUrl: contact.mapEmbedUrl,
    addressParts: [companyName, ...addressLines],
  });
  const directionsUrl = addressLines.length
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [companyName, ...addressLines].join(", "),
      )}`
    : null;

  return (
    <PageShell
      showBack={false}
      className={bannerOn ? "!pt-3 md:!pt-4" : "!pt-3 md:!pt-5"}
    >
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Contact" },
        ]}
      />

      {bannerOn ? (
        <PageHeroBanner
          enabled
          imagePath={contact.bannerImagePath}
          alt={`${brand.name} contact`}
          className="sf-contact-hero-banner"
        />
      ) : null}

      <header className="sf-page-hero sf-page-hero--center sf-contact-hero">
        <StorefrontHeading
          title={heading}
          as="h1"
          align="center"
          className="w-full max-w-3xl"
        />
        <p className="sf-page-hero__support">{support}</p>
      </header>

      {hasDetails ? (
        <div className="sf-contact">
          <section
            className={cn(
              "sf-contact-spotlight",
              spotlightImageUrl && "sf-contact-spotlight--with-media",
            )}
            aria-labelledby="contact-details-heading"
          >
            <div className="sf-contact-spotlight__copy">
              <p className="sf-contact-spotlight__kicker">Visit &amp; reach us</p>
              <h2
                id="contact-details-heading"
                className="sf-contact-spotlight__company"
              >
                {companyName}
              </h2>
              {addressLines.length ? (
                <p className="sf-contact-spotlight__address">
                  {addressLines.map((line, i) => (
                    <span key={`${line}-${i}`}>
                      {line}
                      {i < addressLines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              ) : null}

              <div className="sf-contact-spotlight__meta">
                {phoneRows.length ? (
                  <div className="sf-contact-spotlight__row">
                    <span className="sf-contact-spotlight__label">Phone</span>
                    <div className="sf-contact-spotlight__value">
                      {phoneRows.map((row) => (
                        <span key={row.national}>
                          {row !== phoneRows[0] ? <br /> : null}
                          <a href={row.href!}>{row.display}</a>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {email ? (
                  <div className="sf-contact-spotlight__row">
                    <span className="sf-contact-spotlight__label">Email</span>
                    <div className="sf-contact-spotlight__value">
                      <a href={`mailto:${email}`}>{email}</a>
                    </div>
                  </div>
                ) : null}
              </div>

              {socialEntries.length || directionsUrl ? (
                <div className="sf-contact-spotlight__actions">
                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={sfBtn("primary")}
                    >
                      Get directions
                    </a>
                  ) : null}
                  {socialEntries.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={sfBtn("outline")}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            {spotlightImageUrl ? (
              <div className="sf-contact-spotlight__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spotlightImageUrl}
                  alt=""
                  className="sf-contact-spotlight__media-img"
                  decoding="async"
                />
              </div>
            ) : null}
          </section>

          <div className="sf-contact-split">
            <section
              className="sf-contact-form-card"
              aria-labelledby="contact-form-heading"
            >
              <h2 id="contact-form-heading" className="sf-contact-form-card__title">
                Send a message
              </h2>
              <p className="sf-contact-form-card__hint">
                We’ll reply from your mail app — quick and private.
              </p>
              {email ? (
                <ContactMailtoForm email={email} />
              ) : (
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  Add a contact email in Content → Contact to enable messaging.
                </p>
              )}
              <p className="sf-contact-form-card__footer">
                Looking for products?{" "}
                <Link href="/products" className="sf-contact-form-card__link">
                  Browse the catalog
                </Link>
              </p>
            </section>

            {mapsEmbedUrl ? (
              <section
                className="sf-contact-map"
                aria-label="Store location on map"
              >
                <div className="sf-contact-map__head">
                  <h2 className="sf-contact-map__title">Find us</h2>
                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sf-contact-map__link"
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                </div>
                <div className="sf-contact-map__frame-wrap">
                  <iframe
                    title={`${companyName} location`}
                    src={mapsEmbedUrl}
                    className="sf-contact-map__frame"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="sf-contact-empty">
          Contact details are not configured yet. Add them under{" "}
          <strong>Content → Contact</strong> in the admin panel.
        </p>
      )}
    </PageShell>
  );
}

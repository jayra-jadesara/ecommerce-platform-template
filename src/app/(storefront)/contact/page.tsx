import Link from "next/link";
import { PageShell } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getPlatformConfigAsync } from "@/config/site.server";
import { sfBtn, sfEyebrow } from "@/components/ui/storefront-classes";

export default async function ContactPage() {
  const { contact, store, brand, social } = await getPlatformConfigAsync();
  const email = contact.email ?? store.supportEmail;
  const phone = contact.phone ?? store.supportPhone;
  const addressLines = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state, contact.postalCode].filter(Boolean).join(", "),
    contact.country,
  ].filter(Boolean);

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

  const hasAny = Boolean(
    email || phone || contact.phoneSecondary || addressLines.length || socialEntries.length,
  );

  return (
    <PageShell showBack backHref="/" backLabel="Back to home">
      <div className="overflow-hidden rounded-[var(--radius-default,1rem)] border border-[var(--color-border)] bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_80%,color-mix(in_srgb,var(--color-accent)_14%,transparent),transparent_50%),var(--color-surface)] px-6 py-10 md:px-10 md:py-14">
        <p className={sfEyebrow()}>{brand.name}</p>
        <StorefrontHeading
          title="Contact us"
          as="h1"
          align="left"
          className="mt-2 !text-3xl md:!text-4xl"
        />
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] md:text-base">
          Reach the store using the details configured for this brand.
        </p>
      </div>

      {hasAny ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-5">
            <StorefrontHeading
              title="Get in touch"
              as="h2"
              align="left"
              className="!text-2xl"
            />
            <dl className="space-y-4 text-sm">
              {email ? (
                <div>
                  <dt className="text-[var(--color-muted)]">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${email}`}
                      className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {email}
                    </a>
                  </dd>
                </div>
              ) : null}
              {phone ? (
                <div>
                  <dt className="text-[var(--color-muted)]">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {contact.phoneSecondary ? (
                <div>
                  <dt className="text-[var(--color-muted)]">Secondary phone</dt>
                  <dd className="font-medium text-[var(--color-foreground)]">
                    {contact.phoneSecondary}
                  </dd>
                </div>
              ) : null}
              {addressLines.length ? (
                <div>
                  <dt className="text-[var(--color-muted)]">Address</dt>
                  <dd className="space-y-0.5 font-medium text-[var(--color-foreground)]">
                    {addressLines.map((line) => (
                      <div key={String(line)}>{line}</div>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            {socialEntries.length ? (
              <div>
                <h3 className="text-sm font-semibold">Social</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {socialEntries.map(({ label, href }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={sfBtn("outline")}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="rounded-[var(--radius-default,1rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <StorefrontHeading
              title="Send a message"
              as="h2"
              align="left"
              className="!text-2xl"
            />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Prefer email? Use the address above — we do not claim messages are
              delivered through this page.
            </p>
            {email ? (
              <form
                className="mt-5 space-y-3"
                action={`mailto:${email}`}
                method="get"
                encType="text/plain"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="contact-name">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="subject"
                    required
                    placeholder="Your name"
                    className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="contact-body">
                    Message
                  </label>
                  <textarea
                    id="contact-body"
                    name="body"
                    required
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  />
                </div>
                <button type="submit" className={sfBtn("primary")}>
                  Open email app
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-muted)]">
                Add a support email in Store Settings to enable messaging.
              </p>
            )}
            <p className="mt-6 text-sm text-[var(--color-muted)]">
              Looking for products?{" "}
              <Link
                href="/products"
                className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline"
              >
                Browse the catalog
              </Link>
            </p>
          </section>
        </div>
      ) : (
        <p className="mt-8 text-sm text-[var(--color-muted)]">
          Contact details are not configured for this deployment yet. Add them
          under Store Settings in the admin panel.
        </p>
      )}
    </PageShell>
  );
}

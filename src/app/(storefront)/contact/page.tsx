import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site";

export default async function ContactPage() {
  const { contact, store } = await getPlatformConfigAsync();
  const email = contact.email ?? store.supportEmail;
  const phone = contact.phone ?? store.supportPhone;
  const addressLines = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state, contact.postalCode].filter(Boolean).join(", "),
    contact.country,
  ].filter(Boolean);

  const hasAny = Boolean(email || phone || contact.phoneSecondary || addressLines.length);

  return (
    <PageShell
      title="Contact"
      description="Reach the store using the configured contact details."
    >
      {hasAny ? (
        <dl className="max-w-md space-y-3 text-sm">
          {email ? (
            <div>
              <dt className="text-[var(--color-muted)]">Email</dt>
              <dd className="text-[var(--color-foreground)]">{email}</dd>
            </div>
          ) : null}
          {phone ? (
            <div>
              <dt className="text-[var(--color-muted)]">Phone</dt>
              <dd className="text-[var(--color-foreground)]">{phone}</dd>
            </div>
          ) : null}
          {contact.phoneSecondary ? (
            <div>
              <dt className="text-[var(--color-muted)]">Secondary phone</dt>
              <dd className="text-[var(--color-foreground)]">
                {contact.phoneSecondary}
              </dd>
            </div>
          ) : null}
          {addressLines.length ? (
            <div>
              <dt className="text-[var(--color-muted)]">Address</dt>
              <dd className="space-y-0.5 text-[var(--color-foreground)]">
                {addressLines.map((line) => (
                  <div key={String(line)}>{line}</div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          Contact details are not configured for this deployment yet.
        </p>
      )}
    </PageShell>
  );
}

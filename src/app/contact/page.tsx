import { PageShell } from "@/components/layout";
import { getPlatformConfig } from "@/config/site";

export default function ContactPage() {
  const { store } = getPlatformConfig();

  return (
    <PageShell
      title="Contact"
      description="Support channels will be loaded from store settings."
    >
      <dl className="max-w-md space-y-3 text-sm">
        {store.supportEmail ? (
          <div>
            <dt className="text-[var(--color-muted)]">Email</dt>
            <dd className="text-[var(--color-foreground)]">{store.supportEmail}</dd>
          </div>
        ) : null}
        {store.supportPhone ? (
          <div>
            <dt className="text-[var(--color-muted)]">Phone</dt>
            <dd className="text-[var(--color-foreground)]">{store.supportPhone}</dd>
          </div>
        ) : (
          <p className="text-[var(--color-muted)]">
            Contact details are not configured for this deployment yet.
          </p>
        )}
      </dl>
    </PageShell>
  );
}

import { PageShell } from "@/components/layout";
import { getPlatformConfig } from "@/config/site";

export default function AboutPage() {
  const { brand } = getPlatformConfig();

  return (
    <PageShell
      title="About"
      description={
        brand.tagline ??
        "Store story and brand content will be managed via CMS configuration."
      }
    >
      <p className="max-w-2xl text-[var(--color-muted)]">
        About content is configuration-driven. Connect CMS / Supabase content in
        a later phase — keep client-specific copy out of reusable components.
      </p>
    </PageShell>
  );
}

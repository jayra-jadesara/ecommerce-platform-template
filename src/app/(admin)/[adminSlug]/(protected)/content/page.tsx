import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { requirePermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

const SECTIONS = [
  {
    href: "/content/homepage",
    title: "Homepage",
    description: "Hero banner, featured products, and homepage sections.",
  },
  {
    href: "/content/pages",
    title: "Pages",
    description: "About, contact, and other store pages.",
  },
  {
    href: "/content/banners",
    title: "Banners",
    description: "Promotional banners shown across your store.",
  },
  {
    href: "/media",
    title: "Images & Files",
    description: "Upload and manage images used across your store.",
  },
] as const;

export default async function AdminContentHubPage() {
  await requirePermission("cms.view");

  return (
    <div>
      <AdminPageHeader
        title="Content"
        description="Edit the pages and visuals customers see in your store."
        breadcrumbs={[{ label: "Content" }]}
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={getAdminPath(section.href)}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5 transition-colors hover:border-[var(--color-primary)]"
            >
              <p className="font-medium">{section.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {section.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <EmptyState
          title="Content editor is expanding"
          description="Homepage, pages and banners will open into a full visual editor in a later update. Images & Files is ready to use now."
        />
      </div>
    </div>
  );
}

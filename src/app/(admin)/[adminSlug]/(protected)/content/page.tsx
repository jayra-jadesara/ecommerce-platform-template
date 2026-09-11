import Link from "next/link";
import { requirePermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/content/homepage",
    title: "Homepage",
    description: "Hero, products, categories, and other homepage sections.",
  },
  {
    href: "/content/pages",
    title: "Pages",
    description: "About, Shipping, Privacy, and other store pages (not the Homepage).",
  },
  {
    href: "/content/banners",
    title: "Banners",
    description: "Promotional banners shown across your store.",
  },
  {
    href: "/content/blog",
    title: "Blog",
    description: "Articles and journal posts for your store.",
  },
  {
    href: "/media",
    title: "Images & Files",
    description: "Upload images for products, banners, and pages.",
  },
] as const;

export default async function AdminContentHubPage() {
  await requirePermission("content.view");

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
    </div>
  );
}

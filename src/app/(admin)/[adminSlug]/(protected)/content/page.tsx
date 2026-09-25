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
    href: "/content/about",
    title: "About",
    description:
      "Edit the /about founder story — portrait, quote, and optional heritage train milestones.",
  },
  {
    href: "/content/contact",
    title: "Contact",
    description:
      "Banner, heading, and contact details for the storefront /contact page.",
  },
  {
    href: "/content/career",
    title: "Career",
    description: "Careers page content and open roles for the storefront.",
  },
  {
    href: "/content/legal",
    title: "Legal pages",
    description:
      "Privacy Policy, Terms of Use, and Disclaimer — full markdown editor.",
  },
  {
    href: "/content/banners",
    title: "Banners",
    description: "Promotional banners shown across your store.",
  },
  {
    href: "/content/reels",
    title: "Reels",
    description: "Hosted vertical videos for homepage and product pages.",
  },
  {
    href: "/content/blog",
    title: "Blog",
    description: "Articles and journal posts for your store.",
  },
  {
    href: "/content/brochures",
    title: "Brochures",
    description:
      "Upload PDFs for customers to download on the storefront brochure page.",
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

import { EmptyState } from "@/components/ui/EmptyState";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { requirePermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

const HOMEPAGE_SECTIONS = [
  "Hero Banner",
  "Featured Products",
  "Categories",
  "About",
  "Why Choose Us",
  "Testimonials",
  "Call to Action",
];

export default async function AdminContentHomepagePage() {
  await requirePermission("cms.view");

  return (
    <div>
      <AdminPageHeader
        title="Homepage"
        description="Edit the sections customers see first when they visit your store."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Homepage" },
        ]}
      />
      <ul className="mb-8 grid gap-2 sm:grid-cols-2">
        {HOMEPAGE_SECTIONS.map((name) => (
          <li
            key={name}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm"
          >
            {name}
          </li>
        ))}
      </ul>
      <EmptyState
        title="Homepage editor coming soon"
        description="You'll be able to rearrange and edit these sections without code."
      />
    </div>
  );
}

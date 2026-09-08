import { EmptyState } from "@/components/ui/EmptyState";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { requirePermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export default async function AdminContentPagesPage() {
  await requirePermission("cms.view");

  return (
    <div>
      <AdminPageHeader
        title="Pages"
        description="Create and edit pages like About, Contact, and Policies."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Pages" },
        ]}
      />
      <EmptyState
        title="No custom pages yet"
        description="Page editing will arrive in a later update. Your store already includes standard pages from Store Settings."
      />
    </div>
  );
}

import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/features/auth/session";

export default async function AdminCmsPage() {
  await requirePermission("cms.view");
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        CMS
      </h1>
      <div className="mt-6">
        <EmptyState
          title="CMS editor coming soon"
          description="Page and section editing will arrive in a later phase."
        />
      </div>
    </div>
  );
}

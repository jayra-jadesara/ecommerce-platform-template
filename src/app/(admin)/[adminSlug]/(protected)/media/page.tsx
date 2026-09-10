import { MediaLibraryClient } from "@/features/media/components/MediaLibraryClient";
import { listMedia } from "@/features/media/media-service";
import { MEDIA_FOLDERS, type MediaFolder } from "@/features/media/validation";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requirePermission("media.view");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const folderRaw = typeof params.folder === "string" ? params.folder : "all";
  const folder =
    folderRaw === "all" ||
    (MEDIA_FOLDERS as readonly string[]).includes(folderRaw)
      ? (folderRaw as MediaFolder | "all")
      : "all";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const list = await listMedia({ page, pageSize: 24, q, folder });

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Images & Files"
        description="Upload images for products, banners, and pages. Prefer Homepage & pages for storefront visuals."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Images & Files" },
        ]}
      />
      <MediaLibraryClient
        initialItems={list.items}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        folder={folder}
        q={q}
        canUpload={hasPermission(admin, "media.upload")}
        canDelete={hasPermission(admin, "media.delete")}
      />
    </div>
  );
}

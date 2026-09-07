import { MediaLibraryClient } from "@/features/media/components/MediaLibraryClient";
import { listMedia } from "@/features/media/media-service";
import { MEDIA_FOLDERS, type MediaFolder } from "@/features/media/validation";
import { requirePermission, hasPermission } from "@/features/auth/session";

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
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Media library
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Upload and manage store media. Product images also appear here when
        uploaded from the product editor.
      </p>
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

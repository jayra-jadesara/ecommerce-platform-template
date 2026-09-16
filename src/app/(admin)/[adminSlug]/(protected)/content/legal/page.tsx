import Link from "next/link";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { adminCard } from "@/features/admin/ui/admin-classes";
import { listLegalPages } from "@/features/cms/pages-service";
import {
  LEGAL_PAGE_META,
  LEGAL_PAGE_SLUGS,
} from "@/features/cms/schemas";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function statusColor(
  status: string,
): "success" | "default" | "warning" {
  if (status === "published") return "success";
  if (status === "archived") return "default";
  return "warning";
}

export default async function AdminLegalPagesHubPage() {
  const admin = await requirePermission("content.view");
  const canUpdate = hasPermission(admin, "content.update");
  const pages = await listLegalPages();
  const bySlug = new Map(pages.map((p) => [p.slug, p]));

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Legal pages"
        description="Privacy Policy, Terms of Use, and Disclaimer — edit with the same markdown editor as Blog."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Legal pages" },
        ]}
      />

      <Alert severity="info">
        These pages live at fixed storefront URLs (
        <code className="text-xs">/privacy</code>,{" "}
        <code className="text-xs">/terms</code>,{" "}
        <code className="text-xs">/disclaimer</code>
        ). Publish each page when the copy is ready for customers.
      </Alert>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LEGAL_PAGE_SLUGS.map((slug) => {
          const meta = LEGAL_PAGE_META[slug];
          const page = bySlug.get(slug);
          const editHref = getAdminPath(`/content/legal/${slug}`);
          return (
            <li key={slug}>
              <div
                className={cn(
                  adminCard(),
                  "flex h-full flex-col gap-3 p-5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                      {meta.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {meta.description}
                    </p>
                  </div>
                  {page ? (
                    <Chip
                      size="small"
                      label={statusLabel(page.status)}
                      color={statusColor(page.status)}
                      variant="outlined"
                    />
                  ) : null}
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  Storefront:{" "}
                  <Link
                    href={meta.storefrontPath}
                    target="_blank"
                    className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                  >
                    {meta.storefrontPath}
                  </Link>
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {canUpdate ? (
                    <Link
                      href={editHref}
                      className="rounded-md bg-[var(--color-button-background)] px-3.5 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
                    >
                      Edit
                    </Link>
                  ) : (
                    <Link
                      href={editHref}
                      className="rounded-md border border-[var(--color-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)]"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

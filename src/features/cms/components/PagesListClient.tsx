"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Chip from "@mui/material/Chip";
import { getAdminPath } from "@/config/admin-route";
import {
  archivePageAction,
  publishPageAction,
  unpublishPageAction,
} from "@/features/cms/actions";
import type { ContentPage } from "@/features/cms/types";
import { ABOUT_PAGE_SLUG, HOMEPAGE_SLUG } from "@/features/cms/schemas";
import { formatDate } from "@/lib/format-date";

export function PagesListClient({
  pages,
  canCreate,
  canUpdate,
  canPublish,
  canDelete,
}: {
  pages: ContentPage[];
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visible = pages.filter(
    (p) => p.slug !== HOMEPAGE_SLUG && p.slug !== ABOUT_PAGE_SLUG,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate ? (
          <Link
            href={`${getAdminPath("/content/pages")}?panel=new`}
            className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
          >
            Create page
          </Link>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Page address</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[var(--color-muted)]">
                  No pages yet. Add About, Shipping, Privacy, or other store pages here.
                </td>
              </tr>
            ) : (
              visible.map((page) => (
                <tr key={page.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">{page.title}</td>
                  <td className="px-3 py-2">/pages/{page.slug}</td>
                  <td className="px-3 py-2">
                    <Chip size="small" label={page.status} />
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">
                    {formatDate(page.updatedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canUpdate ? (
                        <Link
                          href={`${getAdminPath("/content/pages")}?panel=edit&id=${page.id}`}
                          className="underline"
                        >
                          Edit
                        </Link>
                      ) : null}
                      {canPublish && page.status !== "published" ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="underline"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await publishPageAction(page.id);
                              if (!result.ok) setError(result.error);
                              router.refresh();
                            });
                          }}
                        >
                          Publish
                        </button>
                      ) : null}
                      {canPublish && page.status === "published" ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="underline"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await unpublishPageAction(page.id);
                              if (!result.ok) setError(result.error);
                              router.refresh();
                            });
                          }}
                        >
                          Unpublish
                        </button>
                      ) : null}
                      {canDelete && page.status !== "archived" ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="text-red-700 underline"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await archivePageAction(page.id);
                              if (!result.ok) setError(result.error);
                              router.refresh();
                            });
                          }}
                        >
                          Archive
                        </button>
                      ) : null}
                      {page.status === "published" ? (
                        <Link href={`/pages/${page.slug}`} target="_blank" className="underline">
                          Preview
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

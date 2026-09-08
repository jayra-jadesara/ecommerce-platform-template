import type { ReactNode } from "react";
import {
  AdminBreadcrumbs,
  type AdminBreadcrumbItem,
} from "@/features/admin/components/AdminBreadcrumbs";

export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <AdminBreadcrumbs items={breadcrumbs} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

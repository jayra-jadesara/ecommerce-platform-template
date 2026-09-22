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
    <header className="mb-3 space-y-1.5">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <AdminBreadcrumbs items={breadcrumbs} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-end justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

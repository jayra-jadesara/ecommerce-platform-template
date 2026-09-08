import Link from "next/link";
import { Fragment } from "react";
import { getAdminPath } from "@/config/admin-route";
import { ADMIN_BREADCRUMB_LABELS } from "@/features/admin/nav";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * Friendly admin breadcrumbs. Prefer explicit items; otherwise derive from
 * path segments under the admin base (never show raw technical route names).
 */
export function AdminBreadcrumbs({
  items,
  pathSuffix,
}: {
  items?: AdminBreadcrumbItem[];
  /** Path after admin segment, e.g. "/catalog/products/new" */
  pathSuffix?: string;
}) {
  const crumbs =
    items ??
    (pathSuffix
      ? pathSuffix
          .split("/")
          .filter(Boolean)
          .map((segment, index, parts) => {
            const href = getAdminPath(`/${parts.slice(0, index + 1).join("/")}`);
            const label =
              ADMIN_BREADCRUMB_LABELS[segment] ??
              segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const isLast = index === parts.length - 1;
            return {
              label,
              href: isLast ? undefined : href,
            } satisfies AdminBreadcrumbItem;
          })
      : []);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-muted)]">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? <span aria-hidden>/</span> : null}
            <li>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--color-foreground)]">{crumb.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

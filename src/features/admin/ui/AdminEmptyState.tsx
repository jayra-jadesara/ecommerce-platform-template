import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { adminCard, adminCardPadding } from "@/features/admin/ui/admin-classes";

export function AdminEmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        adminCard(),
        adminCardPadding(),
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-[var(--color-muted)]" aria-hidden>
          {icon}
        </div>
      ) : (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] text-lg font-semibold text-[var(--color-muted)]"
          aria-hidden
        >
          ···
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-[var(--color-foreground)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AdminErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <AdminEmptyState title={title} description={description} action={action} />
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  adminCard,
  adminCardPadding,
  adminSectionDesc,
  adminSectionTitle,
} from "@/features/admin/ui/admin-classes";

export function AdminCard({
  children,
  className,
  padded = true,
  interactive = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        adminCard(),
        padded && adminCardPadding(),
        interactive &&
          "transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <AdminCard className={className}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={adminSectionTitle()}>{title}</h2>
          {description ? (
            <p className={adminSectionDesc()}>{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </AdminCard>
  );
}

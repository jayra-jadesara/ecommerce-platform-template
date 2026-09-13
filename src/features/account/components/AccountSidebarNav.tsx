"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { isActivePath } from "@/lib/is-active-path";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/payments", label: "Payments" },
] as const;

export function AccountSidebarNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className="mt-4 flex flex-row gap-1 overflow-x-auto md:flex-col"
      aria-label="Account"
    >
      {NAV.map((item) => {
        const active = isActivePath(pathname, item.href, {
          exact: "exact" in item && item.exact,
        });
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] font-semibold text-[var(--color-primary)] md:before:absolute md:before:inset-y-1.5 md:before:left-0 md:before:w-0.5 md:before:rounded-full md:before:bg-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <div className="mt-2 px-1">
        <LogoutButton variant="outlined" />
      </div>
    </nav>
  );
}

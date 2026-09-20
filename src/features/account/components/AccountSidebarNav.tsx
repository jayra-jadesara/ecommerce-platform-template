"use client";

import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutControl } from "@/features/auth/components/LogoutControl";
import { isActivePath } from "@/lib/is-active-path";
import { cn } from "@/lib/cn";

const NAV: {
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
}[] = [
  {
    href: "/account",
    label: "Overview",
    exact: true,
    icon: <HomeRoundedIcon className="!text-[1.05rem]" aria-hidden />,
  },
  {
    href: "/account/profile",
    label: "Profile",
    icon: <PersonOutlineRoundedIcon className="!text-[1.05rem]" aria-hidden />,
  },
  {
    href: "/account/wishlist",
    label: "Wishlist",
    icon: <FavoriteBorderRoundedIcon className="!text-[1.05rem]" aria-hidden />,
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    icon: <LocalShippingOutlinedIcon className="!text-[1.05rem]" aria-hidden />,
  },
  {
    href: "/account/orders",
    label: "Orders",
    icon: <ReceiptLongOutlinedIcon className="!text-[1.05rem]" aria-hidden />,
  },
  {
    href: "/account/payments",
    label: "Payments",
    icon: <PaymentsOutlinedIcon className="!text-[1.05rem]" aria-hidden />,
  },
];

export function AccountSidebarNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="mt-3" aria-label="Account">
      <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
        {NAV.map((item) => {
          const active = isActivePath(pathname, item.href, {
            exact: Boolean(item.exact),
          });
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] font-semibold text-[var(--color-primary)] md:before:absolute md:before:inset-y-1.5 md:before:left-0 md:before:w-[2px] md:before:rounded-full md:before:bg-[var(--color-primary)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]"
                      : "bg-[var(--color-surface)] text-[var(--color-muted)] group-hover:text-[var(--color-foreground)]",
                  )}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 border-t border-[var(--color-border)] pt-3 md:mt-4">
        <LogoutControl
          variant="text"
          label="Log out"
          className="!w-full !justify-start !rounded-lg !px-2.5 !py-2 !text-[0.8125rem] !font-medium"
          icon={
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface)] text-[var(--color-muted)]">
              <LogoutRoundedIcon className="!text-[1.05rem]" aria-hidden />
            </span>
          }
        />
      </div>
    </nav>
  );
}

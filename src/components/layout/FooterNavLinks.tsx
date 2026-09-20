"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "@/lib/is-active-path";
import { cn } from "@/lib/cn";

export type FooterNavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export function FooterNavLinks({
  items,
  ariaLabel,
}: {
  items: FooterNavItem[];
  ariaLabel: string;
}) {
  const pathname = usePathname() || "/";

  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex flex-col gap-1 md:gap-2">
        {items.map((item) => {
          const active =
            !item.external &&
            isActivePath(pathname, item.href, {
              exact: item.href === "/",
            });
          return (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-xs transition-colors md:text-sm",
                  active
                    ? "font-semibold text-[var(--color-primary)]"
                    : "text-[var(--color-footer-foreground)] hover:text-[var(--color-primary)]",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

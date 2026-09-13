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
      <ul className="mt-4 flex flex-col gap-2.5">
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
                  "text-sm transition-colors",
                  active
                    ? "font-semibold text-[var(--color-footer-foreground)]"
                    : "text-[color-mix(in_srgb,var(--color-footer-foreground)_75%,transparent)] hover:text-[var(--color-footer-foreground)]",
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

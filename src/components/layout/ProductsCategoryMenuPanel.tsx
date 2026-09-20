"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Link from "next/link";
import type { CategoryMenuNode } from "@/features/catalog/category-menu";
import { cn } from "@/lib/cn";

type ProductsCategoryMenuPanelProps = {
  categoryTree: CategoryMenuNode[];
  onNavigate?: () => void;
  /** Desktop flyout vs mobile accordion body */
  variant?: "desktop" | "mobile";
};

/**
 * Premium Products → categories panel (desktop dropdown / mobile accordion body).
 */
export function ProductsCategoryMenuPanel({
  categoryTree,
  onNavigate,
  variant = "desktop",
}: ProductsCategoryMenuPanelProps) {
  const isDesktop = variant === "desktop";
  const multiCol = isDesktop && categoryTree.length >= 4;

  return (
    <div
      className={cn(
        isDesktop
          ? "overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[var(--color-card)] shadow-[0_18px_48px_color-mix(in_srgb,var(--color-foreground)_14%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
          : "rounded-xl bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-card))] px-2 py-2",
      )}
    >
      {isDesktop ? (
        <div className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-3.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Shop by category
          </p>
        </div>
      ) : null}

      <div className={cn(isDesktop ? "p-1.5" : "space-y-0.5")}>
        <Link
          role="menuitem"
          href="/products"
          onClick={onNavigate}
          className={cn(
            "group/item flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold tracking-tight transition-colors",
            "text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] hover:text-[var(--color-primary)]",
          )}
        >
          <span>All products</span>
          <ArrowForwardIcon
            sx={{ fontSize: 14 }}
            className="opacity-0 transition-all group-hover/item:translate-x-0.5 group-hover/item:opacity-70"
          />
        </Link>

        {categoryTree.length > 0 ? (
          <div
            className={cn(
              "mx-2 my-1 border-t border-[color-mix(in_srgb,var(--color-border)_80%,transparent)]",
              !isDesktop && "mx-1",
            )}
          />
        ) : null}

        <div
          className={cn(
            multiCol && "grid grid-cols-2 gap-0.5",
            !multiCol && "flex flex-col gap-0.5",
          )}
        >
          {categoryTree.map((node) => (
            <div key={node.id} className="min-w-0">
              <Link
                role="menuitem"
                href={node.href}
                onClick={onNavigate}
                className={cn(
                  "group/item relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium tracking-tight transition-colors",
                  "text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] hover:text-[var(--color-primary)]",
                )}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_55%,transparent)] opacity-70"
                />
                <span className="min-w-0 flex-1 truncate">{node.name}</span>
              </Link>
              {node.children.length > 0 ? (
                <div className="mb-0.5 ml-5 space-y-0.5 border-l border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pl-2.5">
                  {node.children.map((child) => (
                    <Link
                      key={child.id}
                      role="menuitem"
                      href={child.href}
                      onClick={onNavigate}
                      className="block truncate rounded-lg px-2 py-1 text-[12px] text-[var(--color-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] hover:text-[var(--color-primary)]"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

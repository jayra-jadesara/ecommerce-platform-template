"use client";

import Drawer from "@mui/material/Drawer";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export type CollectionFilterOption = {
  id: string;
  name: string;
};

export type CollectionFilterDrawerProps = {
  categories: CollectionFilterOption[];
  q: string;
  categoryId: string;
  sort: string;
  basePath?: string;
};

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Date, new to old" },
  { value: "oldest", label: "Date, old to new" },
  { value: "name", label: "Alphabetically, A-Z" },
  { value: "name_desc", label: "Alphabetically, Z-A" },
  { value: "price", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
] as const;

function buildHref(
  basePath: string,
  next: { q?: string; categoryId?: string; sort?: string },
) {
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  if (next.categoryId) search.set("categoryId", next.categoryId);
  if (next.sort && next.sort !== "featured") search.set("sort", next.sort);
  const qs = search.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

/**
 * Mobile filter / sort bottom sheet for collection pages.
 */
export function CollectionFilterDrawer({
  categories,
  q,
  categoryId,
  sort,
  basePath = "/products",
}: CollectionFilterDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftQ, setDraftQ] = useState(q);
  const [draftCategory, setDraftCategory] = useState(categoryId);
  const [draftSort, setDraftSort] = useState(sort);

  function openDrawer() {
    setDraftQ(q);
    setDraftCategory(categoryId);
    setDraftSort(sort);
    setOpen(true);
  }

  function apply() {
    router.push(
      buildHref(basePath, {
        q: draftQ.trim() || undefined,
        categoryId: draftCategory || undefined,
        sort: draftSort,
      }),
    );
    setOpen(false);
  }

  function reset() {
    setDraftQ("");
    setDraftCategory("");
    setDraftSort("featured");
    router.push(basePath);
    setOpen(false);
  }

  const activeCount =
    (q ? 1 : 0) + (categoryId ? 1 : 0) + (sort && sort !== "featured" ? 1 : 0);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className={cn(
          sfBtn("outline"),
          "w-full justify-center text-sm md:hidden",
        )}
      >
        Filter & sort
        {activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            className:
              "!rounded-t-[1.25rem] !bg-[var(--color-card)] !text-[var(--color-foreground)] max-h-[85vh]",
            "aria-label": "Filter and sort products",
          },
        }}
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Filter & sort
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            >
              Close
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-q">
                Search
              </label>
              <input
                id="filter-q"
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                placeholder="Search products"
                className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="filter-category"
              >
                Category
              </label>
              <select
                id="filter-category"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-sort">
                Sort
              </label>
              <select
                id="filter-sort"
                value={draftSort}
                onChange={(e) => setDraftSort(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 border-t border-[var(--color-border)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={reset} className={cn(sfBtn("outline"), "flex-1")}>
              Reset
            </button>
            <button type="button" onClick={apply} className={cn(sfBtn("primary"), "flex-1")}>
              Apply
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import GridViewIcon from "@mui/icons-material/GridView";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ViewListIcon from "@mui/icons-material/ViewList";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { EmptyState } from "@/components/ui/EmptyState";
import { sfEyebrow } from "@/components/ui/storefront-classes";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import type { StorefrontProductCard } from "@/features/catalog/storefront";

export type CatalogCategoryFilter = {
  id: string;
  name: string;
  count?: number;
  slug?: string;
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

type ProductsCatalogProps = {
  products: StorefrontProductCard[];
  categories: CatalogCategoryFilter[];
  currency: string;
  isAuthenticated: boolean;
  total: number;
  q: string;
  categoryId: string;
  sort: string;
  page: number;
  totalPages: number;
  basePath?: string;
  lockCategory?: boolean;
};

function buildHref(
  current: {
    q: string;
    categoryId: string;
    sort: string;
    page: number;
    basePath: string;
    lockCategory: boolean;
  },
  next: Record<string, string | undefined>,
) {
  const merged = {
    q: current.q,
    categoryId: current.categoryId,
    sort: current.sort,
    page: String(current.page),
    ...next,
  };
  const search = new URLSearchParams();
  if (merged.q) search.set("q", merged.q);
  if (!current.lockCategory && merged.categoryId) {
    search.set("categoryId", merged.categoryId);
  }
  if (merged.sort && merged.sort !== "newest") search.set("sort", merged.sort);
  if (merged.page && merged.page !== "1") search.set("page", merged.page);
  const qs = search.toString();
  return `${current.basePath}${qs ? `?${qs}` : ""}`;
}

export function ProductsCatalog({
  products,
  categories,
  currency,
  isAuthenticated,
  total,
  q,
  categoryId,
  sort,
  page,
  totalPages,
  basePath = "/products",
  lockCategory = false,
}: ProductsCatalogProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const hydrated = useHasHydrated();
  const filterWrapRef = useRef<HTMLDivElement>(null);

  const filtersVisible = hydrated && filtersOpen;
  const current = { q, categoryId, sort, page, basePath, lockCategory };

  const selectedCount = useMemo(
    () => (categoryId ? 1 : 0) + (q ? 1 : 0),
    [categoryId, q],
  );

  useEffect(() => {
    if (!filtersVisible) return;

    function onPointerDown(event: MouseEvent | PointerEvent) {
      const root = filterWrapRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setFiltersOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersVisible]);

  function onSortChange(nextSort: string) {
    router.push(buildHref(current, { sort: nextSort, page: "1" }));
  }

  function onCategoryToggle(id: string) {
    const next = categories.find((c) => c.id === id);
    if (categoryId === id) {
      router.push("/products");
      setFiltersOpen(false);
      return;
    }
    if (next?.slug) {
      const search = new URLSearchParams();
      if (q) search.set("q", q);
      if (sort && sort !== "newest") search.set("sort", sort);
      const qs = search.toString();
      router.push(`/categories/${next.slug}${qs ? `?${qs}` : ""}`);
      setFiltersOpen(false);
      return;
    }
    router.push(
      buildHref(
        { ...current, lockCategory: false, basePath: "/products" },
        {
          categoryId: id,
          page: "1",
        },
      ),
    );
    setFiltersOpen(false);
  }

  function resetFilters() {
    setFiltersOpen(false);
    if (lockCategory) {
      router.push(basePath);
      return;
    }
    router.push(buildHref(current, { categoryId: "", q: "", page: "1" }));
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-sm">
        <div ref={filterWrapRef} className="relative flex items-center gap-0.5">
          <Button
            size="small"
            color="inherit"
            startIcon={<FilterListIcon fontSize="small" />}
            aria-expanded={filtersVisible}
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen((v) => !v)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "var(--color-foreground)",
            }}
          >
            {filtersVisible ? "Hide filter" : "Show filter"}
            {selectedCount > 0 ? (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-px text-[10px] font-semibold text-[var(--color-button-foreground)]">
                {selectedCount}
              </span>
            ) : null}
          </Button>

          {selectedCount > 0 ? (
            <IconButton
              size="small"
              aria-label="Clear filters"
              title="Clear filters"
              onClick={resetFilters}
              sx={{
                color: "var(--color-primary)",
                "&:hover": {
                  backgroundColor:
                    "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                },
              }}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          ) : null}

          {filtersVisible ? (
            <div
              role="dialog"
              aria-label="Product filters"
              className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[0_16px_40px_color-mix(in_srgb,var(--color-foreground)_14%,transparent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                    Filter
                  </h2>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    {selectedCount} selected
                  </p>
                </div>
                <IconButton
                  size="small"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  sx={{ color: "var(--color-muted)" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>

              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <p className={`${sfEyebrow()} !text-[10px] !tracking-[0.14em]`}>
                  Categories
                </p>
                <ul className="mt-2 max-h-44 space-y-0.5 overflow-y-auto pr-1">
                  {categories.map((category) => {
                    const checked = categoryId === category.id;
                    return (
                      <li key={category.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              onChange={() => onCategoryToggle(category.id)}
                              sx={{
                                color: "var(--color-border)",
                                padding: "4px",
                                "&.Mui-checked": {
                                  color: "var(--color-primary)",
                                },
                              }}
                            />
                          }
                          label={
                            <span className="text-xs leading-snug text-[var(--color-foreground)]">
                              {category.name}
                              {typeof category.count === "number" ? (
                                <span className="text-[var(--color-muted)]">
                                  {" "}
                                  ({category.count})
                                </span>
                              ) : null}
                            </span>
                          }
                          sx={{
                            mx: 0,
                            width: "100%",
                            alignItems: "center",
                            gap: 0.5,
                            marginLeft: 0,
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>

              <form
                method="get"
                action={basePath}
                className="mt-3 flex flex-col gap-3 border-t border-[var(--color-border)] pt-3"
                onSubmit={() => setFiltersOpen(false)}
              >
                {!lockCategory && categoryId ? (
                  <input type="hidden" name="categoryId" value={categoryId} />
                ) : null}
                {sort && sort !== "newest" ? (
                  <input type="hidden" name="sort" value={sort} />
                ) : null}
                <TextField
                  id="catalog-search"
                  name="q"
                  size="small"
                  fullWidth
                  defaultValue={q}
                  placeholder="Search"
                  sx={{
                    display: "block",
                    mb: 0,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "var(--color-background)",
                      borderRadius: "var(--radius-default, 0.5rem)",
                      fontSize: "0.8125rem",
                      "& fieldset": { borderColor: "var(--color-border)" },
                      "&:hover fieldset": {
                        borderColor: "var(--color-primary)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "var(--color-primary)",
                      },
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-button-foreground)",
                    borderRadius: "var(--radius-default, 0.5rem)",
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "var(--color-primary)",
                      filter: "brightness(1.05)",
                      boxShadow: "none",
                    },
                  }}
                >
                  Search
                </Button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-0.5"
            role="group"
            aria-label="Product layout"
          >
            <IconButton
              size="small"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              color={view === "list" ? "primary" : "default"}
              sx={{
                borderRadius: 1,
                bgcolor:
                  view === "list"
                    ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
                    : "transparent",
              }}
            >
              <ViewListIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              color={view === "grid" ? "primary" : "default"}
              sx={{
                borderRadius: 1,
                bgcolor:
                  view === "grid"
                    ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
                    : "transparent",
              }}
            >
              <GridViewIcon fontSize="small" />
            </IconButton>
          </div>

          <FormControl size="small" sx={{ minWidth: 168 }}>
            <InputLabel
              id="catalog-sort-label"
              sx={{ color: "var(--color-muted)", fontSize: "0.8125rem" }}
            >
              Sort by
            </InputLabel>
            <Select
              labelId="catalog-sort-label"
              id="catalog-sort"
              label="Sort by"
              value={sort}
              onChange={(e) => onSortChange(String(e.target.value))}
              sx={{
                backgroundColor: "var(--color-background)",
                borderRadius: "var(--radius-default, 0.5rem)",
                fontSize: "0.8125rem",
                color: "var(--color-foreground)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-border)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-primary)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-primary)",
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: "var(--color-card)",
                      color: "var(--color-foreground)",
                      border: "1px solid var(--color-border)",
                    },
                  },
                },
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                  sx={{
                    fontSize: "0.8125rem",
                    "&.Mui-selected": {
                      backgroundColor:
                        "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                    },
                    "&.Mui-selected:hover": {
                      backgroundColor:
                        "color-mix(in srgb, var(--color-primary) 20%, transparent)",
                    },
                  }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      <div className="relative z-0 min-w-0">
          <p className="mb-2.5 text-xs text-[var(--color-muted)]">
            {total === 0
              ? "No products match your filters."
              : `${total} ${total === 1 ? "product" : "products"}`}
          </p>

          {products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try a different search, or browse the full catalog once products are published."
              action={
                q || categoryId ? (
                  <Button
                    component={Link}
                    href="/products"
                    variant="contained"
                    color="primary"
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : view === "grid" ? (
            <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4">
              {products.map((product) => (
                <li key={product.id} className="flex h-full min-w-0">
                  <ProductCard
                    product={product}
                    currency={currency}
                    isAuthenticated={isAuthenticated}
                    layout="grid"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mx-auto flex max-w-5xl flex-col gap-5">
              {products.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard
                    product={product}
                    currency={currency}
                    isAuthenticated={isAuthenticated}
                    layout="list"
                  />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-between text-xs"
              aria-label="Pagination"
            >
              <Link
                href={buildHref(current, {
                  page: String(Math.max(1, page - 1)),
                })}
                aria-disabled={page <= 1}
                className={
                  page <= 1 ? "pointer-events-none opacity-40" : "underline"
                }
              >
                Previous
              </Link>
              <span className="text-[var(--color-muted)]">
                Page {page} of {totalPages}
              </span>
              <Link
                href={buildHref(current, {
                  page: String(Math.min(totalPages, page + 1)),
                })}
                aria-disabled={page >= totalPages}
                className={
                  page >= totalPages
                    ? "pointer-events-none opacity-40"
                    : "underline"
                }
              >
                Next
              </Link>
            </nav>
          ) : null}
      </div>
    </div>
  );
}

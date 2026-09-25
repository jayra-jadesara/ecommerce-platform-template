"use client";

import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sfEyebrow } from "@/components/ui/storefront-classes";
import type { StorefrontBlogCategory } from "@/features/blog/types";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { cn } from "@/lib/cn";

type BlogCategoryFilterProps = {
  categories: StorefrontBlogCategory[];
  activeSlug?: string;
  q?: string;
  showSearch?: boolean;
  className?: string;
};

function listingHref(input: { categorySlug?: string | null; q?: string }): string {
  const params = new URLSearchParams();
  if (input.categorySlug) params.set("category", input.categorySlug);
  if (input.q?.trim()) params.set("q", input.q.trim());
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

/**
 * Product-catalog-style filter for the blog — Show filter + categories + search.
 */
export function BlogCategoryFilter({
  categories,
  activeSlug,
  q = "",
  showSearch = true,
  className,
}: BlogCategoryFilterProps) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const filtersVisible = hydrated && filtersOpen;
  const selectedCount = (activeSlug ? 1 : 0) + (q.trim() ? 1 : 0);

  useEffect(() => {
    if (!filtersVisible) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const root = filterWrapRef.current;
      const target = event.target as Node | null;
      if (!root || !target || root.contains(target)) return;
      setFiltersOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersVisible]);

  function selectCategory(slug: string | null) {
    setFiltersOpen(false);
    router.push(listingHref({ categorySlug: slug, q }));
  }

  function resetFilters() {
    setFiltersOpen(false);
    router.push("/blog");
  }

  if (!categories.length && !showSearch) return null;

  return (
    <div
      ref={filterWrapRef}
      className={cn("relative flex items-center gap-0.5", className)}
    >
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
          aria-label="Blog filters"
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

          {categories.length ? (
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <p className={`${sfEyebrow()} !text-[10px] !tracking-[0.14em]`}>
                Categories
              </p>
              <ul className="mt-2 max-h-44 space-y-0.5 overflow-y-auto pr-1">
                <li>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!activeSlug}
                        onChange={() => selectCategory(null)}
                        sx={{
                          color: "var(--color-border)",
                          padding: "4px",
                          "&.Mui-checked": { color: "var(--color-primary)" },
                        }}
                      />
                    }
                    label={
                      <span className="text-xs leading-snug text-[var(--color-foreground)]">
                        All articles
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
                {categories.map((category) => {
                  const checked = activeSlug === category.slug;
                  const thumb = category.imageUrl?.trim() || null;
                  return (
                    <li key={category.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() =>
                              selectCategory(checked ? null : category.slug)
                            }
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
                          <span className="flex min-w-0 items-center gap-2 text-xs leading-snug text-[var(--color-foreground)]">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
                              />
                            ) : (
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] text-[10px] font-semibold text-[var(--color-primary)]"
                                aria-hidden
                              >
                                {category.name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span className="min-w-0 truncate">
                              {category.name}
                              <span className="text-[var(--color-muted)]">
                                {" "}
                                ({category.postCount})
                              </span>
                            </span>
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
          ) : null}

          {showSearch ? (
            <form
              method="get"
              action="/blog"
              className="mt-3 flex flex-col gap-3 border-t border-[var(--color-border)] pt-3"
              onSubmit={() => setFiltersOpen(false)}
            >
              {activeSlug ? (
                <input type="hidden" name="category" value={activeSlug} />
              ) : null}
              <TextField
                id="blog-filter-search"
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

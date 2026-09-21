"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchIcon from "@mui/icons-material/Search";
import IconButton from "@mui/material/IconButton";
import {
  searchHeaderProductsAction,
  type HeaderSearchHit,
} from "@/features/catalog/header-search-action";
import { formatMoney } from "@/features/catalog/money";
import { cn } from "@/lib/cn";

type HeaderSearchProps = {
  currency?: string;
};

const EXIT_MS = 220;

/** Compact search panel anchored under the search icon, with enter/exit motion. */
export function HeaderSearch({ currency = "INR" }: HeaderSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exitTimer = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<HeaderSearchHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(-1);

  const resetQuery = useCallback(() => {
    setQuery("");
    setHits([]);
    setSearched(false);
    setActiveIndex(-1);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEntered(false);
    if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setPresent(false);
      resetQuery();
      exitTimer.current = null;
    }, EXIT_MS);
  }, [resetQuery]);

  const openPanel = useCallback(() => {
    if (exitTimer.current != null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    setPresent(true);
    setOpen(true);
    resetQuery();
    // Double rAF so the closed styles paint before we flip to open
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });
  }, [resetQuery]);

  useEffect(() => {
    return () => {
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        close();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || !entered) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open, entered]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearched(false);
      setActiveIndex(-1);
      return;
    }

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const next = await searchHeaderProductsAction(q);
        setHits(next);
        setSearched(true);
        setActiveIndex(-1);
      });
    }, 200);

    return () => window.clearTimeout(handle);
  }, [query, open]);

  function goToResults() {
    const q = query.trim();
    if (!q) return;
    router.push(`/products?q=${encodeURIComponent(q)}`);
    close();
  }

  function selectHit(hit: HeaderSearchHit) {
    router.push(`/products/${hit.slug}`);
    close();
  }

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        aria-label={open ? "Close search" : "Search products"}
        aria-expanded={open}
        aria-controls={present ? panelId : undefined}
        size="small"
        className="!text-[var(--color-header-foreground)]"
        onClick={() => {
          if (open) close();
          else openPanel();
        }}
      >
        {open ? (
          <CloseRoundedIcon fontSize="small" />
        ) : (
          <SearchIcon fontSize="small" />
        )}
      </IconButton>

      {present ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Search products"
          className={cn(
            "sf-header-search-panel",
            entered && open
              ? "sf-header-search-panel--open"
              : "sf-header-search-panel--closed",
          )}
        >
          <span className="sf-header-search-panel__caret" aria-hidden />

          <form
            role="search"
            className="sf-header-search-panel__form"
            onSubmit={(event) => {
              event.preventDefault();
              if (activeIndex >= 0 && hits[activeIndex]) {
                selectHit(hits[activeIndex]);
                return;
              }
              goToResults();
            }}
          >
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Search products
            </label>
            <div className="relative">
              <SearchIcon
                sx={{ fontSize: 16 }}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                aria-hidden
              />
              <input
                id={`${panelId}-input`}
                ref={inputRef}
                type="search"
                value={query}
                autoComplete="off"
                placeholder="Search products…"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={
                  activeIndex >= 0
                    ? `${listId}-option-${activeIndex}`
                    : undefined
                }
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (!hits.length) return;
                    setActiveIndex((i) => (i + 1) % hits.length);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (!hits.length) return;
                    setActiveIndex((i) =>
                      i <= 0 ? hits.length - 1 : i - 1,
                    );
                  }
                }}
                className="sf-header-search-panel__input"
              />
            </div>
          </form>

          <div className="sf-header-search-panel__body">
            {!query.trim() ? (
              <p className="sf-header-search-panel__hint">
                Type a name, then press Enter
              </p>
            ) : null}

            {query.trim().length === 1 ? (
              <p className="sf-header-search-panel__hint">Keep typing…</p>
            ) : null}

            {pending && query.trim().length >= 2 ? (
              <p className="sf-header-search-panel__hint">Searching…</p>
            ) : null}

            {!pending && searched && hits.length === 0 ? (
              <div className="px-3 py-3.5 text-center">
                <p className="text-[0.8125rem] text-[var(--color-foreground)]">
                  No matches
                </p>
                <Link
                  href="/products"
                  onClick={close}
                  className="mt-1.5 inline-flex text-[0.7rem] font-semibold tracking-wide text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Browse products
                </Link>
              </div>
            ) : null}

            {hits.length > 0 ? (
              <ul id={listId} role="listbox" className="py-0.5">
                {hits.map((hit, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={hit.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        id={`${listId}-option-${index}`}
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
                          active
                            ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                            : "hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectHit(hit)}
                      >
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-background))]">
                          {hit.imageUrl ? (
                            <Image
                              src={hit.imageUrl}
                              alt=""
                              fill
                              className="object-contain p-0.5"
                              sizes="36px"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-medium leading-snug text-[var(--color-foreground)]">
                            {hit.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.625rem] text-[var(--color-muted)]">
                            {hit.categoryName ?? "Product"}
                            {hit.price != null
                              ? ` · ${formatMoney(hit.price, currency)}`
                              : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li className="border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={goToResults}
                    className="w-full px-3 py-2 text-center text-[0.7rem] font-semibold tracking-wide text-[var(--color-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_7%,transparent)]"
                  >
                    See all results
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

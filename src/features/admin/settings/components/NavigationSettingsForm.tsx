"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { saveNavigationSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import type { NavigationItemFormValues } from "@/features/admin/settings/schemas";
import type { AdminNavItemRow } from "@/features/admin/settings/update-navigation";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminCard,
  adminCardPadding,
  adminFieldGroup,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { cn } from "@/lib/cn";
import { DEFAULT_STOREFRONT_PATHS } from "@/features/seo/storefront-paths";

function createClientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `nav-${crypto.randomUUID()}`;
  }
  return `nav-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

const pageRowSchema = z.object({
  href: z.string().min(1),
  pageName: z.string().min(1),
  label: z.string().trim().min(1, "Menu name is required").max(80),
  showHeader: z.boolean(),
  showFooter: z.boolean(),
  headerId: z.string().uuid().nullable(),
  footerId: z.string().uuid().nullable(),
  sortOrder: z.number().int().min(0).max(10_000),
});

const menuPagesFormSchema = z.object({
  pages: z.array(pageRowSchema).min(1).max(40),
});

type MenuPagesFormValues = z.infer<typeof menuPagesFormSchema>;
type PageRow = z.infer<typeof pageRowSchema>;
type CatalogPage = { value: string; label: string };

function buildDefaults(
  rows: AdminNavItemRow[],
  catalog: CatalogPage[],
): MenuPagesFormValues {
  const headerByHref = new Map<string, AdminNavItemRow>();
  const footerByHref = new Map<string, AdminNavItemRow>();

  for (const row of rows) {
    if (row.parent_id) continue;
    if (row.location === "header") {
      if (!headerByHref.has(row.href)) headerByHref.set(row.href, row);
    } else if (row.location === "footer") {
      if (!footerByHref.has(row.href)) footerByHref.set(row.href, row);
    }
  }

  const pages: PageRow[] = catalog.map((page, index) => {
    const header = headerByHref.get(page.value);
    const footer = footerByHref.get(page.value);
    const label =
      header?.label?.trim() ||
      footer?.label?.trim() ||
      page.label;

    return {
      href: page.value,
      pageName: page.label,
      label,
      showHeader: Boolean(header?.is_active),
      showFooter: Boolean(footer?.is_active),
      headerId: header?.id ?? null,
      footerId: footer?.id ?? null,
      sortOrder: header?.sort_order ?? footer?.sort_order ?? index + 1,
    };
  });

  // Empty store: first half of catalog in header, paths with cmsSlug-like legal in footer heuristics via path
  if (rows.length === 0 && pages.length) {
    for (const page of pages) {
      const isLegal =
        page.href.includes("privacy") ||
        page.href.includes("terms") ||
        page.href.includes("disclaimer");
      const isCart = page.href === "/cart";
      page.showHeader = !isLegal && !isCart;
      page.showFooter = isLegal || page.href === "/contact" || page.href === "/career";
    }
  }

  return { pages };
}

function pagesToNavItems(
  pages: PageRow[],
  existingRows: AdminNavItemRow[],
  catalog: CatalogPage[],
): NavigationItemFormValues[] {
  const catalogHrefs = new Set(catalog.map((p) => p.value));
  const items: NavigationItemFormValues[] = [];

  // Remove nested / unknown catalog rows we no longer manage in this UI.
  for (const row of existingRows) {
    const inCatalog = catalogHrefs.has(row.href);
    const isRoot = !row.parent_id;
    if (!inCatalog || !isRoot) {
      items.push({
        id: row.id,
        clientKey: row.id,
        location: row.location,
        parentId: row.parent_id,
        parentClientKey: row.parent_id,
        label: row.label,
        href: row.href,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        openInNewTab: row.open_in_new_tab,
        _delete: true,
      });
    }
  }

  let headerOrder = 1;
  let footerOrder = 1;

  for (const page of pages) {
    if (page.showHeader) {
      items.push({
        id: page.headerId,
        clientKey: page.headerId ?? createClientKey(),
        location: "header",
        parentId: null,
        parentClientKey: null,
        label: page.label.trim(),
        href: page.href,
        sortOrder: headerOrder++,
        isActive: true,
        openInNewTab: false,
        _delete: false,
      });
    } else if (page.headerId) {
      items.push({
        id: page.headerId,
        clientKey: page.headerId,
        location: "header",
        parentId: null,
        parentClientKey: null,
        label: page.label.trim(),
        href: page.href,
        sortOrder: page.sortOrder,
        isActive: false,
        openInNewTab: false,
        _delete: true,
      });
    }

    if (page.showFooter) {
      items.push({
        id: page.footerId,
        clientKey: page.footerId ?? createClientKey(),
        location: "footer",
        parentId: null,
        parentClientKey: null,
        label: page.label.trim(),
        href: page.href,
        sortOrder: footerOrder++,
        isActive: true,
        openInNewTab: false,
        _delete: false,
      });
    } else if (page.footerId) {
      items.push({
        id: page.footerId,
        clientKey: page.footerId,
        location: "footer",
        parentId: null,
        parentClientKey: null,
        label: page.label.trim(),
        href: page.href,
        sortOrder: page.sortOrder,
        isActive: false,
        openInNewTab: false,
        _delete: true,
      });
    }
  }

  return items;
}

interface NavigationSettingsFormProps {
  initialItems: AdminNavItemRow[];
  canUpdate: boolean;
}

export function NavigationSettingsForm({
  initialItems,
  canUpdate,
}: NavigationSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const catalog = useMemo<CatalogPage[]>(() => {
    const byPath = new Map<string, CatalogPage>();
    for (const p of DEFAULT_STOREFRONT_PATHS) {
      if (p.path === "/cart") continue;
      byPath.set(p.path, { value: p.path, label: p.label || p.path });
    }
    for (const row of initialItems) {
      if (row.parent_id) continue;
      const href = row.href?.trim();
      if (!href?.startsWith("/") || href.startsWith("//")) continue;
      if (!byPath.has(href)) {
        byPath.set(href, {
          value: href,
          label: row.label?.trim() || href,
        });
      }
    }
    return [...byPath.values()];
  }, [initialItems]);

  const defaults = useMemo(
    () => buildDefaults(initialItems, catalog),
    [initialItems, catalog],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<MenuPagesFormValues>({
    resolver: zodResolver(menuPagesFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const pages = useWatch({ control, name: "pages" }) ?? defaults.pages;

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const items = pagesToNavItems(values.pages, initialItems, catalog);
      const result = await saveNavigationSettingsAction({ items });
      if (!result.ok) {
        const serverFieldErrors = resultFieldErrors(result);
        if (serverFieldErrors) {
          applyServerFieldErrors(setFieldError as never, serverFieldErrors);
          focusFirstFieldError({
            fieldErrors: serverFieldErrors,
            setFocus: setFocus as (name: string) => void,
          });
        }
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full"
      style={{ ...adminStackStyle, gap: "0.85rem" }}
    >
      <SettingsFormToolbar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={onSubmit}
        onCancel={() => {
          reset(defaults);
          setError(null);
          setSuccess(null);
        }}
      />

      <section className={cn(adminCard(), adminCardPadding())}>
        <div className={adminFieldGroup(true)}>
          <p className="admin-field-group__title">Store pages</p>
          <p className="admin-field-group__hint">
            Every store page is listed below. Edit the{" "}
            <strong>menu name</strong> shoppers see, then choose Top menu,
            Bottom menu, or both.
          </p>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)]">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_5.5rem_5.5rem] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)] sm:grid">
            <span>Page</span>
            <span>Menu name</span>
            <span className="text-center">Top</span>
            <span className="text-center">Bottom</span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
            {pages.map((page, index) => (
              <li
                key={page.href}
                className="grid grid-cols-1 gap-2.5 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_5.5rem_5.5rem] sm:items-center sm:gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {page.pageName}
                  </p>
                  <p className="truncate text-[11px] text-[var(--color-muted)]">
                    {page.href}
                  </p>
                </div>

                <Controller
                  name={`pages.${index}.label`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="min-w-0">
                      <TextField
                        {...field}
                        label="Menu name"
                        fullWidth
                        size="small"
                        required
                        disabled={!canUpdate || pending}
                        error={Boolean(fieldState.error)}
                        helperText={
                          fieldState.error
                            ? undefined
                            : "Shown in the menu (e.g. Products)"
                        }
                      />
                      <FieldError message={fieldState.error?.message} />
                    </div>
                  )}
                />

                <div className="flex items-center justify-between gap-2 sm:justify-center">
                  <span className="text-xs text-[var(--color-muted)] sm:hidden">
                    Top menu
                  </span>
                  <Controller
                    name={`pages.${index}.showHeader`}
                    control={control}
                    render={({ field }) => (
                      <AdminToggle
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                        disabled={!canUpdate || pending}
                        label="Top"
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-center">
                  <span className="text-xs text-[var(--color-muted)] sm:hidden">
                    Bottom menu
                  </span>
                  <Controller
                    name={`pages.${index}.showFooter`}
                    control={control}
                    render={({ field }) => (
                      <AdminToggle
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                        disabled={!canUpdate || pending}
                        label="Bottom"
                      />
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { saveNavigationSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  navigationSettingsSchema,
  type NavigationItemFormValues,
  type NavigationSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { AdminNavItemRow } from "@/features/admin/settings/update-navigation";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";

function createClientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `nav-${crypto.randomUUID()}`;
  }
  return `nav-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function rowsToFormItems(
  rows: AdminNavItemRow[],
): NavigationItemFormValues[] {
  return rows.map((row) => ({
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
    _delete: false,
  }));
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

  const defaults = useMemo(
    () => ({ items: rowsToFormItems(initialItems) }),
    [initialItems],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<NavigationSettingsFormValues>({
    resolver: zodResolver(navigationSettingsSchema),
    defaultValues: defaults,
  });

  const { fields, append, update } = useFieldArray({
    control,
    name: "items",
    keyName: "fieldId",
  });

  const items = useWatch({ control, name: "items" }) ?? [];

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveNavigationSettingsAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  function addItem(location: "header" | "footer") {
    const nextOrder =
      Math.max(
        0,
        ...items
          .filter((item) => !item._delete && item.location === location)
          .map((item) => item.sortOrder),
      ) + 1;
    append({
      id: null,
      clientKey: createClientKey(),
      location,
      parentId: null,
      parentClientKey: null,
      label: location === "header" ? "Shop" : "About us",
      href: location === "header" ? "/products" : "/about",
      sortOrder: nextOrder,
      isActive: true,
      openInNewTab: false,
      _delete: false,
    });
  }

  const visible = fields
    .map((field, index) => ({ field, index, item: items[index] }))
    .filter(({ item }) => item && !item._delete) as Array<{
    field: (typeof fields)[number];
    index: number;
    item: NavigationItemFormValues;
  }>;

  const headerItems = visible.filter(({ item }) => item.location === "header");
  const footerItems = visible.filter(({ item }) => item.location === "footer");

  const parentOptions = items.filter((item) => !item._delete && !item.parentId);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full"
      style={adminStackStyle}
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

      <p className="text-sm text-[var(--color-muted)]">
        These are the menu buttons shoppers click at the top and bottom of your
        store. Choose a page from the list — you do not need to type a web
        address.
      </p>

      <div className={adminCardsGrid()}>
        <NavSection
          title="Top menu (header)"
        hint="Links shown in the bar at the top of every page."
        emptyText="No top menu links yet."
        addLabel="+ Add top menu link"
        canUpdate={canUpdate}
        onAdd={() => addItem("header")}
        items={headerItems}
        renderItem={({ field, index, item }) => (
          <NavLinkCard
            key={field.fieldId}
            index={index}
            item={item}
            control={control}
            canUpdate={canUpdate}
            pending={pending}
            parentOptions={parentOptions}
            setValue={setValue}
            items={items}
            onDelete={() => update(index, { ...item, _delete: true })}
          />
        )}
        />

        <NavSection
          title="Bottom menu (footer)"
        hint="Links shown at the bottom of every page."
        emptyText="No bottom menu links yet."
        addLabel="+ Add bottom menu link"
        canUpdate={canUpdate}
        onAdd={() => addItem("footer")}
        items={footerItems}
        renderItem={({ field, index, item }) => (
          <NavLinkCard
            key={field.fieldId}
            index={index}
            item={item}
            control={control}
            canUpdate={canUpdate}
            pending={pending}
            parentOptions={parentOptions}
            setValue={setValue}
            items={items}
            onDelete={() => update(index, { ...item, _delete: true })}
          />
        )}
        />
      </div>
    </form>
  );
}

function NavSection({
  title,
  hint,
  emptyText,
  addLabel,
  canUpdate,
  onAdd,
  items,
  renderItem,
}: {
  title: string;
  hint: string;
  emptyText: string;
  addLabel: string;
  canUpdate: boolean;
  onAdd: () => void;
  items: Array<{
    field: { fieldId: string };
    index: number;
    item: NavigationItemFormValues;
  }>;
  renderItem: (entry: {
    field: { fieldId: string };
    index: number;
    item: NavigationItemFormValues;
  }) => ReactNode;
}) {
  return (
    <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="admin-field-group__title">{title}</p>
          <p className="admin-field-group__hint mt-1">{hint}</p>
        </div>
        <button
          type="button"
          className={adminBtn("outline")}
          disabled={!canUpdate}
          onClick={onAdd}
        >
          {addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map(renderItem)}
        </div>
      )}
    </section>
  );
}

function NavLinkCard({
  index,
  item,
  control,
  canUpdate,
  pending,
  parentOptions,
  setValue,
  items,
  onDelete,
}: {
  index: number;
  item: NavigationItemFormValues;
  control: ReturnType<typeof useForm<NavigationSettingsFormValues>>["control"];
  canUpdate: boolean;
  pending: boolean;
  parentOptions: NavigationItemFormValues[];
  setValue: ReturnType<typeof useForm<NavigationSettingsFormValues>>["setValue"];
  items: NavigationItemFormValues[];
  onDelete: () => void;
}) {
  const label = item.label?.trim() || "Menu link";
  const pageName = pageOptionLabel(item.href || "/");

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {label}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Opens {pageName}
            {!item.isActive ? " · Hidden" : ""}
          </p>
        </div>
        <button
          type="button"
          className={adminBtn("danger")}
          disabled={!canUpdate || pending}
          onClick={onDelete}
        >
          Remove
        </button>
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <div className={adminFieldsGrid(2)}>
          <Controller
            name={`items.${index}.label`}
            control={control}
            render={({ field: f, fieldState }) => (
              <TextField
                {...f}
                label="Button text"
                fullWidth
                required
                disabled={!canUpdate || pending}
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ?? "Example: Products, About, Contact"
                }
              />
            )}
          />
          <Controller
            name={`items.${index}.href`}
            control={control}
            render={({ field: f, fieldState }) => (
              <StorePageLinkField
                label="Goes to this page"
                value={f.value}
                fallback="/"
                disabled={!canUpdate || pending}
                error={Boolean(fieldState.error)}
                onChange={f.onChange}
                helperText={
                  fieldState.error?.message ??
                  "Pick a store page from the list"
                }
              />
            )}
          />
          <Controller
            name={`items.${index}.location`}
            control={control}
            render={({ field: f }) => (
              <TextField
                {...f}
                select
                label="Menu location"
                fullWidth
                required
                disabled={!canUpdate || pending}
                helperText="Move between top and bottom menu"
                value={f.value === "header" || f.value === "footer" ? f.value : "header"}
              >
                <MenuItem value="header">Top of the store (header)</MenuItem>
                <MenuItem value="footer">Bottom of the store (footer)</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name={`items.${index}.sortOrder`}
            control={control}
            render={({ field: f }) => (
              <TextField
                {...f}
                type="number"
                label="Order in the menu"
                fullWidth
                disabled={!canUpdate || pending}
                helperText="1 shows first, then 2, 3…"
                onChange={(event) =>
                  f.onChange(Number(event.target.value) || 0)
                }
              />
            )}
          />
        </div>

        <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">
            More options
          </summary>
          <div className="mt-3" style={adminStackStyle}>
            <TextField
              select
              label="Nest under another link (optional)"
              fullWidth
              disabled={!canUpdate || pending}
              value={item.parentClientKey ?? ""}
              helperText="Leave as None for a normal top-level menu item"
              onChange={(event) => {
                const value = event.target.value || null;
                const parent = items.find(
                  (candidate) => candidate.clientKey === value,
                );
                setValue(`items.${index}.parentClientKey`, value, {
                  shouldDirty: true,
                });
                setValue(`items.${index}.parentId`, parent?.id ?? null, {
                  shouldDirty: true,
                });
              }}
            >
              <MenuItem value="">None (main menu item)</MenuItem>
              {parentOptions
                .filter(
                  (parent) =>
                    parent.clientKey !== item.clientKey &&
                    parent.location === item.location,
                )
                .map((parent) => (
                  <MenuItem key={parent.clientKey} value={parent.clientKey}>
                    {parent.label}
                  </MenuItem>
                ))}
            </TextField>
            <div className="flex flex-wrap items-center gap-4">
              <Controller
                name={`items.${index}.isActive`}
                control={control}
                render={({ field: f }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={f.value}
                        onChange={(_, checked) => f.onChange(checked)}
                        disabled={!canUpdate || pending}
                      />
                    }
                    label="Show this link on the store"
                  />
                )}
              />
              <Controller
                name={`items.${index}.openInNewTab`}
                control={control}
                render={({ field: f }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={f.value}
                        onChange={(_, checked) => f.onChange(checked)}
                        disabled={!canUpdate || pending}
                      />
                    }
                    label="Open in a new browser tab"
                  />
                )}
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

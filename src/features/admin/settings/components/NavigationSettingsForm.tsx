"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { saveNavigationSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  navigationSettingsSchema,
  type NavigationItemFormValues,
  type NavigationSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { AdminNavItemRow } from "@/features/admin/settings/update-navigation";

function createClientKey() {
  return `nav-${Math.random().toString(36).slice(2, 10)}`;
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
      label: "New link",
      href: "/",
      sortOrder: nextOrder,
      isActive: true,
      openInNewTab: false,
      _delete: false,
    });
  }

  const visibleFields = fields
    .map((field, index) => ({ field, index }))
    .filter(({ index }) => !items[index]?._delete);

  const parentOptions = items.filter((item) => !item._delete && !item.parentId);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outlined"
          disabled={!canUpdate}
          onClick={() => addItem("header")}
        >
          Add header link
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={!canUpdate}
          onClick={() => addItem("footer")}
        >
          Add footer link
        </Button>
      </div>

      <div className="space-y-4">
        {visibleFields.map(({ field, index }) => {
          const item = items[index];
          if (!item) return null;
          return (
            <div
              key={field.fieldId}
              className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2"
            >
              <Controller
                name={`items.${index}.label`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    label="Label"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name={`items.${index}.href`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    label="URL"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
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
                    label="Location"
                    fullWidth
                    disabled={!canUpdate}
                  >
                    <MenuItem value="header">Header</MenuItem>
                    <MenuItem value="footer">Footer</MenuItem>
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
                    label="Sort order"
                    fullWidth
                    disabled={!canUpdate}
                    onChange={(event) =>
                      f.onChange(Number(event.target.value) || 0)
                    }
                  />
                )}
              />
              <TextField
                    select
                    label="Parent"
                    fullWidth
                    disabled={!canUpdate}
                    value={item.parentClientKey ?? ""}
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
                    <MenuItem value="">None (top level)</MenuItem>
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
              <div className="flex flex-wrap items-center gap-3">
                <Controller
                  name={`items.${index}.isActive`}
                  control={control}
                  render={({ field: f }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={f.value}
                          onChange={(_, checked) => f.onChange(checked)}
                          disabled={!canUpdate}
                        />
                      }
                      label="Active"
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
                          disabled={!canUpdate}
                        />
                      }
                      label="New tab"
                    />
                  )}
                />
                <Button
                  type="button"
                  color="error"
                  disabled={!canUpdate}
                  onClick={() =>
                    update(index, { ...item, _delete: true })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
}

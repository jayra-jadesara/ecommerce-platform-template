"use client";

import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createSizeOptionAction,
  deleteSizeOptionsAction,
  seedDefaultSizeOptionsAction,
  updateSizeOptionAction,
} from "@/features/catalog/actions";
import type { SizeOptionRow } from "@/features/catalog/size-options-service";
import { AdminFormDialog } from "@/features/admin/ui/AdminFormDialog";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

interface SizeOptionsManagerProps {
  initialSizes: SizeOptionRow[];
  canUpdate: boolean;
  canDelete: boolean;
}

type DialogMode = "create" | "edit";
type StatusFilter = "all" | "active" | "off";

type FormState = {
  label: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  label: "",
  isActive: true,
};

const STATUS_CHIPS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "off", label: "Off" },
];

export function SizeOptionsManager({
  initialSizes,
  canUpdate,
  canDelete,
}: SizeOptionsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(initialSizes.map((row) => row.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [initialSizes]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2200);
    return () => window.clearTimeout(timer);
  }, [success]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialSizes.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "off" && row.is_active) return false;
      if (q && !row.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [initialSizes, search, statusFilter]);

  const allSelected =
    filtered.length > 0 && filtered.every((row) => selected.has(row.id));
  const someSelected =
    filtered.some((row) => selected.has(row.id)) && !allSelected;

  const deleteLabels = useMemo(() => {
    if (!deleteIds?.length) return [];
    const map = new Map(initialSizes.map((row) => [row.id, row.label]));
    return deleteIds.map((id) => map.get(id) ?? "size");
  }, [deleteIds, initialSizes]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setDialogMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(row: SizeOptionRow) {
    setDialogMode("edit");
    setEditingId(row.id);
    setForm({
      label: row.label,
      isActive: row.is_active,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setDialogOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  function submitDialog() {
    const label = form.label.trim();
    if (!label) {
      setFormError("Size / pack is required.");
      return;
    }
    setFormError(null);
    setError(null);
    startTransition(async () => {
      const payload = {
        label,
        isActive: form.isActive,
      };
      const result =
        dialogMode === "edit" && editingId
          ? await updateSizeOptionAction(editingId, payload)
          : await createSizeOptionAction(payload);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setDialogOpen(false);
      setEditingId(null);
      setSuccess(dialogMode === "edit" ? "Saved" : "Added");
      refresh();
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const row of filtered) next.delete(row.id);
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of filtered) next.add(row.id);
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert severity="error" className="!py-1.5 text-sm">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" className="!py-1.5 text-sm">
          {success}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              disabled={pending}
              onClick={() => setStatusFilter(chip.value)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                  : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Size label"
          value={search}
          disabled={pending}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            input: {
              endAdornment: hasActiveFilters ? (
                <InputAdornment position="end">
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="Clear filters"
                    disabled={pending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                    sx={{
                      color: "var(--color-muted)",
                      "&:hover": { color: "var(--color-foreground)" },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <AdminSelect
          label="Status"
          value={statusFilter}
          disabled={pending}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "off", label: "Off" },
          ]}
          onChange={(next) => setStatusFilter(next as StatusFilter)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {filtered.length === 0 ? (
            <>0 sizes</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {initialSizes.length}
              </span>{" "}
              sizes
              {selected.size > 0 ? (
                <>
                  <span className="mx-2 text-[var(--color-muted)]">|</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {selected.size}
                  </span>{" "}
                  selected
                </>
              ) : null}
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {canDelete && selected.size > 0 ? (
            <button
              type="button"
              className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
              disabled={pending}
              onClick={() => setDeleteIds([...selected])}
            >
              Delete selected ({selected.size})
            </button>
          ) : null}
          {canUpdate && initialSizes.length === 0 ? (
            <button
              type="button"
              className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await seedDefaultSizeOptionsAction();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setSuccess(result.message);
                  refresh();
                });
              }}
            >
              Load common sizes
            </button>
          ) : null}
          {canUpdate ? (
            <button
              type="button"
              className={cn(adminBtn("primary"), "!min-h-9 !px-3 !text-xs")}
              disabled={pending}
              onClick={openCreate}
            >
              Add size
            </button>
          ) : null}
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">
            {initialSizes.length === 0 ? "No sizes yet" : "No matching sizes"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {initialSizes.length === 0
              ? canUpdate
                ? "Add a size, or load common sizes to get started."
                : "Ask an admin to add size / pack options."
              : "Try another search or clear filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((row) => {
              const isSelected = selected.has(row.id);
              return (
                <article
                  key={row.id}
                  className={cn(
                    adminCard(),
                    "flex items-start gap-3 p-3",
                    isSelected &&
                      "ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]",
                  )}
                >
                  {canDelete ? (
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      disabled={pending}
                      onChange={() => toggleOne(row.id)}
                      slotProps={{
                        input: { "aria-label": `Select ${row.label}` },
                      }}
                      sx={{ p: 0.25, mt: 0.25 }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {row.label}
                    </p>
                    <div className="mt-1.5">
                      <AdminStatusBadge
                        tone={row.is_active ? "success" : "neutral"}
                      >
                        {row.is_active ? "Active" : "Off"}
                      </AdminStatusBadge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {canUpdate ? (
                      <IconButton
                        size="small"
                        disabled={pending}
                        aria-label={`Edit ${row.label}`}
                        onClick={() => openEdit(row)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {canDelete ? (
                      <IconButton
                        size="small"
                        color="error"
                        disabled={pending}
                        aria-label={`Remove ${row.label}`}
                        onClick={() => setDeleteIds([row.id])}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className={cn(adminCard(), "hidden overflow-x-auto md:block")}>
            <table className="min-w-full table-fixed text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={someSelected}
                      disabled={!canDelete || pending}
                      onChange={toggleAll}
                      slotProps={{
                        input: { "aria-label": "Select all sizes" },
                      }}
                      sx={{ p: 0.25 }}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="w-36 px-4 py-3 font-medium">Status</th>
                  <th className="w-40 px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSelected = selected.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]",
                        isSelected &&
                          "bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          disabled={!canDelete || pending}
                          onChange={() => toggleOne(row.id)}
                          slotProps={{
                            input: { "aria-label": `Select ${row.label}` },
                          }}
                          sx={{ p: 0.25 }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--color-foreground)]">
                          {row.label}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge
                          tone={row.is_active ? "success" : "neutral"}
                        >
                          {row.is_active ? "Active" : "Off"}
                        </AdminStatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {canUpdate ? (
                            <button
                              type="button"
                              className={cn(
                                adminBtn("outline"),
                                "!min-h-9 !px-3 !text-xs",
                              )}
                              disabled={pending}
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className={cn(
                                adminBtn("ghost"),
                                "!min-h-9 !px-2.5 !text-xs text-[var(--color-error)]",
                              )}
                              disabled={pending}
                              onClick={() => setDeleteIds([row.id])}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdminFormDialog
        open={dialogOpen}
        title={dialogMode === "edit" ? "Edit size" : "Add size"}
        description="Appears in the product Size / pack dropdown."
        maxWidth="xs"
        dense
        pending={pending}
        error={formError}
        confirmLabel={dialogMode === "edit" ? "Save" : "Add"}
        pendingLabel={dialogMode === "edit" ? "Saving…" : "Adding…"}
        onClose={closeDialog}
        onConfirm={submitDialog}
      >
        <div className="grid gap-2">
          <TextField
            size="small"
            label="Label"
            placeholder="e.g. 50gm, Pack of 2"
            value={form.label}
            autoFocus
            fullWidth
            required
            disabled={pending}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, label: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitDialog();
              }
            }}
          />
          <AdminToggle
            checked={form.isActive}
            disabled={pending}
            label="Active in dropdown"
            onChange={(checked) =>
              setForm((prev) => ({ ...prev, isActive: checked }))
            }
          />
        </div>
      </AdminFormDialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteIds?.length)}
        title={
          deleteIds && deleteIds.length > 1
            ? `Delete ${deleteIds.length} sizes?`
            : "Delete size?"
        }
        message={
          deleteIds && deleteIds.length > 1
            ? `Remove ${deleteIds.length} sizes from the list? Products already using them keep their text.`
            : `Remove “${deleteLabels[0] ?? "this size"}”? Products already using it keep their text.`
        }
        confirmLabel={
          deleteIds && deleteIds.length > 1 ? "Delete all" : "Delete"
        }
        pending={pending}
        onClose={() => {
          if (!pending) setDeleteIds(null);
        }}
        onConfirm={() => {
          if (!deleteIds?.length) return;
          const ids = deleteIds;
          setError(null);
          startTransition(async () => {
            const result = await deleteSizeOptionsAction(ids);
            if (!result.ok) {
              setError(result.error);
              setDeleteIds(null);
              return;
            }
            setSelected(new Set());
            setDeleteIds(null);
            setSuccess(result.message);
            refresh();
          });
        }}
      />
    </div>
  );
}

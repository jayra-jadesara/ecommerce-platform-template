"use client";

import TextField from "@mui/material/TextField";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import {
  createCustomRoleAction,
  deleteCustomRoleAction,
  updateCustomRoleAction,
} from "@/features/admin/team/actions";
import {
  RoleMenuAccessEditor,
  emptyPermissionSelection,
} from "@/features/admin/team/components/RoleMenuAccessEditor";
import {
  MENU_ACCESS_LEVEL_LABEL,
  countSelectionByLevel,
  menuAccessEditorRows,
  permissionsFromSelection,
  rowSelectionSummary,
  selectionFromPermissions,
  type MenuAccessLevel,
} from "@/features/admin/team/role-menu-access";
import type { CustomRoleDefinition } from "@/features/admin/team/types";
import { AdminFormDialog } from "@/features/admin/ui/AdminFormDialog";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import type { Permission } from "@/features/auth/permissions";
import { cn } from "@/lib/cn";

type DialogTab = "list" | "form";

type AdminCreateRoleDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (role: CustomRoleDefinition) => void;
  onDeleted?: (roleId: string) => void;
  /** Current store custom roles (for the Roles list tab). */
  roles?: CustomRoleDefinition[];
  /** When set, dialog opens on the edit form for this role. */
  editing?: CustomRoleDefinition | null;
  /** Which tab to show when the dialog opens. */
  initialTab?: DialogTab;
  /** Inline panel on Team & roles page (no modal). */
  variant?: "dialog" | "inline";
};

function levelBadgeTone(
  level: MenuAccessLevel,
): "success" | "info" | "neutral" {
  if (level === "full") return "success";
  if (level === "read") return "info";
  return "neutral";
}

function RoleAccessDetail({ permissions }: { permissions: Permission[] }) {
  const selected = useMemo(
    () => selectionFromPermissions(permissions),
    [permissions],
  );
  const rows = useMemo(() => {
    return menuAccessEditorRows()
      .map((row) => ({
        row,
        summary: rowSelectionSummary(selected, row),
      }))
      .filter((item) => item.summary.level !== "hidden");
  }, [selected]);

  if (!rows.length) {
    return (
      <p className="px-3 py-2 text-[12px] text-[var(--color-muted)]">
        No page access granted.
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full table-fixed text-left text-[12px]">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[42%]" />
        </colgroup>
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">Page</th>
            <th className="px-3 py-2 font-medium">Section</th>
            <th className="px-3 py-2 font-medium">Access</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ row, summary }) => (
            <tr
              key={row.id}
              className="border-b border-[var(--color-border)] last:border-0"
            >
              <td className="px-3 py-2 align-top font-medium text-[var(--color-foreground)]">
                <span className="line-clamp-2">{row.label}</span>
                {row.menus.length > 1 ? (
                  <span className="mt-0.5 block text-[10px] font-normal text-[var(--color-muted)]">
                    {row.menus.join(", ")}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top text-[var(--color-muted)]">
                {row.sectionLabel}
              </td>
              <td className="px-3 py-2 align-top">
                <AdminStatusBadge
                  tone={levelBadgeTone(summary.level)}
                  className="!px-1.5 !py-0 !text-[10px]"
                >
                  {MENU_ACCESS_LEVEL_LABEL[summary.level]}
                </AdminStatusBadge>
              </td>
              <td className="px-3 py-2 align-top text-[var(--color-foreground)]">
                {summary.actionLabels.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Super Admin dialog: list built-in + custom roles and edit page access.
 */
export function AdminCreateRoleDialog({
  open,
  onClose,
  onSaved,
  onDeleted,
  roles = [],
  editing = null,
  initialTab = "list",
  variant = "dialog",
}: AdminCreateRoleDialogProps) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<DialogTab>(initialTab);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<Permission>>(
    () => emptyPermissionSelection(),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeEdit, setActiveEdit] = useState<CustomRoleDefinition | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isEdit = Boolean(activeEdit);
  const isSystemEdit = Boolean(activeEdit?.isSystem);
  const counts = useMemo(() => countSelectionByLevel(selected), [selected]);
  const openMenus = counts.full + counts.read;
  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (Boolean(a.isSystem) !== Boolean(b.isSystem)) {
          return a.isSystem ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }),
    [roles],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    setExpandedId(null);
    if (editing) {
      setActiveEdit(editing);
      setTab("form");
      setName(editing.name);
      setDescription(editing.description ?? "");
      setSelected(selectionFromPermissions(editing.permissions));
    } else {
      setActiveEdit(null);
      setTab(initialTab);
      setName("");
      setDescription("");
      setSelected(emptyPermissionSelection());
    }
  }, [open, editing, initialTab]);

  function openCreateForm() {
    setActiveEdit(null);
    setName("");
    setDescription("");
    setSelected(emptyPermissionSelection());
    setConfirmDelete(false);
    setError(null);
    setTab("form");
  }

  function openEditForm(role: CustomRoleDefinition) {
    setActiveEdit(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setSelected(selectionFromPermissions(role.permissions));
    setConfirmDelete(false);
    setError(null);
    setTab("form");
  }

  function handleConfirm() {
    if (tab !== "form") return;
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a role name.");
      return;
    }
    if (!isSystemEdit) {
      const nameTaken = roles.some(
        (role) =>
          role.id !== activeEdit?.id &&
          role.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (nameTaken) {
        setError(
          `A role named “${trimmed}” already exists. Choose a different name.`,
        );
        return;
      }
    }
    const permissions = permissionsFromSelection(selected);
    if (!permissions.length) {
      setError("Turn on at least one page action (e.g. View).");
      return;
    }

    startTransition(async () => {
      const result = activeEdit
        ? await updateCustomRoleAction({
            roleId: activeEdit.id,
            name: trimmed,
            description,
            permissions,
          })
        : await createCustomRoleAction({
            name: trimmed,
            description,
            permissions,
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.role) {
        onSaved(result.role);
        setExpandedId(result.role.id);
      }
      setActiveEdit(null);
      setName("");
      setDescription("");
      setSelected(emptyPermissionSelection());
      setTab("list");
    });
  }

  function handleDelete() {
    if (!activeEdit || activeEdit.isSystem) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteCustomRoleAction(activeEdit.id);
      if (!result.ok) {
        setError(result.error);
        setConfirmDelete(false);
        return;
      }
      onDeleted?.(activeEdit.id);
      setActiveEdit(null);
      setConfirmDelete(false);
      setTab("list");
    });
  }

  const onListTab = tab === "list";
  const isInline = variant === "inline";

  function dismissDialog() {
    if (pending) return;
    onClose();
  }

  const body = (
      <div className="space-y-3">
        <div className="flex gap-1 rounded-xl bg-[var(--color-surface)] p-1 ring-1 ring-[var(--color-border)]">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setTab("list");
            }}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
              onListTab
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            Roles
            <span className="ml-1 tabular-nums text-[var(--color-muted)]">
              ({sortedRoles.length})
            </span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!activeEdit) openCreateForm();
              else setTab("form");
            }}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
              !onListTab
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {isEdit ? "Edit role" : "Create"}
          </button>
        </div>

        {/* Fixed panel height so Roles / Create keep the same popup size */}
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]",
            isInline ? "min-h-[28rem]" : "h-[min(32rem,58vh)]",
          )}
        >          {onListTab ? (
            sortedRoles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <p className="text-[14px] font-semibold text-[var(--color-foreground)]">
                  No roles loaded
                </p>
                <p className="mt-1 max-w-sm text-[12px] text-[var(--color-muted)]">
                  Built-in roles should appear here. You can still create a
                  custom role for this store.
                </p>
                <button
                  type="button"
                  className={cn(adminBtn("primary"), "mt-4 !min-h-9")}
                  disabled={pending}
                  onClick={openCreateForm}
                >
                  New custom role
                </button>
              </div>
            ) : (
              <div className="h-full overflow-auto [scrollbar-gutter:stable]">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[32%]" />
                    <col className="hidden w-[14%] sm:table-column" />
                    <col className="w-[28%]" />
                    <col className="w-[26%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-[1] border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Role</th>
                      <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                        Pages
                      </th>
                      <th className="px-3 py-2.5 font-medium">Access</th>
                      <th className="px-3 py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRoles.map((role) => {
                      const sel = selectionFromPermissions(role.permissions);
                      const levelCounts = countSelectionByLevel(sel);
                      const visible = levelCounts.full + levelCounts.read;
                      const expanded = expandedId === role.id;
                      return (
                        <Fragment key={role.id}>
                          <tr className="border-b border-[var(--color-border)] hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]">
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <p className="truncate font-semibold text-[var(--color-foreground)]">
                                  {role.name}
                                </p>
                                {role.isSystem ? (
                                  <span className="shrink-0 rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                                    Built-in
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[var(--color-primary)]">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {role.description ? (
                                <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">
                                  {role.description}
                                </p>
                              ) : null}
                            </td>
                            <td className="hidden px-3 py-2.5 align-middle text-[12px] tabular-nums text-[var(--color-muted)] sm:table-cell">
                              {visible} open
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex flex-nowrap gap-1">
                                <span className="shrink-0 rounded-md bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary)]">
                                  {levelCounts.full} full
                                </span>
                                <span className="shrink-0 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-foreground)] ring-1 ring-[var(--color-border)]">
                                  {levelCounts.read} read
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex flex-nowrap items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={pending}
                                  aria-expanded={expanded}
                                  onClick={() =>
                                    setExpandedId(expanded ? null : role.id)
                                  }
                                  className={cn(
                                    adminBtn("ghost"),
                                    "!min-h-7 !w-[4.25rem] shrink-0 !px-0 !text-[11px]",
                                  )}
                                >
                                  {expanded ? "Hide" : "Details"}
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => openEditForm(role)}
                                  className={cn(
                                    adminBtn("outline"),
                                    "!min-h-7 shrink-0 !px-2 !text-[11px]",
                                  )}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                              <td colSpan={4} className="p-0">
                                <div className="min-w-0 border-t border-[var(--color-border)]">
                                  <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                                    Page rights
                                  </p>
                                  <RoleAccessDetail
                                    permissions={role.permissions}
                                  />
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="h-full space-y-3 overflow-y-auto p-3">
              <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <TextField
                  label="Role name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={pending || isSystemEdit}
                  required
                  fullWidth
                  size="small"
                  autoFocus={!isSystemEdit}
                  placeholder="e.g. Warehouse"
                  helperText={
                    isSystemEdit
                      ? "Built-in role name stays fixed — edit page access below."
                      : undefined
                  }
                />
                <TextField
                  label="Short description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={pending || isSystemEdit}
                  fullWidth
                  size="small"
                  placeholder="Optional — shown when assigning"
                />
              </div>

              <RoleMenuAccessEditor
                value={selected}
                onChange={setSelected}
                disabled={pending}
              />

              <p className="text-[11px] text-[var(--color-muted)]">
                {openMenus === 0
                  ? "No pages open yet — tap View (or All) on at least one row."
                  : `${openMenus} page group${openMenus === 1 ? "" : "s"} visible · ${counts.full} can edit · ${counts.read} view only · ${selected.size} permission${selected.size === 1 ? "" : "s"}`}
              </p>

              {isEdit && !isSystemEdit ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2">
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Delete only after staff are moved off this custom role.
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handleDelete}
                    className={cn(
                      adminBtn("ghost"),
                      "!min-h-8 !px-2.5 text-[12px] text-red-700 hover:bg-red-50",
                    )}
                  >
                    {confirmDelete ? "Confirm delete" : "Delete role"}
                  </button>
                </div>
              ) : null}
              {isSystemEdit ? (
                <p className="border-t border-[var(--color-border)] pt-2 text-[11px] text-[var(--color-muted)]">
                  Built-in roles cannot be deleted. Saving updates page access
                  for everyone assigned this role.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
  );

  if (isInline) {
    if (!open) return null;
    return (
      <section className={cn("space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4")}>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            Roles
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            Edit built-in or custom roles and page-level access for staff. Super
            Admin stays fixed.
          </p>
        </div>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
            {error}
          </p>
        ) : null}
        {body}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-3">
          {!onListTab ? (
            <button
              type="button"
              disabled={pending}
              className={cn(adminBtn("outline"), "!min-h-9")}
              onClick={() => {
                setError(null);
                setConfirmDelete(false);
                setTab("list");
              }}
            >
              Back to list
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            className={cn(adminBtn("primary"), "!min-h-9")}
            onClick={onListTab ? openCreateForm : handleConfirm}
          >
            {pending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : onListTab
                ? "New custom role"
                : isEdit
                  ? "Save role"
                  : "Create role"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <AdminFormDialog
      open={open}
      showCloseIcon
      onDismiss={dismissDialog}
      onClose={
        pending
          ? () => undefined
          : onListTab
            ? dismissDialog
            : () => {
                setError(null);
                setConfirmDelete(false);
                setTab("list");
              }
      }
      onConfirm={onListTab ? openCreateForm : handleConfirm}
      title="Roles"
      description="Edit built-in or custom roles and page-level access for staff. Super Admin stays fixed."
      maxWidth="lg"
      dense
      pending={pending}
      error={error}
      cancelLabel={onListTab ? "Close" : "Back to list"}
      confirmLabel={
        onListTab ? "New custom role" : isEdit ? "Save role" : "Create role"
      }
      pendingLabel={isEdit ? "Saving…" : "Creating…"}
    >
      {body}
    </AdminFormDialog>
  );
}

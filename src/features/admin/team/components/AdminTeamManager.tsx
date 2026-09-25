"use client";

import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addAdminByEmailAction,
  createAdminStaffAction,
  removeAdminStaffAction,
  setAdminActiveAction,
  updateAdminRolesAction,
} from "@/features/admin/team/actions";
import { AdminCreateRoleDialog } from "@/features/admin/team/components/AdminCreateRoleDialog";
import { AdminRoleSummary } from "@/features/admin/team/components/AdminRoleSummary";
import { TeamMemberRowActions } from "@/features/admin/team/components/TeamMemberRowActions";
import type {
  CustomRoleDefinition,
  LinkableStoreAccount,
  TeamMember,
} from "@/features/admin/team/types";
import {
  buildStaffRoleOptions,
} from "@/features/admin/team/types";
import { getAdminPath } from "@/config/admin-route";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { authEmailSchema } from "@/features/auth/validations";
import { AdminFormDialog } from "@/features/admin/ui/AdminFormDialog";
import { AdminAutocomplete } from "@/features/admin/ui/AdminAutocomplete";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format-date";
import {
  isSystemAdminRoleCode,
  type AdminRoleCode,
} from "@/types/database";


const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All access" },
  { value: "ACTIVE", label: "Can open admin" },
  { value: "INACTIVE", label: "Admin blocked" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];
type RoleFilter = AdminRoleCode | "ALL";
type AddMode = "existing" | "create";
type AddStep = "account" | "role";

const SYSTEM_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
  MARKETING: "Marketing",
  ORDER_MANAGER: "Order Manager",
  SUPPORT: "Support",
  READER: "Read",
};

function primaryRole(roles: AdminRoleCode[]): AdminRoleCode {
  for (const code of [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR",
    "MARKETING",
    "ORDER_MANAGER",
    "SUPPORT",
    "READER",
  ] as const) {
    if (roles.includes(code)) return code;
  }
  return roles[0] ?? "EDITOR";
}

function buildPageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export function AdminTeamManager({
  initialMembers,
  total,
  page,
  pageSize,
  initialSearch,
  initialStatus,
  initialRole,
  linkableAccounts = [],
  customRoles: customRolesProp = [],
  currentUserId,
  canManage,
  canViewActivity,
  allowSuperAdminAssign,
  canCreateRoles = false,
  canImpersonate = false,
  isImpersonating = false,
  initialStaffViewError = null,
  section = "staff",
}: {
  initialMembers: TeamMember[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch: string;
  initialStatus: StatusFilter;
  initialRole: RoleFilter;
  /** Store shoppers not yet on the team — for “Existing account” dropdown. */
  linkableAccounts?: LinkableStoreAccount[];
  customRoles?: CustomRoleDefinition[];
  currentUserId: string;
  canManage: boolean;
  canViewActivity: boolean;
  allowSuperAdminAssign: boolean;
  /** Super Admin (not impersonating) may create/edit custom roles. */
  canCreateRoles?: boolean;
  canImpersonate?: boolean;
  isImpersonating?: boolean;
  /** From /view-as redirect when staff view could not start. */
  initialStaffViewError?: string | null;
  /** Staff list vs roles manager (Team & roles page tabs). */
  section?: "staff" | "roles";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(initialRole);
  const [error, setError] = useState<string | null>(initialStaffViewError);
  const [success, setSuccess] = useState<string | null>(null);
  const [customRoles, setCustomRoles] =
    useState<CustomRoleDefinition[]>(customRolesProp);
  const [customRolesSyncKey, setCustomRolesSyncKey] = useState(customRolesProp);
  if (customRolesProp !== customRolesSyncKey) {
    setCustomRolesSyncKey(customRolesProp);
    setCustomRoles(customRolesProp);
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>("account");
  const [addMode, setAddMode] = useState<AddMode>("existing");
  const [addEmail, setAddEmail] = useState("");
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [addEmailError, setAddEmailError] = useState<string | null>(null);
  const [addPassword, setAddPassword] = useState("");
  const [addConfirmPassword, setAddConfirmPassword] = useState("");
  const [addPasswordError, setAddPasswordError] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<AdminRoleCode>("EDITOR");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<AdminRoleCode>("EDITOR");

  const [editingCustomRole, setEditingCustomRole] =
    useState<CustomRoleDefinition | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  const roleOptions = useMemo(
    () => buildStaffRoleOptions(customRoles),
    [customRoles],
  );

  function roleLabel(code: AdminRoleCode): string {
    return (
      roleOptions.find((option) => option.value === code)?.label ??
      SYSTEM_ROLE_LABEL[code] ??
      code
    );
  }

  const roleSelectOptions = useMemo(
    () => [
      { value: "ALL", label: "All roles" },
      ...roleOptions.map((option) => ({
        value: option.value,
        label: option.isSystem ? option.label : `${option.label} (Custom)`,
      })),
    ],
    [roleOptions],
  );

  const linkableOptions = useMemo(
    () =>
      linkableAccounts.map((account) => ({
        value: account.email,
        label: account.name
          ? `${account.name} — ${account.email}`
          : account.email,
      })),
    [linkableAccounts],
  );

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    status !== "ALL" ||
    roleFilter !== "ALL";

  function applyFilters(options?: {
    page?: number;
    status?: StatusFilter;
    role?: RoleFilter;
    search?: string;
    pageSize?: number;
  }) {
    const nextPage = options?.page ?? 1;
    const nextStatus = options?.status ?? status;
    const nextRole = options?.role ?? roleFilter;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextRole && nextRole !== "ALL") params.set("role", nextRole);
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));

    startTransition(() => {
      router.push(`${getAdminPath("/team")}?${params.toString()}`);
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setRoleFilter("ALL");
    applyFilters({
      search: "",
      status: "ALL",
      role: "ALL",
    });
  }

  function refresh() {
    router.refresh();
  }

  function resetAddForm() {
    setAddStep("account");
    setAddMode(linkableAccounts.length ? "existing" : "create");
    setAddEmail("");
    setAddEmailError(null);
    setAddPassword("");
    setAddConfirmPassword("");
    setAddPasswordError(null);
    setAddRole("EDITOR");
    setCreatedPassword(null);
    setCopied(false);
  }

  function validateAddEmail(value: string): string | null {
    const result = authEmailSchema.safeParse(value);
    return result.success
      ? null
      : (result.error.issues[0]?.message ?? "Enter a valid email address");
  }

  /** Returns true when account fields are valid. */
  function validateAccountFields(): boolean {
    setError(null);
    setAddEmailError(null);
    setAddPasswordError(null);

    if (addMode === "existing") {
      if (!addEmail) {
        setAddEmailError("Select a store account email.");
        return false;
      }
      return true;
    }

    const emailError = validateAddEmail(addEmail);
    if (emailError) {
      setAddEmailError(emailError);
      return false;
    }
    if (addPassword.length < 8) {
      setAddPasswordError("Password must be at least 8 characters.");
      return false;
    }
    if (addPassword !== addConfirmPassword) {
      // Shown under Confirm password — keep Temporary password free of this message.
      return false;
    }
    return true;
  }

  function switchAddMode(next: AddMode) {
    setAddMode(next);
    setError(null);
    setAddEmail("");
    setAddEmailError(null);
    setAddPassword("");
    setAddConfirmPassword("");
    setAddPasswordError(null);
  }

  function goToAddStep(next: AddStep) {
    if (next === "role" && !validateAccountFields()) {
      setAddStep("account");
      return;
    }
    setAddStep(next);
  }

  function openEdit(member: TeamMember) {
    setError(null);
    setSuccess(null);
    setEditMember(member);
    setEditRole(primaryRole(member.roles));
  }

  async function copyPassword(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      {section === "roles" ? (
        canCreateRoles ? (
          <AdminCreateRoleDialog
            variant="inline"
            open
            roles={customRoles}
            editing={editingCustomRole}
            initialTab={editingCustomRole ? "form" : "list"}
            onClose={() => {
              setEditingCustomRole(null);
              router.push(getAdminPath("/team") + "?tab=staff");
            }}
            onSaved={(role) => {
              setCustomRoles((prev) => {
                const without = prev.filter((item) => item.id !== role.id);
                return [...without, role].sort((a, b) =>
                  a.name.localeCompare(b.name),
                );
              });
              setEditingCustomRole(null);
              setSuccess(`Role “${role.name}” saved.`);
              refresh();
            }}
            onDeleted={(roleId) => {
              setCustomRoles((prev) =>
                prev.filter((item) => item.id !== roleId),
              );
              setEditingCustomRole(null);
              setSuccess("Custom role deleted.");
              refresh();
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            Only a Super Admin can manage roles.
          </p>
        )
      ) : null}

      {section === "staff" ? (
        <>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <form
          className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            commitSearch();
          }}
        >
          <TextField
            size="small"
            fullWidth
            label="Search"
            placeholder="Email or name"
            value={search}
            disabled={pending}
            onChange={(event) => setSearch(event.target.value)}
            onBlur={commitSearch}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitSearch();
              }
            }}
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
                      onClick={clearFilters}
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
            label="Access"
            value={status}
            disabled={pending}
            options={[...STATUS_OPTIONS]}
            onChange={(value) => {
              const next = value as StatusFilter;
              setStatus(next);
              applyFilters({ status: next });
            }}
          />
          <AdminSelect
            label="Role"
            value={roleFilter}
            disabled={pending}
            options={roleSelectOptions}
            onChange={(value) => {
              const next = value as RoleFilter;
              setRoleFilter(next);
              applyFilters({ role: next });
            }}
          />
        </form>

        {canManage && !isImpersonating ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canCreateRoles ? (
              <button
                type="button"
                className={cn(adminBtn("outline"), "!min-h-10")}
                disabled={pending}
                onClick={() => {
                  router.push(getAdminPath("/team") + "?tab=roles");
                }}
              >
                Manage roles
              </button>
            ) : null}
            <button
              type="button"
              className={cn(adminBtn("primary"), "!min-h-10")}
              disabled={pending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                resetAddForm();
                setAddOpen(true);
              }}
            >
              Add Staff
            </button>
          </div>
        ) : null}
      </div>

      {error && !addOpen && !editMember ? (
        <Alert severity="error" sx={{ py: 0, fontSize: 13 }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ py: 0, fontSize: 13 }}>
          {success}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 people</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              people
              <span className="mx-2 text-[var(--color-muted)]">|</span>
              Page{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {totalPages}
              </span>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || pending}
                onClick={() => applyFilters({ page: page - 1 })}
                className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-medium disabled:opacity-40"
              >
                Prev
              </button>

              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1.5 text-sm text-[var(--color-muted)]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={pending || item === page}
                    onClick={() => applyFilters({ page: item })}
                    className={cn(
                      "h-9 min-w-9 rounded-xl border px-2.5 text-sm font-medium transition-colors disabled:opacity-100",
                      item === page
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] disabled:opacity-40",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page >= totalPages || pending}
                onClick={() => applyFilters({ page: page + 1 })}
                className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}

          <div className="w-[7.5rem]">
            <AdminSelect
              label="Rows"
              value={String(pageSize)}
              disabled={pending}
              fullWidth
              options={[...PAGE_SIZE_OPTIONS]}
              onChange={(value) => {
                const next = value === "25" ? 25 : 10;
                applyFilters({ pageSize: next, page: 1 });
              }}
            />
          </div>
        </div>
      </div>

      {!initialMembers.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">No team members found</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {canManage
              ? "Add someone with a store account, or create a new login."
              : "No matching staff for this filter."}
          </p>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Access</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Added
                </th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialMembers.map((member) => {
                const isSelf = member.userId === currentUserId;
                const role = primaryRole(member.roles);
                const isCustomRole = !isSystemAdminRoleCode(role);
                const manageEnabled = canManage && !isImpersonating;
                const canOpenAs =
                  canImpersonate &&
                  !isImpersonating &&
                  !isSelf &&
                  member.isActive;
                const showEdit = manageEnabled;
                const showActivity = canViewActivity;
                const showOpenAs = canOpenAs;
                const showAccess = manageEnabled;
                const showRemove = manageEnabled && !isSelf;
                return (
                  <tr
                    key={member.userId}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {member.name || "—"}
                        {isSelf ? (
                          <span className="ml-1.5 text-[11px] font-normal text-[var(--color-muted)]">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                        {member.email || member.userId}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-block rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-semibold">
                          {roleLabel(role)}
                        </span>
                        {isCustomRole ? (
                          <span
                            className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-[var(--color-primary)]"
                            title="Role created for this store"
                          >
                            Custom
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col items-start gap-1.5">
                        <AdminStatusBadge
                          tone={member.isActive ? "success" : "neutral"}
                          className="!px-1.5 !py-0 !text-[10px]"
                        >
                          {member.isActive ? "On" : "Blocked"}
                        </AdminStatusBadge>
                        {showAccess ? (
                          <AdminToggle
                            className="[&_.MuiFormControlLabel-root]:!mr-0 [&_.MuiFormControlLabel-label]:text-[11px]"
                            checked={member.isActive}
                            disabled={pending}
                            label="Admin access"
                            onChange={(next) => {
                              setError(null);
                              setSuccess(null);
                              startTransition(async () => {
                                const result = await setAdminActiveAction(
                                  member.userId,
                                  next,
                                );
                                if (!result.ok) {
                                  setError(result.error);
                                  return;
                                }
                                setSuccess(result.message);
                                refresh();
                              });
                            }}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-xs text-[var(--color-muted)] sm:table-cell">
                      {formatDateTime(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <TeamMemberRowActions
                        userId={member.userId}
                        label={
                          member.email || member.name || "staff"
                        }
                        showEdit={showEdit}
                        showActivity={showActivity}
                        showOpenAs={showOpenAs}
                        showRemove={showRemove}
                        disabled={pending}
                        onEdit={() => openEdit(member)}
                        onRemove={() => {
                          setError(null);
                          setSuccess(null);
                          setRemoveTarget(member);
                        }}
                        onError={(message) => {
                          setError(message);
                          setSuccess(null);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {canManage && !isImpersonating ? (
            <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted)]">
              Admin access off blocks the dashboard only — they can still shop.
            </p>
          ) : null}
        </div>
      )}

      <AdminFormDialog
        open={addOpen}
        maxWidth="md"
        title={createdPassword ? "Login Created" : "Add Staff"}
        description={
          createdPassword
            ? "Copy the temporary password now — it won’t be shown again."
            : addStep === "account"
              ? "Choose an existing store email or create a new login."
              : "Pick what this person can open in admin."
        }
        pending={pending}
        error={createdPassword ? null : error}
        confirmLabel={
          createdPassword
            ? "Done"
            : addStep === "account"
              ? "Continue"
              : addMode === "create"
                ? "Create Login"
                : "Add to Team"
        }
        pendingLabel={addMode === "create" ? "Creating…" : "Adding…"}
        onClose={() => {
          if (pending) return;
          setAddOpen(false);
          setError(null);
          resetAddForm();
        }}
        onConfirm={() => {
          if (createdPassword) {
            setAddOpen(false);
            resetAddForm();
            return;
          }

          if (addStep === "account") {
            goToAddStep("role");
            return;
          }

          if (!validateAccountFields()) {
            setAddStep("account");
            return;
          }

          startTransition(async () => {
            const result =
              addMode === "create"
                ? await createAdminStaffAction({
                    email: addEmail.trim(),
                    password: addPassword,
                    role: addRole,
                  })
                : await addAdminByEmailAction({
                    email: addEmail.trim(),
                    role: addRole,
                    isActive: true,
                  });

            if (!result.ok) {
              setError(result.error);
              return;
            }

            setSuccess(result.message);
            if (result.temporaryPassword) {
              setCreatedPassword(result.temporaryPassword);
              setAddPassword("");
              setAddConfirmPassword("");
            } else {
              setAddOpen(false);
              resetAddForm();
            }
            refresh();
          });
        }}
      >
        {createdPassword ? (
          <div className="space-y-3">
            <Alert severity="success" sx={{ fontSize: 13 }}>
              Share this password with them so they can sign in to admin.
            </Alert>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <code className="min-w-0 flex-1 break-all text-[13px] font-semibold">
                {createdPassword}
              </code>
              <button
                type="button"
                className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
                onClick={() => void copyPassword(createdPassword)}
              >
                <ContentCopyIcon sx={{ fontSize: 14, mr: 0.5 }} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[12px] text-[var(--color-muted)]">
              Email:{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {addEmail}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              role="tablist"
              aria-label="Add staff steps"
              className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
            >
              {(
                [
                  {
                    id: "account" as const,
                    label: "1. Account",
                    hint: "Email & login",
                  },
                  {
                    id: "role" as const,
                    label: "2. Role",
                    hint: "Menus & access",
                  },
                ] as const
              ).map((tab) => {
                const selected = addStep === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    disabled={pending}
                    onClick={() => goToAddStep(tab.id)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-left transition",
                      selected
                        ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-primary)_32%,var(--color-border))]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <span className="block text-[13px] font-semibold leading-tight">
                      {tab.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug opacity-80">
                      {tab.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Same height for Account + Role (match Role panel) */}
            <div className="grid">
              <div
                className={cn(
                  "col-start-1 row-start-1 flex flex-col space-y-3",
                  addStep !== "account" && "invisible pointer-events-none",
                )}
                aria-hidden={addStep !== "account"}
              >
                <div
                  role="group"
                  aria-label="Account type"
                  className="inline-flex w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 sm:w-auto"
                >
                  {(
                    [
                      { value: "existing" as const, label: "Existing email" },
                      { value: "create" as const, label: "New email" },
                    ] as const
                  ).map((option) => {
                    const selected = addMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        tabIndex={addStep === "account" ? 0 : -1}
                        disabled={pending}
                        onClick={() => switchAddMode(option.value)}
                        className={cn(
                          "min-h-9 flex-1 rounded-md px-3 text-[12px] font-semibold transition sm:flex-none",
                          selected
                            ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))] p-3.5">
                  {addMode === "existing" ? (
                    linkableOptions.length ? (
                      <AdminAutocomplete
                        label="Store account email"
                        required
                        value={addEmail}
                        disabled={pending}
                        error={Boolean(addEmailError)}
                        helperText={
                          addEmailError ??
                          `Search ${linkableOptions.length} store account${linkableOptions.length === 1 ? "" : "s"} by name or email.`
                        }
                        placeholder="Type name or email…"
                        emptyText="No matching store accounts"
                        options={linkableOptions}
                        onChange={(value) => {
                          setAddEmail(value);
                          setAddEmailError(null);
                          setError(null);
                        }}
                      />
                    ) : (
                      <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] px-3.5 py-3 text-[13px] leading-snug text-[var(--color-foreground)]">
                        No store accounts to link. Switch to{" "}
                        <span className="font-semibold text-[var(--color-primary)]">
                          New email
                        </span>{" "}
                        or ask them to register on the store first.
                      </p>
                    )
                  ) : (
                    <div className="admin-form-fields">
                      <TextField
                        size="small"
                        fullWidth
                        required
                        label="Email"
                        type="email"
                        autoComplete="email"
                        value={addEmail}
                        disabled={pending}
                        error={Boolean(addEmailError)}
                        helperText={
                          addEmailError ?? "They’ll use this email to sign in."
                        }
                        placeholder="staff@example.com"
                        onChange={(event) => {
                          setAddEmail(event.target.value);
                          if (addEmailError) setAddEmailError(null);
                        }}
                        onBlur={() => {
                          if (!addEmail.trim()) return;
                          setAddEmailError(validateAddEmail(addEmail));
                        }}
                      />
                      <PasswordField
                        size="small"
                        fullWidth
                        required
                        label="Temporary password"
                        autoComplete="new-password"
                        value={addPassword}
                        disabled={pending}
                        error={Boolean(addPasswordError)}
                        helperText={
                          addPasswordError ??
                          "At least 8 characters. Shown once after save."
                        }
                        onChange={(event) => {
                          setAddPassword(event.target.value);
                          if (addPasswordError) setAddPasswordError(null);
                        }}
                      />
                      <PasswordField
                        size="small"
                        fullWidth
                        required
                        label="Confirm password"
                        autoComplete="new-password"
                        value={addConfirmPassword}
                        disabled={pending}
                        error={Boolean(
                          addConfirmPassword.length > 0 &&
                            addPassword !== addConfirmPassword,
                        )}
                        helperText={
                          addPassword.length > 0 &&
                          addPassword !== addConfirmPassword
                            ? addConfirmPassword.length > 0
                              ? "Passwords do not match."
                              : "Confirm the temporary password."
                            : "Re-enter the temporary password."
                        }
                        onChange={(event) => {
                          setAddConfirmPassword(event.target.value);
                          if (addPasswordError) setAddPasswordError(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "col-start-1 row-start-1 space-y-3",
                  addStep !== "role" && "invisible pointer-events-none",
                )}
                aria-hidden={addStep !== "role"}
              >
                {addEmail ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                        {addMode === "existing" ? "Linking" : "Creating"}
                      </p>
                      <p className="truncate text-[13px] font-semibold text-[var(--color-foreground)]">
                        {addEmail}
                      </p>
                    </div>
                    <button
                      type="button"
                      tabIndex={addStep === "role" ? 0 : -1}
                      className={cn(adminBtn("ghost"), "!min-h-8 !px-2 !text-xs")}
                      disabled={pending}
                      onClick={() => setAddStep("account")}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="h-[42px]" aria-hidden />
                )}

                <AdminRoleSummary
                  name="add-staff-role"
                  value={addRole}
                  disabled={pending || addStep !== "role"}
                  allowSuperAdmin={allowSuperAdminAssign}
                  onChange={setAddRole}
                  roleOptions={roleOptions}
                />
              </div>
            </div>
          </div>
        )}
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(editMember)}
        maxWidth="md"
        title="Edit Role"
        description="Assign access for this team member."
        pending={pending}
        error={error}
        confirmLabel="Save Role"
        pendingLabel="Saving…"
        onClose={() => {
          if (pending) return;
          setEditMember(null);
          setError(null);
        }}
        onConfirm={() => {
          if (!editMember) return;
          setError(null);
          startTransition(async () => {
            const result = await updateAdminRolesAction(
              editMember.userId,
              editRole,
            );
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess(result.message);
            setEditMember(null);
            refresh();
          });
        }}
      >
        <AdminRoleSummary
          name="edit-staff-role"
          value={editRole}
          disabled={pending}
          allowSuperAdmin={allowSuperAdminAssign}
          onChange={setEditRole}
          roleOptions={roleOptions}
          person={
            editMember
              ? {
                  name: editMember.name,
                  email: editMember.email,
                  currentRoleLabel: roleLabel(primaryRole(editMember.roles)),
                }
              : null
          }
        />
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(removeTarget)}
        maxWidth="sm"
        title="Remove from team?"
        description="This removes their admin access and roles. Their login stays so they can still shop on the store."
        pending={pending}
        error={error}
        confirmLabel="Remove from team"
        pendingLabel="Removing…"
        onClose={() => {
          if (pending) return;
          setRemoveTarget(null);
          setError(null);
        }}
        onConfirm={() => {
          if (!removeTarget) return;
          setError(null);
          startTransition(async () => {
            const result = await removeAdminStaffAction(removeTarget.userId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess(result.message);
            setRemoveTarget(null);
            refresh();
          });
        }}
      >
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
            {removeTarget?.name || "Team member"}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">
            {removeTarget?.email || removeTarget?.userId}
          </p>
        </div>
      </AdminFormDialog>

        </>
      ) : null}
    </div>
  );
}

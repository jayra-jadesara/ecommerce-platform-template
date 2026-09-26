"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import {
  deleteStoreCustomerAction,
  setCustomerPasswordAction,
  updateCustomerSessionMaxHoursAction,
} from "@/features/customers/actions";
import { CustomerPasswordDialog } from "@/features/customers/components/CustomerPasswordDialog";
import type { StoreCustomerListItem } from "@/features/customers/service";
import { formatMoney } from "@/features/catalog/money";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { AdminFormDialog } from "@/features/admin/ui/AdminFormDialog";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

const SESSION_NEVER = "never";
const SESSION_HOUR_PRESETS = [
  1, 2, 4, 6, 8, 10, 12, 24, 36, 48, 72, 168,
] as const;

type ActivityFilter = "ALL" | "REPEAT" | "SINGLE";

const ACTIVITY_CHIPS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "REPEAT", label: "Repeat" },
  { value: "SINGLE", label: "One order" },
];

function sessionOptions(current: number | null) {
  const options = SESSION_HOUR_PRESETS.map((hours) => ({
    value: String(hours),
    label: hours === 1 ? "1 hour" : `${hours} hours`,
  }));
  if (
    current != null &&
    !SESSION_HOUR_PRESETS.includes(
      current as (typeof SESSION_HOUR_PRESETS)[number],
    )
  ) {
    options.unshift({
      value: String(current),
      label: `${current} hours (current)`,
    });
  }
  options.push({ value: SESSION_NEVER, label: "Never (JWT only)" });
  return options;
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

export function AdminCustomerListClient({
  initialItems,
  total,
  page,
  pageSize,
  initialSearch,
  initialActivity,
  canPassword = false,
  canDelete = false,
  canEditSessionMax = false,
  customerSessionMaxHours = null,
}: {
  initialItems: StoreCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch: string;
  initialActivity: ActivityFilter;
  canPassword?: boolean;
  canDelete?: boolean;
  canEditSessionMax?: boolean;
  customerSessionMaxHours?: number | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [activity, setActivity] = useState<ActivityFilter>(initialActivity);
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string>
  >({});
  const [passwordTarget, setPasswordTarget] =
    useState<StoreCustomerListItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<StoreCustomerListItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionValue, setSessionValue] = useState(
    customerSessionMaxHours == null
      ? SESSION_NEVER
      : String(customerSessionMaxHours),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setSessionValue(
      customerSessionMaxHours == null
        ? SESSION_NEVER
        : String(customerSessionMaxHours),
    );
  }, [customerSessionMaxHours]);

  async function copyPasswordFor(customer: StoreCustomerListItem) {
    setActionError(null);
    const existing = revealedPasswords[customer.id];
    if (existing) {
      try {
        await navigator.clipboard.writeText(existing);
        setCopiedId(customer.id);
      } catch {
        setActionError("Could not copy to clipboard.");
      }
      return;
    }
    setCopyingId(customer.id);
    startTransition(async () => {
      const result = await setCustomerPasswordAction({
        userId: customer.id,
        generate: true,
      });
      setCopyingId(null);
      if (!result.ok || !result.temporaryPassword) {
        setActionError(result.error ?? "Unable to set password.");
        return;
      }
      const password = result.temporaryPassword;
      setRevealedPasswords((prev) => ({ ...prev, [customer.id]: password }));
      try {
        await navigator.clipboard.writeText(password);
        setCopiedId(customer.id);
      } catch {
        setActionError("Password set, but clipboard copy failed — use Copy again.");
      }
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  function applyFilters(options?: {
    page?: number;
    search?: string;
    pageSize?: number;
    activity?: ActivityFilter;
  }) {
    const nextPage = options?.page ?? 1;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;
    const nextActivity = options?.activity ?? activity;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextActivity !== "ALL") params.set("activity", nextActivity);
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    startTransition(() => {
      router.push(getAdminPath(`/customers${qs ? `?${qs}` : ""}`));
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setActivity("ALL");
    applyFilters({ search: "", activity: "ALL" });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    activity !== "ALL";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_CHIPS.map((chip) => {
            const active = activity === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                disabled={pending}
                onClick={() => {
                  setActivity(chip.value);
                  applyFilters({ activity: chip.value });
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
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
        {canEditSessionMax ? (
          <button
            type="button"
            disabled={pending}
            className={cn(adminBtn("outline"), "!min-h-9 !gap-1.5")}
            onClick={() => {
              setActionError(null);
              setSessionOpen(true);
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
            Settings
          </button>
        ) : null}
      </div>

      {actionError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
          {actionError}
        </p>
      ) : null}

      <form
        className="grid gap-2 sm:grid-cols-1"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Name, email, phone, address…"
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
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 customers</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              customers
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
              options={PAGE_SIZE_OPTIONS}
              onChange={(value) => {
                const next = value === "25" ? 25 : 10;
                applyFilters({ pageSize: next, page: 1 });
              }}
            />
          </div>
        </div>
      </div>

      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">
            {initialSearch || activity !== "ALL"
              ? "No matches"
              : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {initialSearch || activity !== "ALL"
              ? "Try a different search or filter."
              : "Customers appear after a successful paid order."}
          </p>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                {canPassword ? (
                  <th className="px-4 py-3 font-medium">Password</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Address / info</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Spent</th>
                <th className="px-4 py-3 font-medium">Last order</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => {
                const address = customer.address;
                const location = [address?.city, address?.state]
                  .filter(Boolean)
                  .join(", ");
                const postalCountry = [address?.postalCode, address?.country]
                  .filter(Boolean)
                  .join(" · ");
                const revealed = revealedPasswords[customer.id];
                return (
                  <tr
                    key={customer.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {customer.name || "Customer"}
                      </p>
                      {customer.email ? (
                        <p className="text-xs text-[var(--color-muted)]">
                          {customer.email}
                        </p>
                      ) : null}
                      {customer.phone ? (
                        <p className="text-xs text-[var(--color-muted)]">
                          {customer.phone}
                        </p>
                      ) : null}
                      {customer.isStaffAdmin ? (
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                          Admin staff
                        </p>
                      ) : null}
                    </td>
                    {canPassword ? (
                      <td className="px-4 py-3">
                        <div className="flex max-w-[14rem] flex-col gap-1">
                          {revealed ? (
                            <code className="truncate rounded-md bg-[var(--color-surface)] px-1.5 py-1 text-[11px] font-semibold tracking-wide">
                              {revealed}
                            </code>
                          ) : null}
                          <button
                            type="button"
                            disabled={pending || copyingId === customer.id}
                            title="Copy password (creates a new one if needed)"
                            className={cn(
                              adminBtn("outline"),
                              "!min-h-8 !gap-1 !px-2 !text-[11px]",
                            )}
                            onClick={() => copyPasswordFor(customer)}
                          >
                            <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
                            {copyingId === customer.id
                              ? "Copying…"
                              : copiedId === customer.id
                                ? "Copied"
                                : "Copy password"}
                          </button>
                        </div>
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      {address ? (
                        <div className="max-w-[16rem]">
                          {address.fullName &&
                          address.fullName !== customer.name ? (
                            <p className="text-xs font-medium text-[var(--color-foreground)]">
                              {address.fullName}
                            </p>
                          ) : null}
                          {address.line1 ? (
                            <p className="text-xs leading-snug text-[var(--color-foreground)]">
                              {address.line1}
                            </p>
                          ) : null}
                          {address.line2 ? (
                            <p className="text-xs leading-snug text-[var(--color-muted)]">
                              {address.line2}
                            </p>
                          ) : null}
                          {location ? (
                            <p className="text-xs text-[var(--color-muted)]">
                              {location}
                            </p>
                          ) : null}
                          {postalCountry ? (
                            <p className="text-xs text-[var(--color-muted)]">
                              {postalCountry}
                            </p>
                          ) : null}
                          {address.phone && address.phone !== customer.phone ? (
                            <p className="text-xs text-[var(--color-muted)]">
                              {address.phone}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{customer.orderCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                      {formatMoney(customer.totalSpent, customer.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {customer.lastOrderNumber ? (
                        <Link
                          href={getAdminPath(
                            `/orders?q=${encodeURIComponent(customer.lastOrderNumber)}`,
                          )}
                          className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
                        >
                          {customer.lastOrderNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {customer.lastOrderAt ? (
                        <p className="text-xs text-[var(--color-muted)]">
                          {formatDateTime(customer.lastOrderAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {customer.lastOrderNumber ? (
                          <Link
                            href={getAdminPath(
                              `/orders?q=${encodeURIComponent(customer.lastOrderNumber)}`,
                            )}
                            className={cn(
                              adminBtn("outline"),
                              "!min-h-8 !px-2.5 !text-[11px]",
                            )}
                          >
                            View order
                          </Link>
                        ) : null}
                        {canPassword ? (
                          <button
                            type="button"
                            disabled={pending}
                            className={cn(
                              adminBtn("outline"),
                              "!min-h-8 !px-2.5 !text-[11px]",
                            )}
                            onClick={() => {
                              setActionError(null);
                              setPasswordTarget(customer);
                            }}
                          >
                            Change password
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            disabled={pending || customer.isStaffAdmin}
                            title={
                              customer.isStaffAdmin
                                ? "Used in admin — remove staff access first"
                                : "Delete customer account"
                            }
                            className={cn(
                              adminBtn("ghost"),
                              "!min-h-8 !px-2.5 !text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-40",
                            )}
                            onClick={() => {
                              setActionError(null);
                              setDeleteTarget(customer);
                            }}
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
      )}

      <AdminFormDialog
        open={sessionOpen}
        title="Customer login settings"
        description="How long storefront shoppers stay signed in before they must log in again."
        maxWidth="sm"
        dense
        pending={pending}
        error={actionError}
        confirmLabel="Save"
        pendingLabel="Saving…"
        onClose={() => setSessionOpen(false)}
        onConfirm={() => {
          setActionError(null);
          startTransition(async () => {
            const hours =
              sessionValue === SESSION_NEVER ? "never" : Number(sessionValue);
            const result = await updateCustomerSessionMaxHoursAction(hours);
            if (!result.ok) {
              setActionError(result.error ?? "Unable to save.");
              return;
            }
            setSessionOpen(false);
            router.refresh();
          });
        }}
      >
        <AdminSelect
          label="Customer login duration"
          value={sessionValue}
          disabled={pending}
          options={sessionOptions(customerSessionMaxHours)}
          helperText="Never uses only the Supabase JWT lifetime."
          onChange={setSessionValue}
        />
      </AdminFormDialog>

      <CustomerPasswordDialog
        open={Boolean(passwordTarget)}
        userId={passwordTarget?.id ?? ""}
        customerName={passwordTarget?.name || passwordTarget?.email || "Customer"}
        onClose={() => setPasswordTarget(null)}
        onPasswordSet={(userId, password) => {
          setRevealedPasswords((prev) => ({ ...prev, [userId]: password }));
          setCopiedId(userId);
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete customer?"
        message={
          deleteTarget?.isStaffAdmin
            ? "This login is used in Team & roles (admin). Remove their staff access first."
            : `Delete ${deleteTarget?.name || deleteTarget?.email || "this customer"}? Orders stay in history with the customer unlinked. This cannot be undone.`
        }
        blocked={Boolean(deleteTarget?.isStaffAdmin)}
        confirmLabel="Delete customer"
        safeActionLabel="Close"
        pending={pending}
        onClose={() => setDeleteTarget(null)}
        onSafeAction={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget || deleteTarget.isStaffAdmin) return;
          setActionError(null);
          startTransition(async () => {
            const result = await deleteStoreCustomerAction(deleteTarget.id);
            if (!result.ok) {
              setActionError(result.error ?? "Unable to delete.");
              setDeleteTarget(null);
              return;
            }
            setItems((prev) => prev.filter((row) => row.id !== deleteTarget.id));
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import TextField from "@mui/material/TextField";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
  arrayMove,
} from "@/features/admin/ui/AdminSortable";
import {
  createBannerAction,
  deleteBannerAction,
  reorderBannersAction,
  updateBannerAction,
} from "@/features/cms/actions";
import {
  productPathFromSlug,
  productSlugFromPath,
} from "@/features/cms/banner-strip-style";
import { TicketStrip } from "@/features/cms/components/StorefrontPromoBanners";
import {
  BANNER_BUTTON_CHIP_OPTIONS,
  BANNER_COLOR_SWATCHES,
  BANNER_DEFAULT_BACKGROUND,
  bannerFormSchema,
  type BannerFormValues,
} from "@/features/cms/schemas";
import type { BannerProductOption, BannerRow } from "@/features/cms/types";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldsGrid,
  adminFormStack,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import {
  AdminDateTimeField,
  isoToAdminDateTimeLocal,
} from "@/features/admin/ui/AdminDateTimeField";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { FieldError } from "@/features/admin/ui/FieldError";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";
import dayjs from "dayjs";

function fromDatetimeLocal(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const d = dayjs(value);
  return d.isValid() ? d.toISOString() : null;
}

function bannerLiveStatus(banner: BannerRow): {
  label: string;
  tone: "success" | "neutral" | "warning";
} {
  if (!banner.isActive) return { label: "Hidden", tone: "neutral" };
  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
    return { label: "Scheduled", tone: "warning" };
  }
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) {
    return { label: "Ended", tone: "neutral" };
  }
  return { label: "Live on store", tone: "success" };
}

type StatusFilter = "all" | "live" | "hidden" | "scheduled";
type LinkMode = "page" | "product";

const STATUS_CHIPS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "hidden", label: "Hidden" },
];

const EMPTY_FORM: BannerFormValues = {
  title: "",
  description: null,
  imagePath: null,
  backgroundColor: BANNER_DEFAULT_BACKGROUND,
  linkUrl: null,
  buttonText: null,
  isActive: true,
  startsAt: null,
  endsAt: null,
  sortOrder: 0,
};

function linkTargetLabel(
  linkUrl: string | null,
  products: BannerProductOption[],
): string {
  if (!linkUrl) return "No link";
  const slug = productSlugFromPath(linkUrl);
  if (slug) {
    const product = products.find((p) => p.slug === slug);
    return product ? `Product · ${product.name}` : `Product · ${slug}`;
  }
  return `Page · ${pageOptionLabel(linkUrl)}`;
}

function BannerStripPreview({
  title,
  description,
  buttonText,
  backgroundColor,
  compact,
}: {
  title: string;
  description?: string | null;
  buttonText?: string | null;
  backgroundColor: string;
  compact?: boolean;
}) {
  return (
    <TicketStrip
      title={title}
      description={description}
      buttonText={buttonText}
      backgroundColor={backgroundColor}
      compact={compact}
      notchColor="var(--color-card)"
    />
  );
}

export function BannersManager({
  initialBanners,
  productOptions,
  canCreate,
  canUpdate,
  canDelete,
}: {
  initialBanners: BannerRow[];
  productOptions: BannerProductOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<BannerRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    setBanners(initialBanners);
  }, [initialBanners]);

  const formOpen = creating || Boolean(editing);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return banners.filter((b) => {
      const status = bannerLiveStatus(b);
      if (statusFilter === "live" && status.tone !== "success") return false;
      if (statusFilter === "hidden" && b.isActive) return false;
      if (statusFilter === "scheduled" && status.label !== "Scheduled") {
        return false;
      }
      if (q && !b.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [banners, search, statusFilter]);

  const sortableIds = useMemo(
    () => filtered.map((b) => b.id),
    [filtered],
  );

  function refresh() {
    router.refresh();
  }

  function onReorder(activeId: string, overId: string) {
    if (!canUpdate) return;
    const oldIndex = banners.findIndex((b) => b.id === activeId);
    const newIndex = banners.findIndex((b) => b.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const next = arrayMove(banners, oldIndex, newIndex).map((b, i) => ({
      ...b,
      sortOrder: i,
    }));
    setBanners(next);
    startTransition(async () => {
      const result = await reorderBannersAction(next.map((b) => b.id));
      if (!result.ok) {
        setError(result.error);
        setBanners(initialBanners);
        return;
      }
      setSuccess("Order saved.");
      refresh();
    });
  }

  return (
    <div style={adminStackStyle} className="!gap-3">
      {!formOpen ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-[var(--color-muted)]">
              Slim offer bars on the homepage. Color + text — multiple banners
              auto-rotate. Drag to set order.
            </p>
          </div>
          {canCreate ? (
            <button
              type="button"
              className={cn(adminBtn("primary"), "!min-h-9 !px-3 !text-xs")}
              onClick={() => {
                setCreating(true);
                setEditing(null);
                setError(null);
                setSuccess(null);
              }}
            >
              + New banner
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)]">
          {success}
        </p>
      ) : null}

      {formOpen ? (
        <BannerForm
          mode={creating ? "create" : "edit"}
          bannerId={editing?.id}
          productOptions={productOptions}
          initialValues={{
            title: editing?.title ?? "",
            description: editing?.description ?? null,
            imagePath: editing?.imagePath ?? null,
            backgroundColor:
              editing?.backgroundColor ?? BANNER_DEFAULT_BACKGROUND,
            linkUrl: editing?.linkUrl ?? null,
            buttonText: editing?.buttonText ?? null,
            isActive: editing?.isActive ?? true,
            startsAt: editing?.startsAt ?? null,
            endsAt: editing?.endsAt ?? null,
            sortOrder: editing?.sortOrder ?? banners.length,
          }}
          canSubmit={creating ? canCreate : canUpdate}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(banner) => {
            setBanners((prev) => {
              const exists = prev.some((b) => b.id === banner.id);
              return exists
                ? prev.map((b) => (b.id === banner.id ? banner : b))
                : [...prev, banner];
            });
            setCreating(false);
            setEditing(null);
            setError(null);
            setSuccess(creating ? "Banner created." : "Banner saved.");
            refresh();
          }}
          onError={setError}
        />
      ) : null}

      {!formOpen ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <TextField
              size="small"
              label="Search"
              placeholder="Offer text"
              value={search}
              disabled={pending}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[12rem] flex-1"
            />
            <AdminSelect
              label="Status"
              value={statusFilter}
              disabled={pending}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              options={STATUS_CHIPS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              className="!min-w-[9rem] !max-w-[11rem]"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-4 py-12 text-center">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {banners.length === 0 ? "No banners yet" : "No matches"}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {banners.length === 0
                  ? "Add a short offer line and a color for the homepage strip."
                  : "Try another search or status filter."}
              </p>
            </div>
          ) : (
            <AdminSortableList
              ids={sortableIds}
              disabled={
                !canUpdate ||
                pending ||
                Boolean(search.trim()) ||
                statusFilter !== "all"
              }
              layout="grid"
              as="div"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              onReorder={onReorder}
            >
              {filtered.map((banner) => {
                const status = bannerLiveStatus(banner);
                return (
                  <AdminSortableItem
                    key={banner.id}
                    id={banner.id}
                    disabled={!canUpdate || pending}
                  >
                    {({
                      setNodeRef,
                      style,
                      isDragging,
                      attributes,
                      listeners,
                    }) => (
                      <article
                        ref={setNodeRef}
                        style={style}
                        className={cn(
                          adminCard(),
                          "overflow-hidden !p-0 !shadow-none",
                          isDragging &&
                            "opacity-80 ring-2 ring-[var(--color-primary)]",
                        )}
                      >
                        <div className="relative p-3 pb-2">
                          <BannerStripPreview
                            title={banner.title}
                            description={banner.description}
                            buttonText={banner.buttonText}
                            backgroundColor={banner.backgroundColor}
                            compact
                          />
                          <div className="absolute left-4 top-4 flex items-center gap-1">
                            {canUpdate &&
                            !search.trim() &&
                            statusFilter === "all" ? (
                              <AdminDragHandle
                                attributes={attributes}
                                listeners={listeners}
                                className="!rounded-md !bg-[color-mix(in_srgb,var(--color-card)_88%,transparent)] !p-1"
                              />
                            ) : null}
                          </div>
                          <div className="absolute right-4 top-4">
                            <AdminStatusBadge tone={status.tone}>
                              {status.label}
                            </AdminStatusBadge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 px-3 pb-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                              {banner.title}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">
                              {linkTargetLabel(banner.linkUrl, productOptions)}
                              {banner.startsAt || banner.endsAt
                                ? ` · ${banner.startsAt ? formatDateTime(banner.startsAt) : "Anytime"} → ${banner.endsAt ? formatDateTime(banner.endsAt) : "No end"}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {canUpdate ? (
                              <button
                                type="button"
                                className={cn(
                                  adminBtn("outline"),
                                  "!min-h-8 !px-2.5 !text-[11px]",
                                )}
                                onClick={() => {
                                  setEditing(banner);
                                  setCreating(false);
                                  setError(null);
                                  setSuccess(null);
                                }}
                              >
                                Edit
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                disabled={pending}
                                className={cn(
                                  adminBtn("danger"),
                                  "!min-h-8 !px-2.5 !text-[11px]",
                                )}
                                onClick={() => setDeleteTarget(banner)}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    )}
                  </AdminSortableItem>
                );
              })}
            </AdminSortableList>
          )}
          {canUpdate &&
          banners.length > 1 &&
          !search.trim() &&
          statusFilter === "all" ? (
            <p className="text-[11px] text-[var(--color-muted)]">
              Drag the handle to change homepage rotate order.
            </p>
          ) : null}
        </>
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete banner?"
        message={`Delete “${deleteTarget?.title ?? "this banner"}”? This cannot be undone.`}
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteBannerAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setBanners((prev) =>
              prev.filter((b) => b.id !== deleteTarget.id),
            );
            setDeleteTarget(null);
            setSuccess("Banner deleted.");
            refresh();
          });
        }}
      />
    </div>
  );
}

function BannerForm({
  mode,
  bannerId,
  initialValues,
  productOptions,
  canSubmit,
  onCancel,
  onSaved,
  onError,
}: {
  mode: "create" | "edit";
  bannerId?: string;
  initialValues: BannerFormValues;
  productOptions: BannerProductOption[];
  canSubmit: boolean;
  onCancel: () => void;
  onSaved: (banner: BannerRow) => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const initialSlug = productSlugFromPath(initialValues.linkUrl);
  const [linkMode, setLinkMode] = useState<LinkMode>(
    initialSlug ? "product" : "page",
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { errors },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema) as Resolver<BannerFormValues>,
    defaultValues: {
      ...EMPTY_FORM,
      ...initialValues,
      backgroundColor:
        initialValues.backgroundColor ?? BANNER_DEFAULT_BACKGROUND,
      startsAt: initialValues.startsAt
        ? isoToAdminDateTimeLocal(initialValues.startsAt)
        : null,
      endsAt: initialValues.endsAt
        ? isoToAdminDateTimeLocal(initialValues.endsAt)
        : null,
    },
  });

  const title = useWatch({ control, name: "title" });
  const description = useWatch({ control, name: "description" });
  const buttonText = useWatch({ control, name: "buttonText" });
  const linkUrl = useWatch({ control, name: "linkUrl" });
  const backgroundColor = useWatch({ control, name: "backgroundColor" });
  const isActive = useWatch({ control, name: "isActive" });

  const productOptionsForSelect = productOptions.map((p) => ({
    value: productPathFromSlug(p.slug),
    label: p.name,
  }));

  const selectedProductPath = productSlugFromPath(linkUrl)
    ? String(linkUrl)
    : "";

  return (
    <form
      onSubmit={handleSubmit((values) => {
        if (!canSubmit) return;
        const payload = {
          ...values,
          imagePath: values.imagePath ?? null,
          startsAt: fromDatetimeLocal(String(values.startsAt ?? "")),
          endsAt: fromDatetimeLocal(String(values.endsAt ?? "")),
        };
        startTransition(async () => {
          const result =
            mode === "create"
              ? await createBannerAction(payload)
              : await updateBannerAction(bannerId!, payload);
          if (!result.ok) {
            const serverFieldErrors = resultFieldErrors(result);
            if (serverFieldErrors) {
              applyServerFieldErrors(setFieldError as never, serverFieldErrors);
              focusFirstFieldError({
                fieldErrors: serverFieldErrors,
                setFocus: setFocus as (name: string) => void,
              });
            }
            onError(result.error);
            return;
          }
          onSaved(result.banner);
        });
      })}
      className={cn(adminCard(), adminCardPadding(), adminFormStack(), "!gap-3")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            {mode === "create" ? "New banner" : "Edit banner"}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Coupon-style strip: offer text on a colored bar. Opens a page or
            product when shoppers tap it.
          </p>
        </div>
        <AdminToggle
          checked={Boolean(isActive)}
          disabled={!canSubmit || pending}
          label="Show on store"
          onChange={(checked) =>
            setValue("isActive", checked, { shouldDirty: true })
          }
        />
      </div>

      <BannerStripPreview
        title={title ?? ""}
        description={description}
        buttonText={buttonText}
        backgroundColor={backgroundColor || BANNER_DEFAULT_BACKGROUND}
      />

      <div className="grid gap-2.5">
        <div>
          <TextField
            label="Offer text"
            fullWidth
            required
            size="small"
            disabled={!canSubmit || pending}
            error={Boolean(errors.title)}
            placeholder="FLAT ₹300 OFF"
            helperText="Shows in the ticket stub (right)."
            {...register("title")}
          />
          <FieldError message={errors.title?.message} />
        </div>
        <div>
          <TextField
            label="Supporting line"
            fullWidth
            size="small"
            disabled={!canSubmit || pending}
            placeholder="On your 1st purchase"
            helperText="Shows in the wide left section. Add this for the full ticket look."
            {...register("description")}
          />
        </div>
        <Controller
          name="buttonText"
          control={control}
          render={({ field }) => {
            const raw = String(field.value ?? "").trim();
            const known = BANNER_BUTTON_CHIP_OPTIONS.some(
              (o) => o.value === raw,
            );
            const options = [
              ...(raw && !known
                ? [{ value: raw, label: `${raw} (custom)` }]
                : []),
              ...BANNER_BUTTON_CHIP_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              })),
            ];
            return (
              <div>
                <AdminSelect
                  label="Button chip"
                  value={raw}
                  allowEmpty
                  emptyLabel="No chip"
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.buttonText)}
                  options={options}
                  helperText="Optional label on the stub. Pick a preset or keep a custom value."
                  onChange={(next) => field.onChange(next || null)}
                />
                <FieldError message={errors.buttonText?.message} />
              </div>
            );
          }}
        />
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Bar color
        </p>
        <p className="mb-2 text-xs text-[var(--color-muted)]">
          Swatches for quick picks. Hex / color picker work for any custom brand
          color (#RRGGBB) — saved and shown on the store.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {BANNER_COLOR_SWATCHES.map((swatch) => {
            const active =
              (backgroundColor || "").toUpperCase() === swatch.toUpperCase();
            return (
              <button
                key={swatch}
                type="button"
                disabled={!canSubmit || pending}
                aria-label={`Color ${swatch}`}
                title={swatch}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition sm:h-8 sm:w-8",
                  active
                    ? "scale-105 border-[var(--color-foreground)]"
                    : "border-transparent",
                )}
                style={{ backgroundColor: swatch }}
                onClick={() =>
                  setValue("backgroundColor", swatch, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            );
          })}
          <label className="relative inline-flex h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-[var(--color-border)] sm:h-8 sm:w-8">
            <span
              className="absolute inset-0"
              style={{
                backgroundColor: backgroundColor || BANNER_DEFAULT_BACKGROUND,
              }}
            />
            <input
              type="color"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={!canSubmit || pending}
              value={
                /^#[0-9A-Fa-f]{6}$/.test(backgroundColor || "")
                  ? backgroundColor!
                  : BANNER_DEFAULT_BACKGROUND
              }
              onChange={(e) =>
                setValue("backgroundColor", e.target.value.toUpperCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </label>
          <TextField
            size="small"
            label="Custom hex"
            disabled={!canSubmit || pending}
            error={Boolean(errors.backgroundColor)}
            value={backgroundColor || ""}
            onChange={(e) =>
              setValue("backgroundColor", e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            helperText="e.g. #E85D04"
            className="!w-[8.5rem]"
          />
        </div>
        <FieldError message={errors.backgroundColor?.message} />
      </div>

      <div className="grid gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Opens when tapped
        </p>
        <AdminSelect
          label="Link type"
          value={linkMode}
          disabled={!canSubmit || pending}
          options={[
            { value: "page", label: "Store page" },
            { value: "product", label: "Product detail" },
          ]}
          onChange={(value) => {
            const next = value as LinkMode;
            setLinkMode(next);
            setValue("linkUrl", null, { shouldDirty: true, shouldValidate: true });
          }}
        />
        {linkMode === "page" ? (
          <Controller
            name="linkUrl"
            control={control}
            render={({ field }) => (
              <div>
                <StorePageLinkField
                  value={field.value}
                  fallback="/products"
                  allowEmpty
                  emptyLabel="No page"
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.linkUrl)}
                  onChange={field.onChange}
                  helperText={
                    errors.linkUrl
                      ? undefined
                      : "Optional — pages from Menu & Navigation"
                  }
                />
                <FieldError message={errors.linkUrl?.message} />
              </div>
            )}
          />
        ) : (
          <Controller
            name="linkUrl"
            control={control}
            render={({ field }) => (
              <div>
                <AdminSelect
                  label="Product"
                  value={selectedProductPath}
                  allowEmpty
                  emptyLabel="No product"
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.linkUrl)}
                  options={productOptionsForSelect}
                  helperText={
                    productOptions.length
                      ? "Opens that product’s detail page"
                      : "Publish a product first"
                  }
                  onChange={(next) => field.onChange(next || null)}
                />
                <FieldError message={errors.linkUrl?.message} />
              </div>
            )}
          />
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Schedule
        </p>
        <p className="mb-2.5 text-xs text-[var(--color-muted)]">
          Leave empty to show whenever the banner is active.
        </p>
        <div className={cn(adminFieldsGrid(2), "!gap-2.5")}>
          <Controller
            name="startsAt"
            control={control}
            render={({ field }) => (
              <div className="min-w-0">
                <AdminDateTimeField
                  label="Show from"
                  disabled={!canSubmit || pending}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(errors.startsAt)}
                  helperText=" "
                />
                <FieldError message={errors.startsAt?.message} />
              </div>
            )}
          />
          <Controller
            name="endsAt"
            control={control}
            render={({ field }) => (
              <div className="min-w-0">
                <AdminDateTimeField
                  label="Show until"
                  disabled={!canSubmit || pending}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(errors.endsAt)}
                  helperText=" "
                />
                <FieldError message={errors.endsAt?.message} />
              </div>
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-3">
        <button
          type="button"
          className={cn(adminBtn("outline"), "!min-h-9 !text-xs")}
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={cn(adminBtn("primary"), "!min-h-9 !text-xs")}
          disabled={!canSubmit || pending}
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create banner"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}

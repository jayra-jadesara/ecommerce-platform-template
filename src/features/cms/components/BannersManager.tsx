"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBannerAction,
  deleteBannerAction,
  updateBannerAction,
} from "@/features/cms/actions";
import {
  bannerFormSchema,
  type BannerFormValues,
} from "@/features/cms/schemas";
import type { BannerRow } from "@/features/cms/types";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldGroup,
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
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { formatDateTime } from "@/lib/format-date";
import dayjs from "dayjs";

function fromDatetimeLocal(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const d = dayjs(value);
  return d.isValid() ? d.toISOString() : null;
}

export function BannersManager({
  initialBanners,
  canCreate,
  canUpdate,
  canDelete,
}: {
  initialBanners: BannerRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<BannerRow | null>(null);

  const formOpen = creating || Boolean(editing);

  return (
    <div style={adminStackStyle}>
      {!formOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            Promo strips shoppers see on the storefront. Add an image, optional
            button, and when it should show.
          </p>
          {canCreate ? (
            <button
              type="button"
              className={adminBtn("primary")}
              onClick={() => {
                setCreating(true);
                setEditing(null);
                setError(null);
              }}
            >
              Create banner
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <BannerForm
          mode={creating ? "create" : "edit"}
          bannerId={editing?.id}
          initialValues={{
            title: editing?.title ?? "",
            description: editing?.description ?? null,
            imagePath: editing?.imagePath ?? null,
            linkUrl: editing?.linkUrl ?? null,
            buttonText: editing?.buttonText ?? null,
            isActive: editing?.isActive ?? true,
            startsAt: editing?.startsAt ?? null,
            endsAt: editing?.endsAt ?? null,
            sortOrder: editing?.sortOrder ?? 0,
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
            router.refresh();
          }}
          onError={setError}
        />
      ) : null}

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {banners.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-4 py-12 text-center">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              No banners yet
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Create a promotional banner for sales, announcements, or seasonal
              offers.
            </p>
            {canCreate && !formOpen ? (
              <button
                type="button"
                className={`${adminBtn("primary")} mt-4`}
                onClick={() => {
                  setCreating(true);
                  setEditing(null);
                }}
              >
                Create banner
              </button>
            ) : null}
          </li>
        ) : (
          banners.map((banner) => {
            const preview = resolveCmsImageUrl(banner.imagePath);
            return (
              <li
                key={banner.id}
                className={`${adminCard()} flex flex-wrap items-center gap-4 p-4`}
              >
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {banner.title}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                    {banner.isActive ? "Showing on store" : "Hidden"}
                    {banner.linkUrl
                      ? ` · Opens ${pageOptionLabel(banner.linkUrl)}`
                      : ""}
                    {banner.startsAt || banner.endsAt
                      ? ` · ${banner.startsAt ? formatDateTime(banner.startsAt) : "Anytime"} → ${banner.endsAt ? formatDateTime(banner.endsAt) : "No end"}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canUpdate ? (
                    <button
                      type="button"
                      className={adminBtn("outline")}
                      onClick={() => {
                        setEditing(banner);
                        setCreating(false);
                        setError(null);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={pending}
                      className={adminBtn("danger")}
                      onClick={() => setDeleteTarget(banner)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>

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
            router.refresh();
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
  canSubmit,
  onCancel,
  onSaved,
  onError,
}: {
  mode: "create" | "edit";
  bannerId?: string;
  initialValues: BannerFormValues;
  canSubmit: boolean;
  onCancel: () => void;
  onSaved: (banner: BannerRow) => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [mediaOpen, setMediaOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError: setFieldError,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema) as Resolver<BannerFormValues>,
    defaultValues: {
      ...initialValues,
      startsAt: initialValues.startsAt
        ? isoToAdminDateTimeLocal(initialValues.startsAt)
        : null,
      endsAt: initialValues.endsAt
        ? isoToAdminDateTimeLocal(initialValues.endsAt)
        : null,
    },
  });

  const imagePath = watch("imagePath");
  const buttonText = watch("buttonText");
  const linkUrl = watch("linkUrl");
  const imagePreview = resolveCmsImageUrl(imagePath);

  return (
    <>
      <form
        onSubmit={handleSubmit((values) => {
          if (!canSubmit) return;
          const payload = {
            ...values,
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
        className={`${adminCard()} ${adminCardPadding()} ${adminFormStack()}`}
        style={adminStackStyle}
      >
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            {mode === "create" ? "Create banner" : "Edit banner"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Shoppers see this as a promo strip — keep the title short and pick a
            clear image.
          </p>
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Banner text</p>
          <div>
            <TextField
              label="Title shoppers see"
              fullWidth
              required
              disabled={!canSubmit || pending}
              error={Boolean(errors.title)}
              helperText={
                errors.title ? undefined : "Short headline on the banner."
              }
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>
          <TextField
            label="Supporting text (optional)"
            fullWidth
            multiline
            minRows={2}
            disabled={!canSubmit || pending}
            helperText="One short line under the title."
            {...register("description")}
          />
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. Image</p>
          <p className="admin-field-group__hint">
            Wide images work best (roughly 1600×600 or similar).
          </p>
          <div
            className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt=""
                className="h-40 w-full rounded-lg object-cover"
              />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                No image selected yet
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canSubmit || pending}
                className={adminBtn("outline")}
                onClick={() => setMediaOpen(true)}
              >
                Choose image
              </button>
              {imagePath ? (
                <button
                  type="button"
                  disabled={!canSubmit || pending}
                  className={adminBtn("ghost")}
                  onClick={() =>
                    setValue("imagePath", null, { shouldDirty: true })
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Button (optional)</p>
          <p className="admin-field-group__hint">
            Add a button so shoppers can jump to a store page.
          </p>
          <div
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <TextField
              label="Button text shoppers see"
              fullWidth
              disabled={!canSubmit || pending}
              helperText="Leave blank to hide the button"
              {...register("buttonText")}
            />
            <Controller
              name="linkUrl"
              control={control}
              render={({ field }) => (
                <div>
                  <StorePageLinkField
                    value={field.value}
                    fallback="/products"
                    allowEmpty
                    emptyLabel="No page (banner not clickable)"
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.linkUrl)}
                    onChange={field.onChange}
                    helperText={
                      errors.linkUrl
                        ? undefined
                        : buttonText
                          ? `“${buttonText}” opens ${pageOptionLabel(String(linkUrl ?? "/products"))}`
                          : "Pick where the button should send shoppers"
                    }
                  />
                  <FieldError message={errors.linkUrl?.message} />
                </div>
              )}
            />
          </div>
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">4. Schedule &amp; visibility</p>
          <p className="admin-field-group__hint">
            Leave dates empty to show whenever the banner is active.
          </p>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="startsAt"
              control={control}
              render={({ field }) => (
                <AdminDateTimeField
                  label="Show from (optional)"
                  disabled={!canSubmit || pending}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />
            <Controller
              name="endsAt"
              control={control}
              render={({ field }) => (
                <div>
                  <AdminDateTimeField
                    label="Show until (optional)"
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.endsAt)}
                    helperText={undefined}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                  <FieldError message={errors.endsAt?.message} />
                </div>
              )}
            />
          </div>
          <TextField
            label="Display order"
            type="number"
            fullWidth
            disabled={!canSubmit || pending}
            helperText="Lower numbers appear first when several banners are active."
            {...register("sortOrder", { valueAsNumber: true })}
          />
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canSubmit || pending}
                  />
                }
                label="Show on store now"
              />
            )}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className={adminBtn("primary")}
          >
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create banner"
                : "Save banner"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={adminBtn("outline")}
          >
            Cancel
          </button>
        </div>
      </form>
      <MediaPicker
        open={mediaOpen}
        folder="cms"
        onClose={() => setMediaOpen(false)}
        onSelect={(selection) => {
          setValue("imagePath", selection.storagePath, { shouldDirty: true });
          setMediaOpen(false);
        }}
      />
    </>
  );
}

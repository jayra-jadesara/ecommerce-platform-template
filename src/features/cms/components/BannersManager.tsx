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
import { MediaPicker } from "@/features/media";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate ? (
          <button
            type="button"
            className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            Create banner
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {(creating || editing) && (
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
            router.refresh();
          }}
          onError={setError}
        />
      )}

      <ul className="space-y-2">
        {banners.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            No banners yet. Create a promotional banner for your storefront.
          </li>
        ) : (
          banners.map((banner) => (
            <li
              key={banner.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{banner.title}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {banner.isActive ? "Active" : "Inactive"} · sort {banner.sortOrder}
                </p>
              </div>
              <div className="flex gap-2">
                {canUpdate ? (
                  <button
                    type="button"
                    className="underline text-sm"
                    onClick={() => {
                      setEditing(banner);
                      setCreating(false);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="text-sm text-red-700 underline"
                    onClick={() => {
                      if (!window.confirm("Delete this banner?")) return;
                      startTransition(async () => {
                        const result = await deleteBannerAction(banner.id);
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        setBanners((prev) => prev.filter((b) => b.id !== banner.id));
                        router.refresh();
                      });
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
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
    watch,
    formState: { errors },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema) as Resolver<BannerFormValues>,
    defaultValues: {
      ...initialValues,
      startsAt: initialValues.startsAt
        ? toDatetimeLocal(initialValues.startsAt)
        : null,
      endsAt: initialValues.endsAt ? toDatetimeLocal(initialValues.endsAt) : null,
    },
  });

  const imagePath = watch("imagePath");

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
              onError(result.error);
              return;
            }
            onSaved(result.banner);
          });
        })}
        className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      >
        <TextField
          label="Title"
          fullWidth
          required
          error={Boolean(errors.title)}
          helperText={errors.title?.message}
          {...register("title")}
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={2}
          {...register("description")}
        />
        <div className="rounded-lg border border-[var(--color-border)] p-3">
          <p className="text-sm font-medium">Image</p>
          <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
            {imagePath || "None"}
          </p>
          <button
            type="button"
            className="mt-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
            onClick={() => setMediaOpen(true)}
          >
            Choose image
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Button text" fullWidth {...register("buttonText")} />
          <TextField
            label="Link"
            fullWidth
            error={Boolean(errors.linkUrl)}
            helperText={errors.linkUrl?.message}
            {...register("linkUrl")}
          />
          <TextField
            label="Start"
            type="datetime-local"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            {...register("startsAt")}
          />
          <TextField
            label="End"
            type="datetime-local"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            {...register("endsAt")}
          />
          <TextField
            label="Sort order"
            type="number"
            fullWidth
            {...register("sortOrder", { valueAsNumber: true })}
          />
        </div>
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              }
              label="Active"
            />
          )}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save banner"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm"
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

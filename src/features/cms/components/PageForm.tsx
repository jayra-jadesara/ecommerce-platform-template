"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { createPageAction, updatePageAction } from "@/features/cms/actions";
import {
  pageFormSchema,
  type PageFormValues,
} from "@/features/cms/schemas";
import { slugify } from "@/features/catalog/slug";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";
import { AdminSeoFields } from "@/features/seo/components/AdminSeoFields";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldGroup,
  adminFormStack,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";

export function PageForm({
  mode,
  pageId,
  initialValues,
  canSubmit,
}: {
  mode: "create" | "edit";
  pageId?: string;
  initialValues: PageFormValues;
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaOpen, setMediaOpen] = useState<"featured" | "og" | null>(null);
  /** On create, keep address in sync with title until the merchant edits it. */
  const [addressLockedToTitle, setAddressLockedToTitle] = useState(
    mode === "create",
  );
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const listHref = getAdminPath("/content/pages");

  const {
    register,
    handleSubmit,
    setValue,
    setError: setFieldError,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema) as Resolver<PageFormValues>,
    defaultValues: initialValues,
  });

  const title = watch("title") ?? "";
  const slug = watch("slug") ?? "";
  const content = watch("content") ?? "";
  const seoTitle = watch("seoTitle") ?? "";
  const seoDescription = watch("seoDescription") ?? "";
  const featured = watch("featuredImagePath");
  const og = watch("ogImagePath");
  const featuredPreview = resolveCmsImageUrl(featured);
  const ogPreview = resolveCmsImageUrl(og);
  const pagePath = slug ? `/pages/${slug}` : "/pages/…";

  useEffect(() => {
    if (mode !== "create" || !addressLockedToTitle) return;
    const next = slugify(title);
    setValue("slug", next, { shouldValidate: Boolean(next), shouldDirty: true });
  }, [title, mode, addressLockedToTitle, setValue]);

  return (
    <>
      <form
        onSubmit={handleSubmit((values) => {
          if (!canSubmit) return;
          setError(null);
          const payload: PageFormValues = {
            ...values,
            slug:
              mode === "create"
                ? slugify(values.slug || values.title) || slugify(values.title)
                : values.slug,
          };
          if (!payload.slug) {
            setError("Add a page title so we can create the page address.");
            return;
          }
          startTransition(async () => {
            const result =
              mode === "create"
                ? await createPageAction(payload)
                : await updatePageAction(pageId!, payload);
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
            router.push(listHref);
            router.refresh();
          });
        })}
        className={`${adminCard()} ${adminCardPadding()} w-full`}
        style={adminStackStyle}
      >
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Page details</p>
          <p className="admin-field-group__hint">
            Pages are extra store pages shoppers can open — About, Shipping,
            Privacy, and similar. The Homepage is edited separately under Content
            → Homepage.
          </p>
          <div>
            <TextField
              label="Page title"
              fullWidth
              required
              disabled={!canSubmit || pending}
              error={Boolean(errors.title)}
              helperText={
                errors.title
                  ? undefined
                  : "Shown in the browser tab and usually as the page heading."
              }
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Page address
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {mode === "create"
                    ? "Created automatically from the title — you don’t need to type a “slug”."
                    : "Locked after create so existing links keep working."}
                </p>
              </div>
              {mode === "create" ? (
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                  onClick={() => setShowAddressEditor((v) => !v)}
                >
                  {showAddressEditor ? "Hide editor" : "Change address"}
                </button>
              ) : null}
            </div>

            <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono text-sm text-[var(--color-foreground)]">
              {pagePath}
            </p>

            <FieldError message={errors.slug?.message} />

            {mode === "create" && showAddressEditor ? (
              <TextField
                label="Short address name"
                fullWidth
                required
                disabled={!canSubmit || pending}
                error={Boolean(errors.slug)}
                helperText="Lowercase letters, numbers, and hyphens only. Example: about-us"
                value={slug}
                onChange={(e) => {
                  setAddressLockedToTitle(false);
                  setValue("slug", slugify(e.target.value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                name="slug"
              />
            ) : null}

            {/* Keep RHF registration for validation / submit without a visible technical field */}
            <input type="hidden" {...register("slug")} />
          </div>
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. Page content</p>
          <p className="admin-field-group__hint">
            Write what shoppers should read on this page.
          </p>
          <div>
            <TextField
              label="Content"
              fullWidth
              multiline
              minRows={10}
              disabled={!canSubmit || pending}
              error={Boolean(errors.content)}
              helperText={
                errors.content
                  ? undefined
                  : "Plain text for now — formatting tools can come later."
              }
              {...register("content")}
            />
            <FieldError message={errors.content?.message} />
          </div>
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Featured image (optional)</p>
          <p className="admin-field-group__hint">
            Optional hero or side image for this page.
          </p>
          <ImagePickCard
            path={featured}
            previewUrl={featuredPreview}
            disabled={!canSubmit || pending}
            onChoose={() => setMediaOpen("featured")}
            onClear={() =>
              setValue("featuredImagePath", null, { shouldDirty: true })
            }
          />
        </div>

        <details className={adminFieldGroup()} open>
          <summary className="cursor-pointer text-sm font-semibold text-[var(--color-foreground)]">
            Google &amp; SEO
          </summary>
          <div className={`mt-3 ${adminFormStack()}`} style={adminStackStyle}>
            <AdminSeoFields
              sourceTitle={title}
              sourceDescription={String(content ?? "")}
              seoTitle={String(seoTitle ?? "")}
              seoDescription={String(seoDescription ?? "")}
              onSeoTitleChange={(value) =>
                setValue("seoTitle", value, { shouldDirty: true })
              }
              onSeoDescriptionChange={(value) =>
                setValue("seoDescription", value, { shouldDirty: true })
              }
              previewUrl={pagePath.includes("…") ? "/pages/page" : pagePath}
              disabled={!canSubmit || pending}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
                Share image (optional)
              </p>
              <ImagePickCard
                path={og}
                previewUrl={ogPreview}
                disabled={!canSubmit || pending}
                onChoose={() => setMediaOpen("og")}
                onClear={() =>
                  setValue("ogImagePath", null, { shouldDirty: true })
                }
              />
            </div>
          </div>
        </details>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">4. Publish</p>
          <TextField
            select
            label="Status"
            fullWidth
            disabled={!canSubmit || pending}
            defaultValue={initialValues.status}
            helperText="Draft = only you can see it. Published = live on the store."
            {...register("status")}
          >
            <MenuItem value="draft">Draft (not public yet)</MenuItem>
            <MenuItem value="published">Published (live)</MenuItem>
            <MenuItem value="archived">Archived (hidden)</MenuItem>
          </TextField>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className={adminBtn("primary")}
          >
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create page"
                : "Save page"}
          </button>
          <button
            type="button"
            onClick={() => router.push(listHref)}
            className={adminBtn("outline")}
          >
            Cancel
          </button>
        </div>
      </form>

      <MediaPicker
        open={Boolean(mediaOpen)}
        folder="cms"
        onClose={() => setMediaOpen(null)}
        onSelect={(selection) => {
          if (mediaOpen === "featured") {
            setValue("featuredImagePath", selection.storagePath, {
              shouldDirty: true,
            });
          }
          if (mediaOpen === "og") {
            setValue("ogImagePath", selection.storagePath, {
              shouldDirty: true,
            });
          }
          setMediaOpen(null);
        }}
      />
    </>
  );
}

function ImagePickCard({
  path,
  previewUrl,
  disabled,
  onChoose,
  onClear,
}: {
  path: string | null | undefined;
  previewUrl: string | null;
  disabled?: boolean;
  onChoose: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-4"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-36 w-full rounded-lg object-cover"
        />
      ) : (
        <p className="text-sm text-[var(--color-muted)]">No image selected</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className={adminBtn("outline")}
          onClick={onChoose}
        >
          Choose image
        </button>
        {path ? (
          <button
            type="button"
            disabled={disabled}
            className={adminBtn("ghost")}
            onClick={onClear}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { createPageAction, updatePageAction } from "@/features/cms/actions";
import {
  pageFormSchema,
  type PageFormValues,
} from "@/features/cms/schemas";
import { slugify } from "@/features/catalog/slug";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import {
  insertMarkdownImageAtCaret,
  MarkdownEditor,
} from "@/features/editor";
import { MediaPicker } from "@/features/media";
import { AdminSeoFields } from "@/features/seo/components/AdminSeoFields";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
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
  const [mediaOpen, setMediaOpen] = useState<
    "featured" | "og" | "content" | null
  >(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  /** On create, keep address in sync with title until the merchant edits it. */
  const [addressLockedToTitle, setAddressLockedToTitle] = useState(
    mode === "create",
  );
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const listHref = getAdminPath("/content/pages");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError: setFieldError,
    setFocus,
    formState: { errors },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema) as Resolver<PageFormValues>,
    defaultValues: initialValues,
  });

  const title = useWatch({ control, name: "title" }) ?? "";
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const content = useWatch({ control, name: "content" }) ?? "";
  const seoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescription = useWatch({ control, name: "seoDescription" }) ?? "";
  const featured = useWatch({ control, name: "featuredImagePath" });
  const og = useWatch({ control, name: "ogImagePath" });
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
            Use the toolbar to format text. Switch to Preview anytime to see how
            it will look on your store.
          </p>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <div>
                <MarkdownEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  textareaRef={contentRef}
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.content)}
                  onRequestImage={() => setMediaOpen("content")}
                  placeholder={
                    "Write this page…\n\nTip: select text, then tap Bold or Link."
                  }
                  rows={14}
                />
                <FieldError message={errors.content?.message} />
              </div>
            )}
          />
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
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <AdminSelect
                label="Status"
                disabled={!canSubmit || pending}
                value={field.value ?? "draft"}
                onChange={field.onChange}
                name={field.name}
                helperText="Draft = only you can see it. Published = live on the store."
                options={[
                  { value: "draft", label: "Draft (not public yet)" },
                  { value: "published", label: "Published (live)" },
                  { value: "archived", label: "Archived (hidden)" },
                ]}
              />
            )}
          />
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
          if (mediaOpen === "content") {
            const url =
              selection.publicUrl ||
              resolveCmsImageUrl(selection.storagePath) ||
              selection.storagePath;
            const current = getValues("content") ?? "";
            const { next, caret } = insertMarkdownImageAtCaret(
              current,
              contentRef.current,
              url,
              selection.altText || "Image",
            );
            setValue("content", next, { shouldDirty: true, shouldValidate: true });
            requestAnimationFrame(() => {
              const node = contentRef.current;
              if (!node) return;
              node.focus();
              node.setSelectionRange(caret, caret);
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
        <div className="max-w-3xl overflow-hidden rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-foreground)_4%,var(--color-card))]">
          <div className="relative aspect-video w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        </div>
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

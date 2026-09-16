"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { updatePageAction } from "@/features/cms/actions";
import {
  LEGAL_PAGE_META,
  pageFormSchema,
  type LegalPageSlug,
  type PageFormValues,
} from "@/features/cms/schemas";
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

export function LegalPageForm({
  pageId,
  slug,
  initialValues,
  canSubmit,
}: {
  pageId: string;
  slug: LegalPageSlug;
  initialValues: PageFormValues;
  canSubmit: boolean;
}) {
  const router = useRouter();
  const meta = LEGAL_PAGE_META[slug];
  const listHref = getAdminPath("/content/legal");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaOpen, setMediaOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

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
    defaultValues: {
      ...initialValues,
      seoTitle: null,
      seoDescription: null,
      ogImagePath: null,
    },
  });

  const title = useWatch({ control, name: "title" }) ?? "";
  const content = useWatch({ control, name: "content" }) ?? "";
  const seoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescription = useWatch({ control, name: "seoDescription" }) ?? "";

  return (
    <>
      <form
        className={`${adminCard()} ${adminCardPadding()}`}
        style={adminStackStyle}
        onSubmit={handleSubmit((values) => {
          if (!canSubmit) return;
          setError(null);
          startTransition(async () => {
            const payload: PageFormValues = {
              ...values,
              slug,
              // Legal pages always use automatic SEO; no custom share image.
              seoTitle: null,
              seoDescription: null,
              ogImagePath: null,
            };
            const result = await updatePageAction(pageId, payload);
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
      >
        {error ? (
          <p className="rounded-lg border border-[var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-error)]">
            {error}
          </p>
        ) : null}

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Page details</p>
          <p className="admin-field-group__hint">
            Live at{" "}
            <Link
              href={meta.storefrontPath}
              target="_blank"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              {meta.storefrontPath}
            </Link>
            . URL is fixed for this legal page.
          </p>
          <TextField
            label="Title"
            fullWidth
            size="small"
            disabled={!canSubmit || pending}
            error={Boolean(errors.title)}
            {...register("title")}
          />
          <FieldError message={errors.title?.message} />
          <input type="hidden" {...register("slug")} value={slug} readOnly />
        </div>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. Document body</p>
          <p className="admin-field-group__hint">
            Same editor as Blog — use headings for numbered sections, lists, and
            links. Preview before publishing.
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
                  onRequestImage={() => setMediaOpen(true)}
                  placeholder={
                    "Write your legal document…\n\n## 1. Section title\n\nParagraph text…"
                  }
                  rows={22}
                />
                <FieldError message={errors.content?.message} />
              </div>
            )}
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
              previewUrl={meta.storefrontPath}
              forceAutomatic
            />
          </div>
        </details>

        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Publish</p>
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
            {pending ? "Saving…" : "Save page"}
          </button>
          <Link href={listHref} className={adminBtn("outline")}>
            Cancel
          </Link>
          <Link
            href={meta.storefrontPath}
            target="_blank"
            className={adminBtn("ghost")}
          >
            Preview storefront
          </Link>
        </div>
      </form>

      <MediaPicker
        open={mediaOpen}
        folder="cms"
        onClose={() => setMediaOpen(false)}
        onSelect={(selection) => {
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
          setValue("content", next, {
            shouldDirty: true,
            shouldValidate: true,
          });
          requestAnimationFrame(() => {
            const node = contentRef.current;
            if (!node) return;
            node.focus();
            node.setSelectionRange(caret, caret);
          });
          setMediaOpen(false);
        }}
      />
    </>
  );
}

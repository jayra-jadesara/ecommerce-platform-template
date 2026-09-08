"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { createPageAction, updatePageAction } from "@/features/cms/actions";
import {
  pageFormSchema,
  type PageFormValues,
} from "@/features/cms/schemas";
import { MediaPicker } from "@/features/media";

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
  const listHref = getAdminPath("/content/pages");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema) as Resolver<PageFormValues>,
    defaultValues: initialValues,
  });

  const featured = watch("featuredImagePath");
  const og = watch("ogImagePath");

  return (
    <>
      <form
        onSubmit={handleSubmit((values) => {
          if (!canSubmit) return;
          setError(null);
          startTransition(async () => {
            const result =
              mode === "create"
                ? await createPageAction(values)
                : await updatePageAction(pageId!, values);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(listHref);
            router.refresh();
          });
        })}
        className="mx-auto max-w-2xl space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
      >
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <TextField
          label="Title"
          fullWidth
          required
          disabled={!canSubmit || pending}
          error={Boolean(errors.title)}
          helperText={errors.title?.message}
          {...register("title")}
        />
        <TextField
          label="URL slug"
          fullWidth
          required
          disabled={!canSubmit || pending || mode === "edit"}
          error={Boolean(errors.slug)}
          helperText={errors.slug?.message ?? "Example: about-us"}
          {...register("slug")}
        />
        <TextField
          label="Content"
          fullWidth
          multiline
          minRows={8}
          disabled={!canSubmit || pending}
          error={Boolean(errors.content)}
          helperText={errors.content?.message ?? "Plain text for now — no scripts."}
          {...register("content")}
        />

        <div className="rounded-lg border border-[var(--color-border)] p-3">
          <p className="text-sm font-medium">Featured image</p>
          <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
            {featured || "None"}
          </p>
          <button
            type="button"
            className="mt-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
            onClick={() => setMediaOpen("featured")}
          >
            Choose image
          </button>
        </div>

        <details className="rounded-lg border border-[var(--color-border)] p-3">
          <summary className="cursor-pointer text-sm font-medium">SEO</summary>
          <div className="mt-3 space-y-3">
            <TextField
              label="SEO title"
              fullWidth
              disabled={!canSubmit || pending}
              {...register("seoTitle")}
            />
            <TextField
              label="SEO description"
              fullWidth
              multiline
              minRows={2}
              disabled={!canSubmit || pending}
              {...register("seoDescription")}
            />
            <div>
              <p className="text-sm font-medium">Share image</p>
              <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                {og || "None"}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
                onClick={() => setMediaOpen("og")}
              >
                Choose image
              </button>
            </div>
          </div>
        </details>

        <TextField
          select
          label="Status"
          fullWidth
          disabled={!canSubmit || pending}
          defaultValue={initialValues.status}
          {...register("status")}
        >
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
          >
            {pending ? "Saving…" : mode === "create" ? "Create page" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.push(listHref)}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm"
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
            setValue("featuredImagePath", selection.storagePath, { shouldDirty: true });
          }
          if (mediaOpen === "og") {
            setValue("ogImagePath", selection.storagePath, { shouldDirty: true });
          }
          setMediaOpen(null);
        }}
      />
    </>
  );
}

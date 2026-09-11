"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { saveBlogSettingsAction } from "@/features/blog/actions";
import {
  blogSettingsFormSchema,
  type BlogSettingsFormValues,
} from "@/features/blog/schemas";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

type FeaturedOption = { id: string; title: string };

export function BlogSettingsForm({
  initialValues,
  canUpdate,
  featuredOptions = [],
}: {
  initialValues: BlogSettingsFormValues;
  canUpdate: boolean;
  featuredOptions?: FeaturedOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listHref = getAdminPath("/content/blog");

  const { control, handleSubmit, watch } = useForm<BlogSettingsFormValues>({
    resolver: zodResolver(
      blogSettingsFormSchema,
    ) as Resolver<BlogSettingsFormValues>,
    defaultValues: initialValues,
  });

  const showFeaturedPost = watch("showFeaturedPost");
  const sidebarPreset = watch("sidebarPreset");
  const showCta = Boolean(
    watch("ctaTitle") ||
      watch("ctaDescription") ||
      watch("ctaButtonLabel") ||
      watch("ctaButtonHref"),
  );

  return (
    <div className="space-y-4">
      <Link
        href={listHref}
        className="text-sm font-medium underline underline-offset-2"
      >
        ← Back to articles
      </Link>

      <form
        onSubmit={handleSubmit((values) => {
          if (!canUpdate) return;
          setError(null);
          setSuccess(null);
          startTransition(async () => {
            const result = await saveBlogSettingsAction(values);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess(result.message ?? "Saved.");
            router.refresh();
          });
        })}
        className={adminCardsGrid()}
      >
        {error ? (
          <p className="admin-cards-grid__full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="admin-cards-grid__full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {success}
          </p>
        ) : null}

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">General &amp; SEO</p>
            <p className="admin-field-group__hint">
              Blog title and description appear on the page and in search
              results for /blog.
            </p>
            <div className={adminFieldsGrid(1)}>
              <Controller
                name="pageTitle"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Blog title"
                    fullWidth
                    required
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="pageDescription"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Blog description"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={!canUpdate || pending}
                  />
                )}
              />
              <Controller
                name="postsPerPage"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Posts per page"
                    fullWidth
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error?.message ?? "Between 1 and 48."
                    }
                  />
                )}
              />
              <Controller
                name="featuredPostId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    select
                    label="Featured article"
                    fullWidth
                    disabled={!canUpdate || pending || !showFeaturedPost}
                    helperText={
                      showFeaturedPost
                        ? "Optional. Leave blank to use a marked featured post or the latest article."
                        : "Turn on Featured below to choose an article."
                    }
                  >
                    <MenuItem value="">Automatic</MenuItem>
                    {featuredOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </div>
          </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">Appearance</p>
            <p className="admin-field-group__hint">
              Layout and card style for the blog listing.
            </p>
            <div className={adminFieldsGrid(1)}>
              <Controller
                name="layoutPreset"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Post layout"
                    fullWidth
                    disabled={!canUpdate || pending}
                  >
                    <MenuItem value="GRID">Grid</MenuItem>
                    <MenuItem value="LIST">List</MenuItem>
                  </TextField>
                )}
              />
              <Controller
                name="cardStyle"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Card style"
                    fullWidth
                    disabled={!canUpdate || pending}
                  >
                    <MenuItem value="STANDARD">Standard</MenuItem>
                    <MenuItem value="MINIMAL">Minimal</MenuItem>
                    <MenuItem value="EDITORIAL">Editorial</MenuItem>
                  </TextField>
                )}
              />
            </div>
            <Controller
              name="showFeaturedPost"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show featured article"
                />
              )}
            />
            {showFeaturedPost ? (
              <Controller
                name="autoFeaturedFallback"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(_, v) => field.onChange(v)}
                        disabled={!canUpdate || pending}
                      />
                    }
                    label="Use latest article when none is featured"
                  />
                )}
              />
            ) : null}
          </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">Sidebar &amp; filters</p>
            <p className="admin-field-group__hint">
              Where shoppers browse categories. Mobile always uses chips when
              categories are shown.
            </p>
            <Controller
              name="showCategories"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show category navigation"
                />
              )}
            />
            <Controller
              name="showSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show search"
                />
              )}
            />
            <Controller
              name="sidebarPreset"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Sidebar placement"
                  fullWidth
                  disabled={!canUpdate || pending}
                >
                  <MenuItem value="RIGHT">Right</MenuItem>
                  <MenuItem value="LEFT">Left</MenuItem>
                  <MenuItem value="TOP">Top (chips)</MenuItem>
                  <MenuItem value="NONE">Hidden</MenuItem>
                </TextField>
              )}
            />
            {sidebarPreset !== "NONE" && sidebarPreset !== "TOP" ? (
              <Controller
                name="showSidebar"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(_, v) => field.onChange(v)}
                        disabled={!canUpdate || pending}
                      />
                    }
                    label="Show sidebar on desktop"
                  />
                )}
              />
            ) : null}
          </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">Article display</p>
            <p className="admin-field-group__hint">
              Metadata and media on cards and article pages.
            </p>
            <Controller
              name="showAuthor"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show author"
                />
              )}
            />
            <Controller
              name="showDate"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show date"
                />
              )}
            />
            <Controller
              name="showReadingTime"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show reading time"
                />
              )}
            />
            <Controller
              name="showFeaturedImage"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show featured image"
                />
              )}
            />
            <Controller
              name="showRelatedPosts"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show related articles"
                />
              )}
            />
            <Controller
              name="showRelatedProducts"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show related products"
                />
              )}
            />
          </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">Sharing</p>
            <p className="admin-field-group__hint">
              Social share controls on article pages.
            </p>
            <Controller
              name="showShareButtons"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Show share buttons"
                />
              )}
            />
          </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()} admin-cards-grid__full`}
          style={adminStackStyle}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">Article CTA (optional)</p>
            <p className="admin-field-group__hint">
              A call-to-action shown at the bottom of every article. Leave blank
              to hide.
            </p>
            <div className={adminFieldsGrid(2)}>
              <Controller
                name="ctaTitle"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="CTA title"
                    fullWidth
                    disabled={!canUpdate || pending}
                  />
                )}
              />
              <Controller
                name="ctaButtonLabel"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Button label"
                    fullWidth
                    disabled={!canUpdate || pending}
                  />
                )}
              />
              <Controller
                name="ctaDescription"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="CTA description"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={!canUpdate || pending}
                    className="admin-cards-grid__full"
                  />
                )}
              />
              <Controller
                name="ctaButtonHref"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Button link"
                    fullWidth
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error?.message ??
                      "Internal path (e.g. /products) or https URL."
                    }
                  />
                )}
              />
            </div>
            {showCta ? (
              <p className="text-xs text-[var(--color-muted)]">
                CTA will appear when title or button fields are filled.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={!canUpdate || pending}
              className={adminBtn("primary")}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <Link href={listHref} className={adminBtn("outline")}>
              Cancel
            </Link>
            <Link
              href="/blog"
              target="_blank"
              rel="noreferrer"
              className={adminBtn("outline")}
            >
              View blog
            </Link>
          </div>
        </section>
      </form>
    </div>
  );
}

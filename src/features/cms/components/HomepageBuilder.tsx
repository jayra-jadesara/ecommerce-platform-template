"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  createSectionAction,
  deleteSectionAction,
  duplicateSectionAction,
  moveSectionAction,
  publishPageAction,
  unpublishPageAction,
  updateSectionAction,
} from "@/features/cms/actions";
import {
  defaultConfigForType,
  SECTION_ANIMATION_PRESETS,
  SECTION_BACKGROUND_STYLES,
  SECTION_SPACING_PRESETS,
  SECTION_TYPE_DESCRIPTIONS,
  SECTION_TYPE_LABELS,
  SUPPORTED_SECTION_TYPES,
  type SectionConfigMap,
  type SupportedSectionType,
} from "@/features/cms/schemas";
import type { ContentPage, ContentSection } from "@/features/cms/types";
import { MediaPicker } from "@/features/media";
import { HomepagePreview } from "@/features/cms/components/HomepagePreview";

type Props = {
  page: ContentPage;
  initialSections: ContentSection[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
};

type EditableConfig = Record<string, unknown>;

export function HomepageBuilder({
  page,
  initialSections,
  canCreate,
  canUpdate,
  canDelete,
  canPublish,
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [status, setStatus] = useState(page.status);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<EditableConfig>({});
  const [editTitle, setEditTitle] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaField, setMediaField] = useState<string | null>(null);

  const editing = useMemo(
    () => sections.find((s) => s.id === editId) ?? null,
    [sections, editId],
  );

  function refresh() {
    router.refresh();
  }

  function openEditor(section: ContentSection) {
    const type = section.sectionType as SupportedSectionType;
    const defaults = defaultConfigForType(
      SUPPORTED_SECTION_TYPES.includes(type as SupportedSectionType)
        ? type
        : "text",
    );
    setEditId(section.id);
    setEditTitle(section.title ?? "");
    setEditConfig({ ...defaults, ...section.config });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            Your homepage is made of sections. Changes stay in draft until you publish.
          </p>
          <p className="mt-1 text-sm">
            Status:{" "}
            <span className="font-medium capitalize">{status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </button>
          {canPublish ? (
            status === "published" ? (
              <button
                type="button"
                disabled={pending}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const result = await unpublishPageAction(page.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setStatus("draft");
                    setMessage("Homepage unpublished (draft).");
                    refresh();
                  });
                }}
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const result = await publishPageAction(page.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setStatus("published");
                    setMessage("Homepage published.");
                    refresh();
                  });
                }}
              >
                Publish
              </button>
            )
          ) : null}
          <Link
            href="/"
            target="_blank"
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
          >
            View live site
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--color-muted)]" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Sections</h2>
        {canCreate ? (
          <button
            type="button"
            className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
            onClick={() => setAddOpen(true)}
          >
            + Add section
          </button>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
          No sections yet. Add a Hero Banner to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {sections.map((section, index) => {
            const label =
              SECTION_TYPE_LABELS[section.sectionType as SupportedSectionType] ??
              section.sectionType;
            const description =
              SECTION_TYPE_DESCRIPTIONS[
                section.sectionType as SupportedSectionType
              ] ?? "";
            return (
              <li
                key={section.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {section.title?.trim() || label}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                      {description}
                    </p>
                    <p className="mt-1 text-xs font-medium">
                      {section.isActive ? "ON" : "OFF"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canUpdate ? (
                      <>
                        <button
                          type="button"
                          disabled={pending || index === 0}
                          aria-label="Move section up"
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm disabled:opacity-40"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await moveSectionAction({
                                sectionId: section.id,
                                direction: "up",
                              });
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              refresh();
                              setSections((prev) => {
                                const next = [...prev];
                                const i = next.findIndex((s) => s.id === section.id);
                                if (i <= 0) return prev;
                                const tmp = next[i - 1]!;
                                next[i - 1] = next[i]!;
                                next[i] = tmp;
                                return next;
                              });
                            });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={pending || index === sections.length - 1}
                          aria-label="Move section down"
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm disabled:opacity-40"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await moveSectionAction({
                                sectionId: section.id,
                                direction: "down",
                              });
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              refresh();
                              setSections((prev) => {
                                const next = [...prev];
                                const i = next.findIndex((s) => s.id === section.id);
                                if (i < 0 || i >= next.length - 1) return prev;
                                const tmp = next[i + 1]!;
                                next[i + 1] = next[i]!;
                                next[i] = tmp;
                                return next;
                              });
                            });
                          }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                          onClick={() => openEditor(section)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm disabled:opacity-50"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await updateSectionAction({
                                sectionId: section.id,
                                isActive: !section.isActive,
                              });
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setSections((prev) =>
                                prev.map((s) =>
                                  s.id === section.id
                                    ? { ...s, isActive: !s.isActive }
                                    : s,
                                ),
                              );
                              refresh();
                            });
                          }}
                        >
                          {section.isActive ? "Disable" : "Enable"}
                        </button>
                      </>
                    ) : null}
                    {canCreate ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                        onClick={() => {
                          startTransition(async () => {
                            const result = await duplicateSectionAction(section.id);
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            if (result.section) {
                              setSections((prev) => [...prev, result.section!]);
                            }
                            refresh();
                          });
                        }}
                      >
                        Duplicate
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-700"
                        onClick={() => {
                          if (!window.confirm("Delete this section?")) return;
                          startTransition(async () => {
                            const result = await deleteSectionAction(section.id);
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            setSections((prev) =>
                              prev.filter((s) => s.id !== section.id),
                            );
                            refresh();
                          });
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add section</DialogTitle>
        <DialogContent dividers>
          <ul className="space-y-2">
            {SUPPORTED_SECTION_TYPES.filter((t) => t !== "text" && t !== "image").map(
              (type) => (
                <li key={type}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-left hover:border-[var(--color-primary)]"
                    onClick={() => {
                      startTransition(async () => {
                        const result = await createSectionAction({
                          pageId: page.id,
                          sectionType: type,
                          title: SECTION_TYPE_LABELS[type],
                        });
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        if (result.section) {
                          setSections((prev) => [...prev, result.section!]);
                        }
                        setAddOpen(false);
                        refresh();
                      });
                    }}
                  >
                    <p className="font-medium">{SECTION_TYPE_LABELS[type]}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {SECTION_TYPE_DESCRIPTIONS[type]}
                    </p>
                  </button>
                </li>
              ),
            )}
          </ul>
        </DialogContent>
        <DialogActions>
          <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-2 text-sm">
            Cancel
          </button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Edit{" "}
          {editing
            ? SECTION_TYPE_LABELS[editing.sectionType as SupportedSectionType] ??
              "section"
            : "section"}
        </DialogTitle>
        <DialogContent dividers className="space-y-3">
          {editing ? (
            <SectionConfigFields
              sectionType={editing.sectionType as SupportedSectionType}
              config={editConfig}
              title={editTitle}
              onTitleChange={setEditTitle}
              onChange={setEditConfig}
              onPickMedia={(field) => setMediaField(field)}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <button type="button" className="px-3 py-2 text-sm" onClick={() => setEditId(null)}>
            Cancel
          </button>
          {canUpdate ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
              onClick={() => {
                if (!editing) return;
                startTransition(async () => {
                  const result = await updateSectionAction({
                    sectionId: editing.id,
                    title: editTitle || null,
                    config: editConfig,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === editing.id
                        ? {
                            ...s,
                            title: editTitle || null,
                            config: editConfig,
                          }
                        : s,
                    ),
                  );
                  setEditId(null);
                  setMessage("Section saved (draft until you publish).");
                  refresh();
                });
              }}
            >
              Save section
            </button>
          ) : null}
        </DialogActions>
      </Dialog>

      <MediaPicker
        open={Boolean(mediaField)}
        folder="cms"
        onClose={() => setMediaField(null)}
        onSelect={(selection) => {
          if (!mediaField) return;
          setEditConfig((prev) => ({
            ...prev,
            [mediaField]: selection.storagePath,
          }));
          setMediaField(null);
        }}
      />

      <HomepagePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        sections={sections}
      />
    </div>
  );
}

function SectionConfigFields({
  sectionType,
  config,
  title,
  onTitleChange,
  onChange,
  onPickMedia,
}: {
  sectionType: SupportedSectionType;
  config: EditableConfig;
  title: string;
  onTitleChange: (value: string) => void;
  onChange: (value: EditableConfig) => void;
  onPickMedia: (field: string) => void;
}) {
  function setField(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
      <TextField
        label="Section label (admin only)"
        fullWidth
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        helperText="Shown in the builder list"
      />

      {(sectionType === "hero" ||
        sectionType === "categories" ||
        sectionType === "products" ||
        sectionType === "banner" ||
        sectionType === "features" ||
        sectionType === "statistics" ||
        sectionType === "testimonials" ||
        sectionType === "faq" ||
        sectionType === "newsletter" ||
        sectionType === "text") && (
        <TextField
          label="Title / heading"
          fullWidth
          value={String(config.title ?? config.heading ?? "")}
          onChange={(e) => {
            if (sectionType === "text") {
              setField("heading", e.target.value);
            } else {
              setField("title", e.target.value);
            }
          }}
        />
      )}

      {sectionType === "hero" ? (
        <>
          <TextField
            label="Title"
            fullWidth
            value={String(config.title ?? "")}
            onChange={(e) => setField("title", e.target.value)}
          />
          <TextField
            label="Subtitle"
            fullWidth
            value={String(config.subtitle ?? "")}
            onChange={(e) => setField("subtitle", e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={String(config.description ?? "")}
            onChange={(e) => setField("description", e.target.value)}
          />
          <ImageField
            label="Background image"
            value={config.backgroundImagePath as string | null}
            onPick={() => onPickMedia("backgroundImagePath")}
            onClear={() => setField("backgroundImagePath", null)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Primary button text"
              fullWidth
              value={String(config.primaryButtonText ?? "")}
              onChange={(e) => setField("primaryButtonText", e.target.value)}
            />
            <TextField
              label="Primary button link"
              fullWidth
              value={String(config.primaryButtonLink ?? "")}
              onChange={(e) => setField("primaryButtonLink", e.target.value || null)}
            />
            <TextField
              label="Secondary button text"
              fullWidth
              value={String(config.secondaryButtonText ?? "")}
              onChange={(e) => setField("secondaryButtonText", e.target.value)}
            />
            <TextField
              label="Secondary button link"
              fullWidth
              value={String(config.secondaryButtonLink ?? "")}
              onChange={(e) => setField("secondaryButtonLink", e.target.value || null)}
            />
          </div>
          <TextField
            select
            label="Alignment"
            fullWidth
            value={String(config.alignment ?? "left")}
            onChange={(e) => setField("alignment", e.target.value)}
          >
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="center">Center</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(config.enable3d)}
                onChange={(e) => setField("enable3d", e.target.checked)}
              />
            }
            label="Enable decorative 3D backdrop"
          />
          <TextField
            select
            label="3D scene preset"
            fullWidth
            disabled={!config.enable3d}
            value={String(config.scene3dPreset ?? "NONE")}
            onChange={(e) => setField("scene3dPreset", e.target.value)}
            helperText="Only predefined scenes. Store Appearance → 3D settings must also be on."
          >
            <MenuItem value="NONE">None (2D only)</MenuItem>
            <MenuItem value="FLOATING_SHAPES">Floating shapes</MenuItem>
            <MenuItem value="PRODUCT_ORBIT">Soft orbit</MenuItem>
            <MenuItem value="ABSTRACT_PARTICLES">Soft particles</MenuItem>
            <MenuItem value="SOFT_GEOMETRY">Soft geometry</MenuItem>
          </TextField>
        </>
      ) : null}

      {sectionType === "about" || sectionType === "cta" || sectionType === "text_image" ? (
        <>
          <TextField
            label="Heading"
            fullWidth
            value={String(config.heading ?? "")}
            onChange={(e) => setField("heading", e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={4}
            value={String(config.description ?? "")}
            onChange={(e) => setField("description", e.target.value)}
          />
          {sectionType !== "cta" ? (
            <ImageField
              label="Image"
              value={config.imagePath as string | null}
              onPick={() => onPickMedia("imagePath")}
              onClear={() => setField("imagePath", null)}
            />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Button text"
              fullWidth
              value={String(config.buttonText ?? "")}
              onChange={(e) => setField("buttonText", e.target.value)}
            />
            <TextField
              label="Button link"
              fullWidth
              value={String(config.buttonLink ?? "")}
              onChange={(e) => setField("buttonLink", e.target.value || null)}
            />
          </div>
          {sectionType === "text_image" ? (
            <TextField
              select
              label="Image position"
              fullWidth
              value={String(config.imagePosition ?? "right")}
              onChange={(e) => setField("imagePosition", e.target.value)}
            >
              <MenuItem value="left">Left</MenuItem>
              <MenuItem value="right">Right</MenuItem>
            </TextField>
          ) : null}
        </>
      ) : null}

      {sectionType === "categories" || sectionType === "products" || sectionType === "banner" || sectionType === "newsletter" ? (
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={2}
          value={String(config.description ?? "")}
          onChange={(e) => setField("description", e.target.value)}
        />
      ) : null}

      {sectionType === "products" ? (
        <>
          <TextField
            select
            label="Product source"
            fullWidth
            value={String(config.source ?? "FEATURED_PRODUCTS")}
            onChange={(e) => setField("source", e.target.value)}
          >
            <MenuItem value="FEATURED_PRODUCTS">Featured products</MenuItem>
            <MenuItem value="LATEST_PRODUCTS">Latest products</MenuItem>
            <MenuItem value="CATEGORY_PRODUCTS">Products in a category</MenuItem>
            <MenuItem value="SELECTED_PRODUCTS">Selected products</MenuItem>
          </TextField>
          <TextField
            label="How many to show"
            type="number"
            fullWidth
            value={Number(config.limit ?? 8)}
            onChange={(e) => setField("limit", Number(e.target.value) || 8)}
            slotProps={{ htmlInput: { min: 1, max: 24 } }}
          />
          {config.source === "CATEGORY_PRODUCTS" ? (
            <TextField
              label="Category ID"
              fullWidth
              helperText="Paste a category ID from Products → Categories"
              value={String(config.categoryId ?? "")}
              onChange={(e) => setField("categoryId", e.target.value || null)}
            />
          ) : null}
          {config.source === "SELECTED_PRODUCTS" ? (
            <TextField
              label="Product IDs (comma-separated)"
              fullWidth
              helperText="Paste product IDs separated by commas"
              value={Array.isArray(config.productIds) ? (config.productIds as string[]).join(", ") : ""}
              onChange={(e) =>
                setField(
                  "productIds",
                  e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                )
              }
            />
          ) : null}
        </>
      ) : null}

      {sectionType === "categories" ? (
        <>
          <TextField
            label="Category IDs (comma-separated, optional)"
            fullWidth
            helperText="Leave blank to show all active categories"
            value={
              Array.isArray(config.categoryIds)
                ? (config.categoryIds as string[]).join(", ")
                : ""
            }
            onChange={(e) =>
              setField(
                "categoryIds",
                e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              )
            }
          />
          <TextField
            select
            label="Columns"
            fullWidth
            value={Number(config.columns ?? 3)}
            onChange={(e) => setField("columns", Number(e.target.value))}
          >
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={4}>4</MenuItem>
          </TextField>
        </>
      ) : null}

      {sectionType === "banner" ? (
        <>
          <ImageField
            label="Banner image"
            value={config.imagePath as string | null}
            onPick={() => onPickMedia("imagePath")}
            onClear={() => setField("imagePath", null)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Button text"
              fullWidth
              value={String(config.buttonText ?? "")}
              onChange={(e) => setField("buttonText", e.target.value)}
            />
            <TextField
              label="Link"
              fullWidth
              value={String(config.link ?? "")}
              onChange={(e) => setField("link", e.target.value || null)}
            />
          </div>
        </>
      ) : null}

      {sectionType === "features" ? (
        <JsonListEditor
          label="Features (one per line: icon|title|description)"
          hint="Icons: star, shield, truck, heart, leaf, check, globe, clock, package, support"
          value={(config.items as SectionConfigMap["features"]["items"] | undefined)
            ?.map((i) => `${i.icon}|${i.title}|${i.description}`)
            .join("\n") ?? ""}
          onChange={(text) => {
            const items = text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [icon, title, ...rest] = line.split("|");
                return {
                  icon: (icon || "star").trim(),
                  title: (title || "").trim(),
                  description: rest.join("|").trim(),
                };
              });
            setField("items", items);
          }}
        />
      ) : null}

      {sectionType === "statistics" ? (
        <JsonListEditor
          label="Statistics (one per line: value|label)"
          value={(config.items as SectionConfigMap["statistics"]["items"] | undefined)
            ?.map((i) => `${i.value}|${i.label}`)
            .join("\n") ?? ""}
          onChange={(text) => {
            const items = text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [value, ...rest] = line.split("|");
                return { value: (value || "").trim(), label: rest.join("|").trim() };
              });
            setField("items", items);
          }}
        />
      ) : null}

      {sectionType === "testimonials" ? (
        <JsonListEditor
          label="Testimonials (one per line: name|title|quote|rating)"
          value={(config.items as SectionConfigMap["testimonials"]["items"] | undefined)
            ?.map((i) =>
              [i.customerName, i.companyOrTitle, i.quote, i.rating ?? ""].join("|"),
            )
            .join("\n") ?? ""}
          onChange={(text) => {
            const items = text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [customerName, companyOrTitle, quote, rating] = line.split("|");
                const r = rating ? Number(rating) : null;
                return {
                  customerName: (customerName || "").trim(),
                  companyOrTitle: (companyOrTitle || "").trim(),
                  quote: (quote || "").trim(),
                  imagePath: null,
                  rating: r && r >= 1 && r <= 5 ? r : null,
                };
              });
            setField("items", items);
          }}
        />
      ) : null}

      {sectionType === "faq" ? (
        <JsonListEditor
          label="FAQ (one per line: question|answer)"
          value={(config.items as SectionConfigMap["faq"]["items"] | undefined)
            ?.map((i) => `${i.question}|${i.answer}`)
            .join("\n") ?? ""}
          onChange={(text) => {
            const items = text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [question, ...rest] = line.split("|");
                return {
                  question: (question || "").trim(),
                  answer: rest.join("|").trim(),
                  active: true,
                };
              });
            setField("items", items);
          }}
        />
      ) : null}

      {sectionType === "newsletter" ? (
        <TextField
          label="Button text"
          fullWidth
          value={String(config.buttonText ?? "Subscribe")}
          onChange={(e) => setField("buttonText", e.target.value)}
        />
      ) : null}

      <details className="rounded-lg border border-[var(--color-border)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField
            select
            label="Background"
            fullWidth
            value={String(config.backgroundStyle ?? "default")}
            onChange={(e) => setField("backgroundStyle", e.target.value)}
          >
            {SECTION_BACKGROUND_STYLES.map((style) => (
              <MenuItem key={style} value={style}>
                {style}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Spacing"
            fullWidth
            value={String(config.spacingPreset ?? "normal")}
            onChange={(e) => setField("spacingPreset", e.target.value)}
          >
            {SECTION_SPACING_PRESETS.map((style) => (
              <MenuItem key={style} value={style}>
                {style}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Animation"
            fullWidth
            value={String(config.animationPreset ?? "fade-up")}
            onChange={(e) => setField("animationPreset", e.target.value)}
          >
            {SECTION_ANIMATION_PRESETS.map((style) => (
              <MenuItem key={style} value={style}>
                {style}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={config.animationEnabled !== false}
                onChange={(_, checked) => setField("animationEnabled", checked)}
              />
            }
            label="Animation enabled"
          />
        </div>
      </details>
    </div>
  );
}

function ImageField({
  label,
  value,
  onPick,
  onClear,
}: {
  label: string;
  value: string | null | undefined;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
        {value || "No image selected"}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onPick}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
        >
          Choose image
        </button>
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function JsonListEditor({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <TextField
      label={label}
      fullWidth
      multiline
      minRows={4}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={hint}
    />
  );
}

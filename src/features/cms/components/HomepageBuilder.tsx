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
  HERO_LAYOUT_PRESETS,
  HERO_LAYOUT_PRESET_LABELS,
  SECTION_ANIMATION_PRESETS,
  SECTION_BACKGROUND_STYLES,
  SECTION_SPACING_PRESETS,
  SECTION_TYPE_DESCRIPTIONS,
  SECTION_TYPE_LABELS,
  SUPPORTED_SECTION_TYPES,
  type HeroLayoutPreset,
  type SectionConfigMap,
  type SupportedSectionType,
} from "@/features/cms/schemas";
import type { ContentPage, ContentSection } from "@/features/cms/types";
import { MediaPicker } from "@/features/media";
import { HomepagePreview } from "@/features/cms/components/HomepagePreview";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { SectionEditorPreview } from "@/features/cms/components/SectionEditorPreview";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";
import {
  adminFieldGroup,
  adminFieldsGrid,
  adminFormStack,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

type Props = {
  page: ContentPage;
  initialSections: ContentSection[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  /** Shown in helper copy (default: Homepage). */
  pageLabel?: string;
};

type EditableConfig = Record<string, unknown>;

export function HomepageBuilder({
  page,
  initialSections,
  canCreate,
  canUpdate,
  canDelete,
  canPublish,
  pageLabel = "Homepage",
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
    setEditTitle(
      section.title?.trim() ||
        SECTION_TYPE_LABELS[section.sectionType as SupportedSectionType] ||
        "",
    );
    setEditConfig({
      ...defaults,
      ...section.config,
      motionSource:
        (section.config as { motionSource?: string }).motionSource === "custom"
          ? "custom"
          : "global",
      threeSource:
        (section.config as { threeSource?: string }).threeSource === "custom"
          ? "custom"
          : "global",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            Your {pageLabel.toLowerCase()} is made of sections. Changes stay in draft until you publish.
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
                    setMessage(`${pageLabel} unpublished (draft).`);
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
                    setMessage(`${pageLabel} published.`);
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
        <ul className="space-y-3">
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
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
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
        maxWidth="lg"
      >
        <DialogTitle>
          Edit{" "}
          {editing
            ? SECTION_TYPE_LABELS[editing.sectionType as SupportedSectionType] ??
              "section"
            : "section"}
        </DialogTitle>
        <DialogContent dividers className="!pt-4">
          {editing ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] lg:items-start">
              <div className="order-1 lg:order-2 lg:sticky lg:top-0">
                <SectionEditorPreview
                  sectionType={editing.sectionType as SupportedSectionType}
                  config={editConfig}
                />
              </div>
              <div className="order-2 lg:order-1">
                <SectionConfigFields
                  sectionType={editing.sectionType as SupportedSectionType}
                  config={editConfig}
                  title={editTitle}
                  onTitleChange={setEditTitle}
                  onChange={setEditConfig}
                  onPickMedia={(field) => setMediaField(field)}
                />
              </div>
            </div>
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
                    title:
                      editTitle.trim() ||
                      SECTION_TYPE_LABELS[
                        editing.sectionType as SupportedSectionType
                      ] ||
                      null,
                    config: {
                      ...editConfig,
                      motionSource: editConfig.motionSource ?? "global",
                      threeSource: editConfig.threeSource ?? "global",
                      // When using store defaults, clear section-level 3D flags.
                      ...(editConfig.threeSource === "custom"
                        ? {}
                        : { enable3d: false, scene3dPreset: "NONE" }),
                    },
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
                            title:
                              editTitle.trim() ||
                              SECTION_TYPE_LABELS[
                                editing.sectionType as SupportedSectionType
                              ] ||
                              null,
                            config: {
                              ...editConfig,
                              motionSource: editConfig.motionSource ?? "global",
                              threeSource: editConfig.threeSource ?? "global",
                              ...(editConfig.threeSource === "custom"
                                ? {}
                                : { enable3d: false, scene3dPreset: "NONE" }),
                            },
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
          setEditConfig((prev) => {
            const nested = mediaField.match(
              /^timelineItems\.(\d+)\.logoPath$/,
            );
            if (nested) {
              const index = Number(nested[1]);
              const items = [
                ...((prev.timelineItems as Array<Record<string, unknown>>) ??
                  []),
              ];
              items[index] = {
                ...(items[index] ?? {}),
                logoPath: selection.storagePath,
              };
              return { ...prev, timelineItems: items };
            }
            return {
              ...prev,
              [mediaField]: selection.storagePath,
            };
          });
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
  title: _title,
  onTitleChange: _onTitleChange,
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
  void _onTitleChange;
  function setField(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  const typeLabel = SECTION_TYPE_LABELS[sectionType];
  const listLabel = _title.trim() || typeLabel;

  const showSharedTitle =
    sectionType !== "hero" &&
    sectionType !== "about" &&
    sectionType !== "cta" &&
    sectionType !== "text_image" &&
    (sectionType === "categories" ||
      sectionType === "products" ||
      sectionType === "banner" ||
      sectionType === "features" ||
      sectionType === "statistics" ||
      sectionType === "testimonials" ||
      sectionType === "faq" ||
      sectionType === "newsletter" ||
      sectionType === "text");

  return (
    <div className={adminFormStack()} style={adminStackStyle}>
      <TextField
        label="Section name (in admin list)"
        fullWidth
        value={listLabel}
        disabled
        helperText="Auto-filled from the section type. Shoppers never see this."
      />

      {showSharedTitle ? (
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">Section heading</p>
          <p className="admin-field-group__hint">
            Shown on the live storefront above this block. Watch the preview.
          </p>
          <TextField
            label="Heading customers see"
            fullWidth
            value={String(config.title ?? config.heading ?? "")}
            onChange={(e) => {
              if (sectionType === "text") {
                setField("heading", e.target.value);
              } else {
                setField("title", e.target.value);
              }
            }}
            helperText="Example: Featured products"
          />
        </div>
      ) : null}

      {sectionType === "hero" ? (
        <>
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">1. Hero text</p>
            <p className="admin-field-group__hint">
              Write what shoppers read first — preview updates instantly.
            </p>
            <TextField
              label="Main headline"
              fullWidth
              value={String(config.title ?? "")}
              onChange={(e) => setField("title", e.target.value)}
              helperText="Big title — keep it short (about 6–10 words)."
            />
            <TextField
              label="Small line above headline (optional)"
              fullWidth
              value={String(config.subtitle ?? "")}
              onChange={(e) => setField("subtitle", e.target.value)}
              helperText="Example: LEADING MANUFACTURER OF SEASONING SPICES"
            />
            <TextField
              label="Short supporting text"
              fullWidth
              multiline
              minRows={3}
              value={String(config.description ?? "")}
              onChange={(e) => setField("description", e.target.value)}
              helperText="1–2 sentences under the headline."
            />
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">2. Buttons</p>
            <p className="admin-field-group__hint">
              Choose button text and which store page opens. See destinations in
              the preview.
            </p>

            <div
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <p className="text-xs font-semibold text-[var(--color-foreground)]">
                Main button (primary)
              </p>
              <TextField
                label="Button text shoppers see"
                fullWidth
                value={String(config.primaryButtonText ?? "")}
                onChange={(e) => setField("primaryButtonText", e.target.value)}
                placeholder="Shop products"
                helperText="Leave blank to hide this button"
              />
              <StorePageLinkField
                value={config.primaryButtonLink as string | null}
                fallback="/products"
                onChange={(v) => setField("primaryButtonLink", v)}
                helperText={
                  config.primaryButtonText
                    ? `“${String(config.primaryButtonText)}” opens ${pageOptionLabel(String(config.primaryButtonLink ?? "/products"))}`
                    : "Pick where the button should send shoppers"
                }
              />
            </div>

            <div
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <p className="text-xs font-semibold text-[var(--color-foreground)]">
                Second button (optional)
              </p>
              <TextField
                label="Button text shoppers see"
                fullWidth
                value={String(config.secondaryButtonText ?? "")}
                onChange={(e) => setField("secondaryButtonText", e.target.value)}
                placeholder="About us"
                helperText="Optional — leave blank to hide"
              />
              <StorePageLinkField
                value={config.secondaryButtonLink as string | null}
                fallback="/about"
                onChange={(v) => setField("secondaryButtonLink", v)}
                helperText={
                  config.secondaryButtonText
                    ? `“${String(config.secondaryButtonText)}” opens ${pageOptionLabel(String(config.secondaryButtonLink ?? "/about"))}`
                    : "Only used when second button text is set"
                }
              />
            </div>
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">3. Images (optional)</p>
            <p className="admin-field-group__hint">
              Background fills the hero. Side image is optional — both show in preview.
            </p>
            <ImageField
              label="Background image"
              value={config.backgroundImagePath as string | null}
              onPick={() => onPickMedia("backgroundImagePath")}
              onClear={() => setField("backgroundImagePath", null)}
            />
            <ImageField
              label="Product / side image (optional)"
              value={config.foregroundImagePath as string | null}
              onPick={() => onPickMedia("foregroundImagePath")}
              onClear={() => setField("foregroundImagePath", null)}
            />
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">4. Layout</p>
            <p className="admin-field-group__hint">
              Full-bleed overlay is recommended for brand heroes.
            </p>
            <div className={adminFieldsGrid(2)}>
              <TextField
                select
                label="Layout style"
                fullWidth
                value={String(config.layoutPreset ?? "FULL_BLEED")}
                onChange={(e) =>
                  setField("layoutPreset", e.target.value as HeroLayoutPreset)
                }
              >
                {HERO_LAYOUT_PRESETS.map((preset) => (
                  <MenuItem key={preset} value={preset}>
                    {HERO_LAYOUT_PRESET_LABELS[preset]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Text alignment"
                fullWidth
                value={String(config.alignment ?? "left")}
                onChange={(e) => setField("alignment", e.target.value)}
              >
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="center">Center</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </TextField>
            </div>
            <TextField
              label="Decorative backdrop"
              fullWidth
              value="Soft brand glow (automatic)"
              disabled
              helperText="Handled by the theme — no setup needed."
            />
          </div>
        </>
      ) : null}

      {sectionType === "cta" || sectionType === "text_image" ? (
        <>
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">1. Content</p>
            <p className="admin-field-group__hint">
              Heading and story shoppers read — preview updates as you type.
            </p>
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
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">2. Button</p>
            <p className="admin-field-group__hint">
              Choose the label and which store page opens. Destination shows in
              the preview.
            </p>
            <div
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <TextField
                label="Button text shoppers see"
                fullWidth
                value={String(config.buttonText ?? "")}
                onChange={(e) => setField("buttonText", e.target.value)}
                helperText="Leave blank to hide the button"
              />
              <StorePageLinkField
                value={config.buttonLink as string | null}
                fallback="/products"
                onChange={(v) => setField("buttonLink", v)}
                helperText={
                  config.buttonText
                    ? `“${String(config.buttonText)}” opens ${pageOptionLabel(String(config.buttonLink ?? "/products"))}`
                    : "Pick where the button should send shoppers"
                }
              />
            </div>
          </div>
        </>
      ) : null}

      {sectionType === "about" ? (
        <>
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">1. Story</p>
            <p className="admin-field-group__hint">
              Priya-style founder block: heading, story, quote, and portrait.
            </p>
            <TextField
              label="Heading"
              fullWidth
              value={String(config.heading ?? "")}
              onChange={(e) => setField("heading", e.target.value)}
              helperText='Example: "A Visionary Beyond Generations"'
            />
            <TextField
              label="Highlighted word"
              fullWidth
              value={String(config.headingHighlight ?? "")}
              onChange={(e) => setField("headingHighlight", e.target.value)}
              helperText="Word in the heading to accent (e.g. Visionary). Leave blank for the last word."
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={5}
              value={String(config.description ?? "")}
              onChange={(e) => setField("description", e.target.value)}
            />
            <TextField
              label="Quote"
              fullWidth
              multiline
              minRows={2}
              value={String(config.quote ?? "")}
              onChange={(e) => setField("quote", e.target.value)}
            />
            <TextField
              label="Quote author"
              fullWidth
              value={String(config.quoteAuthor ?? "")}
              onChange={(e) => setField("quoteAuthor", e.target.value)}
            />
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">2. Portrait</p>
            <ImageField
              label="Portrait image"
              value={config.imagePath as string | null}
              onPick={() => onPickMedia("imagePath")}
              onClear={() => setField("imagePath", null)}
            />
            <TextField
              label="Caption name"
              fullWidth
              value={String(config.imageCaptionName ?? "")}
              onChange={(e) => setField("imageCaptionName", e.target.value)}
              helperText="Shown on the photo badge"
            />
            <TextField
              label="Caption role"
              fullWidth
              value={String(config.imageCaptionRole ?? "")}
              onChange={(e) => setField("imageCaptionRole", e.target.value)}
              helperText='Example: "Founder"'
            />
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">3. Timeline</p>
            <p className="admin-field-group__hint">
              Optional milestones (logo, label, year) under the story.
            </p>
            {(
              (config.timelineItems as Array<{
                label?: string;
                year?: string;
                logoPath?: string | null;
              }>) ?? []
            ).map((item, index) => (
              <div
                key={`timeline-${index}`}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3"
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Milestone {index + 1}</p>
                  <button
                    type="button"
                    className="text-xs text-[var(--color-error)]"
                    onClick={() => {
                      const next = [
                        ...((config.timelineItems as unknown[]) ?? []),
                      ];
                      next.splice(index, 1);
                      setField("timelineItems", next);
                    }}
                  >
                    Remove
                  </button>
                </div>
                <TextField
                  label="Label"
                  fullWidth
                  size="small"
                  value={String(item.label ?? "")}
                  onChange={(e) => {
                    const next = [
                      ...((config.timelineItems as Array<Record<string, unknown>>) ??
                        []),
                    ];
                    next[index] = { ...next[index], label: e.target.value };
                    setField("timelineItems", next);
                  }}
                />
                <TextField
                  label="Year / note"
                  fullWidth
                  size="small"
                  value={String(item.year ?? "")}
                  onChange={(e) => {
                    const next = [
                      ...((config.timelineItems as Array<Record<string, unknown>>) ??
                        []),
                    ];
                    next[index] = { ...next[index], year: e.target.value };
                    setField("timelineItems", next);
                  }}
                />
                <ImageField
                  label="Logo (optional)"
                  value={(item.logoPath as string | null) ?? null}
                  onPick={() => onPickMedia(`timelineItems.${index}.logoPath`)}
                  onClear={() => {
                    const next = [
                      ...((config.timelineItems as Array<Record<string, unknown>>) ??
                        []),
                    ];
                    next[index] = { ...next[index], logoPath: null };
                    setField("timelineItems", next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
              onClick={() => {
                const current =
                  (config.timelineItems as unknown[]) ?? [];
                if (current.length >= 6) return;
                setField("timelineItems", [
                  ...current,
                  { label: "", year: "", logoPath: null },
                ]);
              }}
            >
              Add milestone
            </button>
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">4. Button (optional)</p>
            <TextField
              label="Button text"
              fullWidth
              value={String(config.buttonText ?? "")}
              onChange={(e) => setField("buttonText", e.target.value)}
              helperText="Leave blank to hide"
            />
            <StorePageLinkField
              value={config.buttonLink as string | null}
              fallback="/contact"
              onChange={(v) => setField("buttonLink", v)}
            />
          </div>
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
            helperText="Featured = products marked Featured in Catalog → Products"
          >
            <MenuItem value="FEATURED_PRODUCTS">Featured products (recommended)</MenuItem>
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
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">Banner &amp; button</p>
          <p className="admin-field-group__hint">
            Image plus optional CTA — pick a store page from the list.
          </p>
          <ImageField
            label="Banner image"
            value={config.imagePath as string | null}
            onPick={() => onPickMedia("imagePath")}
            onClear={() => setField("imagePath", null)}
          />
          <div
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <TextField
              label="Button text shoppers see"
              fullWidth
              value={String(config.buttonText ?? "")}
              onChange={(e) => setField("buttonText", e.target.value)}
              helperText="Leave blank to hide the button"
            />
            <StorePageLinkField
              value={config.link as string | null}
              fallback="/products"
              onChange={(v) => setField("link", v)}
              helperText={
                config.buttonText
                  ? `“${String(config.buttonText)}” opens ${pageOptionLabel(String(config.link ?? "/products"))}`
                  : "Pick where the button should send shoppers"
              }
            />
          </div>
        </div>
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

      <details className="admin-field-group">
        <summary className="cursor-pointer text-sm font-medium">
          Motion &amp; 3D (optional)
        </summary>
        <p className="admin-field-group__hint mt-2">
          Uses your store Appearance → Motion &amp; 3D settings by default. Only
          customize this section if you need something different.
        </p>
        <div className={`mt-3 space-y-4`}>
          <TextField
            select
            label="Motion"
            fullWidth
            value={String(config.motionSource ?? "global")}
            onChange={(e) => setField("motionSource", e.target.value)}
            helperText="Use store default for most sections."
          >
            <MenuItem value="global">Use store default</MenuItem>
            <MenuItem value="custom">Customize for this section</MenuItem>
          </TextField>
          {(config.motionSource ?? "global") === "custom" ? (
            <div className={adminFieldsGrid(2)}>
              <TextField
                select
                label="Animation"
                fullWidth
                value={String(config.animationPreset ?? "fade-up")}
                onChange={(e) => setField("animationPreset", e.target.value)}
              >
                {SECTION_ANIMATION_PRESETS.map((style) => (
                  <MenuItem key={style} value={style}>
                    {style === "none"
                      ? "None"
                      : style === "fade"
                        ? "Fade"
                        : style === "fade-up"
                          ? "Rise"
                          : style === "scale"
                            ? "Scale"
                            : style.startsWith("slide")
                              ? "Slide"
                              : style}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Intensity"
                fullWidth
                value={String(config.animationIntensity ?? "smooth")}
                onChange={(e) => setField("animationIntensity", e.target.value)}
              >
                <MenuItem value="subtle">Subtle</MenuItem>
                <MenuItem value="smooth">Smooth</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.animationEnabled !== false}
                    onChange={(_, checked) =>
                      setField("animationEnabled", checked)
                    }
                  />
                }
                label="Play entrance animation"
              />
            </div>
          ) : null}

          {sectionType === "hero" ? (
            <>
              <TextField
                select
                label="3D"
                fullWidth
                value={String(config.threeSource ?? "global")}
                onChange={(e) => setField("threeSource", e.target.value)}
                helperText="Store default keeps Hero 3D aligned with Appearance."
              >
                <MenuItem value="global">Use store default</MenuItem>
                <MenuItem value="custom">Customize for this section</MenuItem>
              </TextField>
              {(config.threeSource ?? "global") === "custom" ? (
                <div className={adminFieldsGrid(2)}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(config.enable3d)}
                        onChange={(_, checked) => setField("enable3d", checked)}
                      />
                    }
                    label="Enable 3D"
                  />
                  <TextField
                    select
                    label="Preset"
                    fullWidth
                    value={String(config.scene3dPreset ?? "NONE")}
                    onChange={(e) => setField("scene3dPreset", e.target.value)}
                    disabled={!config.enable3d}
                  >
                    <MenuItem value="NONE">None</MenuItem>
                    <MenuItem value="SOFT_GEOMETRY">Soft</MenuItem>
                    <MenuItem value="FLOATING_SHAPES">Floating</MenuItem>
                    <MenuItem value="ABSTRACT_PARTICLES">Particles</MenuItem>
                    <MenuItem value="PRODUCT_ORBIT">Orbit</MenuItem>
                  </TextField>
                </div>
              ) : null}
            </>
          ) : null}

          <div className={adminFieldsGrid(2)}>
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
          </div>
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
  const previewUrl = resolveCmsImageUrl(value);

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <p className="text-sm font-semibold text-[var(--color-foreground)]">{label}</p>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                Set
              </div>
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted)]">
            {value}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-muted)]">No image selected yet</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPick}
          className="rounded-md border border-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]"
        >
          {value ? "Change image" : "Choose image"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)]"
          >
            Remove
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type DragEvent, type ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import FormatQuoteOutlinedIcon from "@mui/icons-material/FormatQuoteOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import NewspaperOutlinedIcon from "@mui/icons-material/NewspaperOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import PowerSettingsNewOutlinedIcon from "@mui/icons-material/PowerSettingsNewOutlined";
import StarOutlineOutlinedIcon from "@mui/icons-material/StarOutlineOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import {
  createSectionAction,
  deleteSectionAction,
  duplicateSectionAction,
  publishPageAction,
  reorderSectionsAction,
  unpublishPageAction,
  updateSectionAction,
} from "@/features/cms/actions";
import {
  aboutHomeFlagsToOtherInformationConfig,
  defaultConfigForType,
  migrateAboutConfigInput,
  HOMEPAGE_SLUG,
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
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { SectionEditorPreview } from "@/features/cms/components/SectionEditorPreview";
import { AboutSectionFields } from "@/features/cms/components/AboutSectionFields";
import { CtaSectionFields } from "@/features/cms/components/CtaSectionFields";
import { FaqSectionFields } from "@/features/cms/components/FaqSectionFields";
import {
  FeaturesSectionFields,
  mapFeaturesConfigItems,
} from "@/features/cms/components/FeaturesSectionFields";
import {
  ProductsSectionFields,
  type CatalogPickerOption,
  type ProductsSectionSource,
} from "@/features/cms/components/ProductsSectionFields";
import { CategoriesSectionFields } from "@/features/cms/components/CategoriesSectionFields";
import {
  HeroSectionFields,
  mapHeroSlides,
} from "@/features/cms/components/HeroSectionFields";
import { StatisticsSectionFields } from "@/features/cms/components/StatisticsSectionFields";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { FieldError } from "@/features/admin/ui/FieldError";
import { focusFirstFieldError } from "@/features/admin/validation/form-errors";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminFieldGroup,
  adminFieldsGrid,
  adminFormStack,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import type { FieldErrors } from "@/lib/validation";
import { getAdminPath } from "@/config/admin-route";

const SECTION_TYPE_ICONS: Record<SupportedSectionType, ReactNode> = {
  hero: <ViewCarouselOutlinedIcon fontSize="small" />,
  categories: <CategoryOutlinedIcon fontSize="small" />,
  products: <Inventory2OutlinedIcon fontSize="small" />,
  banner: <ImageOutlinedIcon fontSize="small" />,
  text_image: <ViewAgendaOutlinedIcon fontSize="small" />,
  about: <InfoOutlinedIcon fontSize="small" />,
  other_information: <InfoOutlinedIcon fontSize="small" />,
  career: <WorkOutlineOutlinedIcon fontSize="small" />,
  features: <StarOutlineOutlinedIcon fontSize="small" />,
  statistics: <GridViewOutlinedIcon fontSize="small" />,
  testimonials: <FormatQuoteOutlinedIcon fontSize="small" />,
  faq: <HelpOutlineOutlinedIcon fontSize="small" />,
  cta: <CampaignOutlinedIcon fontSize="small" />,
  newsletter: <EmailOutlinedIcon fontSize="small" />,
  reels: <MovieOutlinedIcon fontSize="small" />,
  text: <NotesOutlinedIcon fontSize="small" />,
  image: <ImageOutlinedIcon fontSize="small" />,
};

function sectionIcon(type: string) {
  if (type in SECTION_TYPE_ICONS) {
    return SECTION_TYPE_ICONS[type as SupportedSectionType];
  }
  return <NewspaperOutlinedIcon fontSize="small" />;
}

function displaySectionType(
  section: ContentSection,
  isHomepage: boolean,
): SupportedSectionType | string {
  if (isHomepage && section.sectionType === "about") {
    return "other_information";
  }
  return section.sectionType;
}

type Props = {
  page: ContentPage;
  initialSections: ContentSection[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  /** Shown in helper copy (default: Homepage). */
  pageLabel?: string;
  /** When set, Add section only offers these types (otherwise all except text/image). */
  allowedSectionTypes?: SupportedSectionType[];
  /** Empty-state guidance when the page has no sections. */
  emptyStateHint?: string;
  /** Storefront URL for “View live site” (default `/`). */
  viewLiveHref?: string;
  /** Catalog pickers for Product Grid (and similar) editors. */
  categoryOptions?: CatalogPickerOption[];
  productOptions?: CatalogPickerOption[];
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
  allowedSectionTypes,
  emptyStateHint = "No sections yet. Add a Hero Banner to get started.",
  viewLiveHref = "/",
  categoryOptions = [],
  productOptions = [],
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
  const [sectionFieldErrors, setSectionFieldErrors] = useState<FieldErrors>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaField, setMediaField] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentSection | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  /** Disable card actions while saving order / refreshing. */
  const reorderLocked = pending || reorderBusy;
  /** Also lock while a drag is in progress. */
  const actionsLocked = reorderLocked || Boolean(dragId);

  const isHomepage =
    page.slug === HOMEPAGE_SLUG || pageLabel.toLowerCase() === "homepage";

  const usedSectionTypes = useMemo(() => {
    const used = new Set<string>();
    for (const section of sections) {
      used.add(section.sectionType);
      if (section.sectionType === "about") used.add("other_information");
      if (section.sectionType === "other_information") used.add("about");
    }
    return used;
  }, [sections]);

  const addableSectionTypes = useMemo(() => {
    const base =
      allowedSectionTypes?.length
        ? allowedSectionTypes
        : SUPPORTED_SECTION_TYPES.filter(
            (t) =>
              t !== "text" &&
              t !== "image" &&
              t !== "career" &&
              // Full About is edited under Content → About; homepage uses Other information.
              t !== "about",
          );
    // Prefer About first when it’s in the list (recommended for /about).
    const ordered = base.includes("about")
      ? (["about" as const, ...base.filter((t) => t !== "about")] as SupportedSectionType[])
      : [...base];
    // Hide types already on this page (one of each).
    return ordered.filter((type) => !usedSectionTypes.has(type));
  }, [allowedSectionTypes, usedSectionTypes]);

  const editing = useMemo(
    () => sections.find((s) => s.id === editId) ?? null,
    [sections, editId],
  );

  const editingType = useMemo(() => {
    if (!editing) return null;
    const display = displaySectionType(editing, isHomepage);
    return SUPPORTED_SECTION_TYPES.includes(display as SupportedSectionType)
      ? (display as SupportedSectionType)
      : (editing.sectionType as SupportedSectionType);
  }, [editing, isHomepage]);

  const togglesOnlyEditor = editingType === "other_information";
  const compactEditor =
    togglesOnlyEditor ||
    editingType === "cta" ||
    editingType === "faq" ||
    editingType === "statistics" ||
    editingType === "features" ||
    editingType === "products" ||
    editingType === "categories" ||
    editingType === "hero";

  function refresh() {
    router.refresh();
  }

  function openEditor(section: ContentSection) {
    const displayType = displaySectionType(section, isHomepage);
    const type = SUPPORTED_SECTION_TYPES.includes(
      displayType as SupportedSectionType,
    )
      ? (displayType as SupportedSectionType)
      : "text";
    const defaults = defaultConfigForType(type);
    setEditId(section.id);
    setSectionFieldErrors({});
    setEditTitle(
      section.title?.trim() ||
        SECTION_TYPE_LABELS[type] ||
        SECTION_TYPE_LABELS[section.sectionType as SupportedSectionType] ||
        "",
    );

    if (type === "other_information") {
      setEditConfig(
        aboutHomeFlagsToOtherInformationConfig({
          ...(section.config as Record<string, unknown>),
        }),
      );
      return;
    }

    setEditConfig(
      section.sectionType === "about"
        ? {
            ...defaults,
            ...migrateAboutConfigInput({
              ...defaults,
              ...(section.config as Record<string, unknown>),
            }),
            motionSource: "global",
            threeSource: "global",
          }
        : {
            ...defaults,
            ...section.config,
            // Always inherit Appearance → Motion & 3D (no per-section UI).
            motionSource: "global",
            threeSource: "global",
          },
    );
  }

  function commitSectionOrder(nextList: ContentSection[]) {
    const previous = sections;
    setSections(nextList);
    setError(null);
    setReorderBusy(true);
    startTransition(async () => {
      try {
        const result = await reorderSectionsAction({
          pageId: page.id,
          orderedIds: nextList.map((s) => s.id),
        });
        if (!result.ok) {
          setSections(previous);
          setError(result.error);
          return;
        }
        await router.refresh();
      } finally {
        setReorderBusy(false);
        setDragId(null);
        setOverId(null);
      }
    });
  }

  function onSectionDragStart(e: DragEvent, id: string) {
    if (!canUpdate || reorderLocked) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onSectionDragOver(e: DragEvent, id: string) {
    if (!canUpdate || !dragId || dragId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverId(id);
  }

  function onSectionDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = dragId || e.dataTransfer.getData("text/plain");
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId || !canUpdate) return;
    const from = sections.findIndex((s) => s.id === sourceId);
    const to = sections.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    commitSectionOrder(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            Your {pageLabel.toLowerCase()} is made of sections. Drag cards to
            reorder. Changes stay in draft until you publish.
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
            href={viewLiveHref}
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
          {emptyStateHint}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const typeKey = displaySectionType(section, isHomepage);
            const label =
              SECTION_TYPE_LABELS[typeKey as SupportedSectionType] ??
              section.sectionType;
            const description =
              SECTION_TYPE_DESCRIPTIONS[typeKey as SupportedSectionType] ?? "";
            const iconBtn =
              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-40 hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]";
            return (
              <li
                key={section.id}
                draggable={canUpdate && !reorderLocked}
                onDragStart={(e) => onSectionDragStart(e, section.id)}
                onDragOver={(e) => onSectionDragOver(e, section.id)}
                onDrop={(e) => onSectionDrop(e, section.id)}
                onDragEnd={() => {
                  if (!reorderBusy) {
                    setDragId(null);
                    setOverId(null);
                  }
                }}
                className={[
                  "flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)] transition",
                  dragId === section.id ? "opacity-45" : "",
                  overId === section.id && dragId !== section.id
                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-card))] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]"
                    : "",
                  canUpdate && !reorderLocked
                    ? "cursor-grab active:cursor-grabbing"
                    : "",
                  reorderLocked ? "opacity-70" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex gap-2.5">
                  {canUpdate ? (
                    <span
                      className="mt-1 inline-flex h-8 w-5 shrink-0 items-center justify-center text-[var(--color-muted)]"
                      aria-hidden
                      title="Drag to reorder"
                    >
                      <DragIndicatorIcon sx={{ fontSize: 18 }} />
                    </span>
                  ) : null}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
                    aria-hidden
                  >
                    {sectionIcon(typeKey)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {section.title?.trim() || label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">
                      {description}
                    </p>
                    <p
                      className={`mt-1 text-[0.65rem] font-semibold uppercase tracking-wide ${
                        section.isActive
                          ? "text-emerald-700"
                          : "text-[var(--color-muted)]"
                      }`}
                    >
                      {section.isActive ? "On" : "Off"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-border)] pt-2">
                    {canUpdate ? (
                      <>
                        <button
                          type="button"
                          disabled={actionsLocked}
                          aria-label="Edit section"
                          title={
                            actionsLocked
                              ? "Wait until reorder finishes"
                              : "Edit"
                          }
                          className={iconBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (actionsLocked) return;
                            openEditor(section);
                          }}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          type="button"
                          disabled={actionsLocked}
                          aria-label={
                            section.isActive ? "Disable section" : "Enable section"
                          }
                          title={section.isActive ? "Disable" : "Enable"}
                          className={iconBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (actionsLocked) return;
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
                          <PowerSettingsNewOutlinedIcon sx={{ fontSize: 16 }} />
                        </button>
                      </>
                    ) : null}
                    {canCreate ? (
                      <button
                        type="button"
                        disabled={actionsLocked}
                        aria-label="Duplicate section"
                        title="Duplicate"
                        className={iconBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actionsLocked) return;
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
                        <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        disabled={actionsLocked}
                        aria-label="Delete section"
                        title="Delete"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 disabled:opacity-40 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actionsLocked) return;
                          setDeleteTarget(section);
                        }}
                      >
                        <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                      </button>
                    ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add section</DialogTitle>
        <DialogContent dividers>
          {addableSectionTypes.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-muted)]">
              Every available section type is already on this page.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {addableSectionTypes.map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    className="flex h-full w-full flex-col items-start gap-1.5 rounded-lg border border-[var(--color-border)] p-2.5 text-left transition hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)]"
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
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                      {sectionIcon(type)}
                    </span>
                    <span className="flex flex-wrap items-center gap-1">
                      <span className="text-sm font-medium leading-tight">
                        {SECTION_TYPE_LABELS[type]}
                      </span>
                      {type === "about" &&
                      allowedSectionTypes?.includes("about") ? (
                        <span className="rounded bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                          Rec
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 text-[0.7rem] leading-snug text-[var(--color-muted)]">
                      {SECTION_TYPE_DESCRIPTIONS[type]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
        <DialogActions>
          <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-2 text-sm">
            Cancel
          </button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onClose={() => {
          setEditId(null);
          setSectionFieldErrors({});
        }}
        fullWidth
        maxWidth={
          togglesOnlyEditor ? "xs" : compactEditor ? "md" : "lg"
        }
      >
        <DialogTitle>
          Edit{" "}
          {editingType
            ? SECTION_TYPE_LABELS[editingType] ?? "section"
            : "section"}
        </DialogTitle>
        <DialogContent dividers className="!pt-4">
          {editing && editingType ? (
            togglesOnlyEditor ? (
              <SectionConfigFields
                sectionType="other_information"
                config={editConfig}
                title={editTitle}
                onTitleChange={setEditTitle}
                onChange={setEditConfig}
                onPickMedia={(field) => setMediaField(field)}
                fieldErrors={sectionFieldErrors}
                categoryOptions={categoryOptions}
                productOptions={productOptions}
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] lg:items-start">
                <div className="order-1 lg:order-2 lg:sticky lg:top-0">
                  <SectionEditorPreview
                    sectionType={editingType}
                    config={editConfig}
                  />
                </div>
                <div className="order-2 lg:order-1">
                  <SectionConfigFields
                    sectionType={editingType}
                    config={editConfig}
                    title={editTitle}
                    onTitleChange={setEditTitle}
                    onChange={setEditConfig}
                    onPickMedia={(field) => setMediaField(field)}
                    fieldErrors={sectionFieldErrors}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                </div>
              </div>
            )
          ) : null}
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            className="px-3 py-2 text-sm"
            onClick={() => {
              setEditId(null);
              setSectionFieldErrors({});
            }}
          >
            Cancel
          </button>
          {canUpdate ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
              onClick={() => {
                if (!editing || !editingType) return;
                const convertingAbout =
                  isHomepage && editing.sectionType === "about";
                startTransition(async () => {
                  const result = await updateSectionAction({
                    sectionId: editing.id,
                    title:
                      editTitle.trim() ||
                      SECTION_TYPE_LABELS[editingType] ||
                      null,
                    ...(convertingAbout
                      ? { sectionType: "other_information" as const }
                      : {}),
                    config: {
                      ...editConfig,
                      // Motion & 3D are store-wide (Appearance only).
                      motionSource: "global",
                      threeSource: "global",
                      enable3d: false,
                      scene3dPreset: "NONE",
                    },
                  });
                  if (!result.ok) {
                    const fieldErrors =
                      "fieldErrors" in result && result.fieldErrors
                        ? result.fieldErrors
                        : undefined;
                    setSectionFieldErrors(fieldErrors ?? {});
                    setError(
                      fieldErrors
                        ? "Please check the section settings."
                        : result.error,
                    );
                    if (fieldErrors) {
                      focusFirstFieldError({ fieldErrors });
                    }
                    return;
                  }
                  setSectionFieldErrors({});
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === editing.id
                        ? {
                            ...s,
                            sectionType: convertingAbout
                              ? "other_information"
                              : s.sectionType,
                            title:
                              editTitle.trim() ||
                              SECTION_TYPE_LABELS[editingType] ||
                              null,
                            config: {
                              ...editConfig,
                              motionSource: "global",
                              threeSource: "global",
                              enable3d: false,
                              scene3dPreset: "NONE",
                            },
                          }
                        : s,
                    ),
                  );
                  setEditId(null);
                  setMessage("Section saved.");
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
            const slideMatch = mediaField.match(/^slides\.(\d+)\.imagePath$/);
            if (slideMatch) {
              const index = Number(slideMatch[1]);
              const slides = [
                ...((prev.slides as Array<Record<string, unknown>>) ?? []),
              ];
              slides[index] = {
                ...(slides[index] ?? {}),
                imagePath: selection.storagePath,
              };
              return { ...prev, slides };
            }
            const factoryMatch = mediaField.match(
              /^factorySlides\.(\d+)\.imagePath$/,
            );
            if (factoryMatch) {
              const index = Number(factoryMatch[1]);
              const slides = [
                ...((prev.factorySlides as Array<Record<string, unknown>>) ??
                  []),
              ];
              slides[index] = {
                ...(slides[index] ?? {}),
                imagePath: selection.storagePath,
              };
              return { ...prev, factorySlides: slides };
            }
            const certMatch = mediaField.match(
              /^certificatesSlides\.(\d+)\.imagePath$/,
            );
            if (certMatch) {
              const index = Number(certMatch[1]);
              const slides = [
                ...((prev.certificatesSlides as Array<
                  Record<string, unknown>
                >) ?? []),
              ];
              slides[index] = {
                ...(slides[index] ?? {}),
                imagePath: selection.storagePath,
              };
              return { ...prev, certificatesSlides: slides };
            }
            return {
              ...prev,
              [mediaField]: selection.storagePath,
            };
          });
          setMediaField(null);
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete section?"
        message="Delete this section? This cannot be undone."
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteSectionAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setSections((prev) =>
              prev.filter((s) => s.id !== deleteTarget.id),
            );
            setDeleteTarget(null);
            refresh();
          });
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
  fieldErrors = {},
  categoryOptions = [],
  productOptions = [],
}: {
  sectionType: SupportedSectionType;
  config: EditableConfig;
  title: string;
  onTitleChange: (value: string) => void;
  onChange: (value: EditableConfig) => void;
  onPickMedia: (field: string) => void;
  fieldErrors?: FieldErrors;
  categoryOptions?: CatalogPickerOption[];
  productOptions?: CatalogPickerOption[];
}) {
  void _onTitleChange;
  function setField(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }
  function err(key: string) {
    return fieldErrors[key];
  }

  if (sectionType === "other_information") {
    return (
      <div className={adminFormStack()} style={adminStackStyle}>
        {Object.keys(fieldErrors).length > 0 ? (
          <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            {Object.entries(fieldErrors).map(([key, message]) => (
              <FieldError key={key} message={message} className="mt-0" />
            ))}
          </div>
        ) : null}
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">Show on homepage</p>
          <p className="admin-field-group__hint">
            Toggle which parts from Content → About appear here.{" "}
            <Link
              href={getAdminPath("/content/about")}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Edit About content
            </Link>
          </p>
          <div className="grid gap-2">
            <AdminToggle
              checked={Boolean(config.showStory)}
              onChange={(checked) => setField("showStory", checked)}
              label="Story & portrait"
            />
            <AdminToggle
              checked={Boolean(config.showVisionMission)}
              onChange={(checked) => setField("showVisionMission", checked)}
              label="Vision & mission"
            />
            <AdminToggle
              checked={Boolean(config.showFactory)}
              onChange={(checked) => setField("showFactory", checked)}
              label="Factory"
            />
            <AdminToggle
              checked={Boolean(config.showCertificates)}
              onChange={(checked) => setField("showCertificates", checked)}
              label="Certificates"
            />
            <AdminToggle
              checked={Boolean(config.showTrain)}
              onChange={(checked) => setField("showTrain", checked)}
              label="Heritage train"
            />
          </div>
        </div>
      </div>
    );
  }

  const typeLabel = SECTION_TYPE_LABELS[sectionType];
  const listLabel = _title.trim() || typeLabel;

  const showSharedTitle =
    sectionType !== "hero" &&
    sectionType !== "about" &&
    sectionType !== "cta" &&
    sectionType !== "text_image" &&
    sectionType !== "statistics" &&
    sectionType !== "features" &&
    sectionType !== "products" &&
    sectionType !== "categories" &&
    (sectionType === "banner" ||
      sectionType === "testimonials" ||
      sectionType === "faq" ||
      sectionType === "newsletter" ||
      sectionType === "text");

  return (
    <div
      className={adminFormStack(
        sectionType === "cta" ||
          sectionType === "faq" ||
          sectionType === "statistics" ||
          sectionType === "features" ||
          sectionType === "products" ||
          sectionType === "categories" ||
          sectionType === "hero",
      )}
      style={adminStackStyle}
    >
      {Object.keys(fieldErrors).length > 0 ? (
        <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          {Object.entries(fieldErrors).map(([key, message]) => (
            <FieldError key={key} message={message} className="mt-0" />
          ))}
        </div>
      ) : null}
      {sectionType !== "cta" &&
      sectionType !== "faq" &&
      sectionType !== "statistics" &&
      sectionType !== "features" &&
      sectionType !== "products" &&
      sectionType !== "categories" &&
      sectionType !== "hero" ? (
        <TextField
          label="Section name (in admin list)"
          fullWidth
          value={listLabel}
          disabled
          helperText="Auto-filled from the section type. Shoppers never see this."
        />
      ) : null}

      {showSharedTitle ? (
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">Section heading</p>
          <p className="admin-field-group__hint">
            Shown on the live storefront above this block. Watch the preview.
            Accent style is set in Appearance → Typography (last word).
          </p>
          <div>
            <TextField
              label="Heading customers see"
              fullWidth
              name={sectionType === "text" ? "heading" : "title"}
              value={String(config.title ?? config.heading ?? "")}
              error={Boolean(
                err(sectionType === "text" ? "heading" : "title"),
              )}
              onChange={(e) => {
                if (sectionType === "text") {
                  setField("heading", e.target.value);
                } else {
                  setField("title", e.target.value);
                }
              }}
              helperText={
                err(sectionType === "text" ? "heading" : "title")
                  ? undefined
                  : "Example: Featured products"
              }
            />
          </div>
        </div>
      ) : null}

      {sectionType === "hero" ? (
        <HeroSectionFields
          title={String(config.title ?? "")}
          subtitle={String(config.subtitle ?? "")}
          description={String(config.description ?? "")}
          slides={mapHeroSlides(config.slides, {
            title: String(config.title ?? ""),
            subtitle: String(config.subtitle ?? ""),
            description: String(config.description ?? ""),
            primaryButtonText: String(config.primaryButtonText ?? ""),
            primaryButtonLink: (config.primaryButtonLink as string | null) ?? null,
            secondaryButtonText: String(config.secondaryButtonText ?? ""),
            secondaryButtonLink:
              (config.secondaryButtonLink as string | null) ?? null,
            backgroundImagePath:
              (config.backgroundImagePath as string | null) ?? null,
          })}
          autoplayMs={Number(config.autoplayMs ?? 5000)}
          showArrows={config.showArrows !== false}
          onPickMedia={onPickMedia}
          onChange={(patch) => {
            const next: EditableConfig = { ...config, ...patch };
            // Keep section-level buttons in sync with first slide for legacy fallbacks.
            const slides = (next.slides as Array<Record<string, unknown>>) ?? [];
            const first = slides[0];
            if (first) {
              next.primaryButtonText = String(first.ctaLabel ?? "");
              next.primaryButtonLink = (first.ctaHref as string | null) ?? null;
              next.secondaryButtonText = String(first.secondaryCtaLabel ?? "");
              next.secondaryButtonLink =
                (first.secondaryCtaHref as string | null) ?? null;
              if (first.imagePath) {
                next.backgroundImagePath = String(first.imagePath);
              }
            }
            onChange(next);
          }}
        />
      ) : null}

      {sectionType === "cta" ? (
        <CtaSectionFields
          heading={String(config.heading ?? "")}
          description={String(config.description ?? "")}
          buttonText={String(config.buttonText ?? "")}
          buttonLink={(config.buttonLink as string | null) ?? null}
          onChange={(patch) => onChange({ ...config, ...patch })}
        />
      ) : null}

      {sectionType === "text_image" ? (
        <>
          <div className={adminFieldGroup(true)}>
            <p className="admin-field-group__title">1. Content</p>
            <p className="admin-field-group__hint">
              Heading, story, and image — preview updates as you type.
            </p>
            <TextField
              label="Heading"
              fullWidth
              size="small"
              value={String(config.heading ?? "")}
              onChange={(e) => setField("heading", e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={4}
              value={String(config.description ?? "")}
              onChange={(e) => setField("description", e.target.value)}
            />
            <ImageField
              label="Image"
              value={config.imagePath as string | null}
              onPick={() => onPickMedia("imagePath")}
              onClear={() => setField("imagePath", null)}
            />
            <TextField
              select
              label="Image position"
              fullWidth
              size="small"
              value={String(config.imagePosition ?? "right")}
              onChange={(e) => setField("imagePosition", e.target.value)}
            >
              <MenuItem value="left">Left</MenuItem>
              <MenuItem value="right">Right</MenuItem>
            </TextField>
          </div>

          <div className={adminFieldGroup(true)}>
            <p className="admin-field-group__title">2. Button</p>
            <p className="admin-field-group__hint">
              Optional CTA under the story.
            </p>
            <div
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
              style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}
            >
              <TextField
                label="Button text"
                fullWidth
                size="small"
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
                    ? `Opens ${pageOptionLabel(String(config.buttonLink ?? "/products"))}`
                    : "Pick where the button should send shoppers"
                }
              />
            </div>
          </div>
        </>
      ) : null}

      {sectionType === "about" ? (
        <AboutSectionFields
          config={config}
          onChange={onChange}
          onPickMedia={onPickMedia}
        />
      ) : null}

      {sectionType === "banner" || sectionType === "newsletter" ? (
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
        <ProductsSectionFields
          title={String(config.title ?? "")}
          description={String(config.description ?? "")}
          source={
            (config.source as ProductsSectionSource) || "FEATURED_PRODUCTS"
          }
          limit={Number(config.limit ?? 8) || 8}
          categoryId={(config.categoryId as string | null) ?? null}
          productIds={
            Array.isArray(config.productIds)
              ? (config.productIds as string[])
              : []
          }
          categoryOptions={categoryOptions}
          productOptions={productOptions}
          onChange={(patch) => onChange({ ...config, ...patch })}
        />
      ) : null}

      {sectionType === "categories" ? (
        <CategoriesSectionFields
          title={String(config.title ?? "")}
          description={String(config.description ?? "")}
          categoryIds={
            Array.isArray(config.categoryIds)
              ? (config.categoryIds as string[])
              : []
          }
          columns={
            ([2, 3, 4].includes(Number(config.columns))
              ? Number(config.columns)
              : 3) as 2 | 3 | 4
          }
          categoryOptions={categoryOptions}
          onChange={(patch) => onChange({ ...config, ...patch })}
        />
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
        <FeaturesSectionFields
          title={String(config.title ?? "")}
          description={String(config.description ?? "")}
          items={mapFeaturesConfigItems(
            config.items as SectionConfigMap["features"]["items"] | undefined,
          )}
          onTitleChange={(title) => setField("title", title)}
          onDescriptionChange={(description) =>
            setField("description", description)
          }
          onChange={(next) => setField("items", next)}
        />
      ) : null}

      {sectionType === "statistics" ? (
        <StatisticsSectionFields
          title={String(config.title ?? "")}
          items={
            (config.items as
              | Array<{ value?: string; label?: string }>
              | undefined)?.map((i) => ({
              value: String(i.value ?? ""),
              label: String(i.label ?? ""),
            })) ?? []
          }
          onTitleChange={(title) => setField("title", title)}
          onChange={(next) => setField("items", next)}
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
        <FaqSectionFields
          items={
            (config.items as
              | Array<{ question?: string; answer?: string; active?: boolean }>
              | undefined)?.map((i) => ({
              question: String(i.question ?? ""),
              answer: String(i.answer ?? ""),
              active: i.active !== false,
            })) ?? []
          }
          onChange={(next) => setField("items", next)}
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

      {sectionType === "reels" ? (
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">Reels showcase</p>
          <p className="admin-field-group__hint">
            Shows active hosted reels marked “Show on homepage” from Content →
            Reels.
          </p>
          <TextField
            label="Heading"
            fullWidth
            value={String(config.title ?? "")}
            onChange={(e) => setField("title", e.target.value)}
          />
          <p className="rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_60%,var(--color-card))] px-3 py-2 text-[12px] leading-snug text-[var(--color-muted)]">
            Showcase count, visible slides, and muted autoplay are managed in{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              Content → Reels → Settings
            </span>
            .
          </p>
        </div>
      ) : null}

      <details className="admin-field-group">
        <summary className="cursor-pointer text-sm font-medium">
          Layout (optional)
        </summary>
        <p className="admin-field-group__hint mt-2">
          Background and spacing for this section. Motion &amp; 3D are managed
          store-wide in Appearance → Motion &amp; 3D.
        </p>
        <div className={`mt-3 space-y-4`}>
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

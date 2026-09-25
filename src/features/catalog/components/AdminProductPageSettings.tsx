"use client";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import TextField from "@mui/material/TextField";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { updateProductPageSettingsAction } from "@/features/catalog/product-page-settings-actions";
import {
  DEFAULT_PRODUCT_BLOG_HEADING,
  type ProductDetailSectionDef,
  type ProductFaqQuestionDef,
  type ProductPageSettings,
} from "@/features/catalog/product-page-settings";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";
import { AdminSaveBar } from "@/features/admin/ui/AdminSaveBar";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
} from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export type ProductSettingsPanel = "sections" | "faqs" | "banner" | "blog";

type AdminProductPageSettingsProps = {
  initial: ProductPageSettings;
  canUpdate: boolean;
  /** Which block to show (Product settings page tabs). */
  panel?: ProductSettingsPanel;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:flex-row sm:items-center",
        isDragging && "z-10 shadow-md ring-1 ring-[var(--color-primary)]",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)] active:cursor-grabbing",
          disabled && "cursor-not-allowed opacity-40",
        )}
        aria-label="Drag to reorder"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon sx={{ fontSize: 20 }} />
      </button>
      {children}
    </li>
  );
}

export function AdminProductPageSettings({
  initial,
  canUpdate,
  panel = "sections",
}: AdminProductPageSettingsProps) {
  const router = useRouter();
  const [sections, setSections] = useState<ProductDetailSectionDef[]>(
    () => initial.sections,
  );
  const [faqHeading, setFaqHeading] = useState(initial.faqHeading);
  const [faqQuestions, setFaqQuestions] = useState<ProductFaqQuestionDef[]>(
    () => initial.faqQuestions,
  );
  const [listingBannerEnabled, setListingBannerEnabled] = useState(
    initial.listingBannerEnabled,
  );
  const [listingBannerImagePath, setListingBannerImagePath] = useState<
    string | null
  >(initial.listingBannerImagePath);
  const [blogEnabled, setBlogEnabled] = useState(initial.blogEnabled);
  const [blogHeading, setBlogHeading] = useState(initial.blogHeading);
  const [bannerMediaOpen, setBannerMediaOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [headingErrors, setHeadingErrors] = useState<Record<string, string>>(
    {},
  );
  const [faqHeadingError, setFaqHeadingError] = useState<string | null>(null);
  const [blogHeadingError, setBlogHeadingError] = useState<string | null>(null);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>(
    {},
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const baseline = useMemo(
    () =>
      JSON.stringify({
        sections: initial.sections,
        faqHeading: initial.faqHeading,
        faqQuestions: initial.faqQuestions,
        listingBannerEnabled: initial.listingBannerEnabled,
        listingBannerImagePath: initial.listingBannerImagePath,
        blogEnabled: initial.blogEnabled,
        blogHeading: initial.blogHeading,
      }),
    [initial],
  );
  const current = JSON.stringify({
    sections,
    faqHeading,
    faqQuestions,
    listingBannerEnabled,
    listingBannerImagePath,
    blogEnabled,
    blogHeading,
  });
  const isDirty = current !== baseline;
  const dragDisabled = !canUpdate || pending;
  const bannerPreview = resolveCmsImageUrl(listingBannerImagePath);

  function onSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
    });
  }

  function onQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFaqQuestions((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
    });
  }

  function validateSections(): boolean {
    if (!sections.length) {
      setError("Add at least one detail section.");
      setHeadingErrors({});
      return false;
    }
    const next: Record<string, string> = {};
    const seen = new Set<string>();
    for (const section of sections) {
      const trimmed = section.heading.trim();
      if (!trimmed) {
        next[section.id] = "Heading is required.";
        continue;
      }
      if (trimmed.length > 80) {
        next[section.id] = "Heading is too long.";
        continue;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        next[section.id] = "Heading must be unique.";
      }
      seen.add(key);
    }
    setHeadingErrors(next);
    if (Object.keys(next).length) {
      setError("Fix the highlighted headings before saving.");
      return false;
    }
    return true;
  }

  function validateFaqs(): boolean {
    const nextQuestions: Record<string, string> = {};
    let headingErr: string | null = null;
    if (!faqHeading.trim()) {
      headingErr = "FAQ header is required.";
    } else if (faqHeading.trim().length > 80) {
      headingErr = "FAQ header is too long.";
    }
    const seen = new Set<string>();
    for (const q of faqQuestions) {
      const trimmed = q.question.trim();
      if (!trimmed) {
        nextQuestions[q.id] = "Question is required.";
        continue;
      }
      if (trimmed.length > 240) {
        nextQuestions[q.id] = "Question is too long.";
        continue;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        nextQuestions[q.id] = "Question must be unique.";
      }
      seen.add(key);
    }
    setFaqHeadingError(headingErr);
    setQuestionErrors(nextQuestions);
    if (headingErr || Object.keys(nextQuestions).length) {
      setError("Fix the highlighted FAQ fields before saving.");
      return false;
    }
    return true;
  }

  function validateBanner(): boolean {
    if (listingBannerEnabled && !listingBannerImagePath?.trim()) {
      setError("Choose a banner image, or turn the banner off.");
      return false;
    }
    return true;
  }

  function validateBlog(): boolean {
    const trimmed = blogHeading.trim();
    if (!trimmed) {
      setBlogHeadingError("Blog section heading is required.");
      setError("Fix the highlighted blog fields before saving.");
      return false;
    }
    if (trimmed.length > 80) {
      setBlogHeadingError("Blog section heading is too long.");
      setError("Fix the highlighted blog fields before saving.");
      return false;
    }
    setBlogHeadingError(null);
    return true;
  }

  function save() {
    if (!canUpdate) return;
    setError(null);
    setMessage(null);
    if (panel === "sections" && !validateSections()) return;
    if (panel === "faqs" && !validateFaqs()) return;
    if (panel === "banner" && !validateBanner()) return;
    if (panel === "blog" && !validateBlog()) return;

    // Drop incomplete FAQ drafts when saving from another tab.
    const questionsToSave =
      panel === "faqs"
        ? faqQuestions
        : faqQuestions.filter((q) => q.question.trim());

    startTransition(async () => {
      const result = await updateProductPageSettingsAction({
        sections: sections.map((item, index) => ({
          ...item,
          heading: item.heading.trim(),
          sortOrder: index,
        })),
        faqHeading: faqHeading.trim() || initial.faqHeading,
        faqQuestions: questionsToSave.map((item, index) => ({
          ...item,
          question: item.question.trim(),
          sortOrder: index,
        })),
        listingBannerEnabled,
        listingBannerImagePath,
        blogEnabled,
        blogHeading:
          blogHeading.trim() ||
          initial.blogHeading ||
          DEFAULT_PRODUCT_BLOG_HEADING,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHeadingErrors({});
      setFaqHeadingError(null);
      setBlogHeadingError(null);
      setQuestionErrors({});
      setMessage(result.message);
      router.refresh();
    });
  }

  function resetFromInitial() {
    setSections(initial.sections);
    setFaqHeading(initial.faqHeading);
    setFaqQuestions(initial.faqQuestions);
    setListingBannerEnabled(initial.listingBannerEnabled);
    setListingBannerImagePath(initial.listingBannerImagePath);
    setBlogEnabled(initial.blogEnabled);
    setBlogHeading(initial.blogHeading);
    setHeadingErrors({});
    setFaqHeadingError(null);
    setBlogHeadingError(null);
    setQuestionErrors({});
    setError(null);
    setMessage(null);
  }

  return (
    <div className="space-y-4 pb-24">
      {panel === "banner" ? (
        <section className={cn(adminCard(), adminCardPadding(), "!p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Storefront
              </p>
              <h2 className="mt-0.5 text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Listing banner
              </h2>
              <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[var(--color-muted)]">
                Hero image on{" "}
                <span className="font-medium text-[var(--color-foreground)]">
                  /products
                </span>
                . Shown above the catalog — not on individual product pages.
              </p>
            </div>
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-muted)]">
              Full first screen on store
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] p-3">
            <AdminToggle
              checked={listingBannerEnabled}
              disabled={!canUpdate || pending}
              onChange={setListingBannerEnabled}
              label="Show on store"
              description="Needs an image from Images & Files"
              variant="row"
            />
          </div>

          {listingBannerEnabled ? (
            <div className="mt-4 space-y-3">
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
                  <p className="text-[11px] font-medium text-[var(--color-foreground)]">
                    Store preview
                  </p>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    Same frame as About / Contact
                  </p>
                </div>
                {bannerPreview ? (
                  <div className="relative aspect-[16/9] max-h-56 bg-[color-mix(in_srgb,var(--color-muted)_8%,var(--color-surface))] sm:max-h-64">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerPreview}
                      alt="Listing banner preview"
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-foreground)_8%,transparent)_0%,transparent_40%,color-mix(in_srgb,var(--color-foreground)_14%,transparent)_100%)]"
                      aria-hidden
                    />
                    <p className="absolute bottom-2 left-2 rounded-md bg-[color-mix(in_srgb,var(--color-foreground)_55%,transparent)] px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      Store: fills first viewport
                    </p>
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] max-h-56 flex-col items-center justify-center gap-1.5 bg-[color-mix(in_srgb,var(--color-muted)_6%,var(--color-surface))] px-4 text-center sm:max-h-64">
                    <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                      No image yet
                    </p>
                    <p className="max-w-sm text-[11px] leading-relaxed text-[var(--color-muted)]">
                      On the store this fills the first screen. Use a landscape
                      photo — it covers the area without stretching.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!canUpdate || pending}
                  className={cn(adminBtn("outline"), "!min-h-8 !px-3 !text-xs")}
                  onClick={() => setBannerMediaOpen(true)}
                >
                  {listingBannerImagePath ? "Change image" : "Choose image"}
                </button>
                {listingBannerImagePath ? (
                  <button
                    type="button"
                    disabled={!canUpdate || pending}
                    className={cn(adminBtn("ghost"), "!min-h-8 !px-2.5 !text-xs")}
                    onClick={() => setListingBannerImagePath(null)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {panel === "sections" ? (
        <section className={cn(adminCard(), adminCardPadding())}>
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            Product detail sections
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            Headings for the collapse blocks on every product page. Drag the
            handle to reorder. Active headings appear as fields on the product
            form.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onSectionDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-4 space-y-2">
                {sections.map((section, index) => (
                  <SortableRow
                    key={section.id}
                    id={section.id}
                    disabled={dragDisabled}
                  >
                    <TextField
                      size="small"
                      label="Heading"
                      placeholder="e.g. Description"
                      value={section.heading}
                      required
                      disabled={!canUpdate || pending}
                      error={Boolean(headingErrors[section.id])}
                      helperText={headingErrors[section.id]}
                      onChange={(e) => {
                        const heading = e.target.value;
                        setHeadingErrors((prev) => {
                          if (!prev[section.id]) return prev;
                          const next = { ...prev };
                          delete next[section.id];
                          return next;
                        });
                        setSections((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, heading } : item,
                          ),
                        );
                      }}
                      className="min-w-0 flex-1"
                    />
                    <AdminToggle
                      checked={section.active}
                      disabled={!canUpdate || pending}
                      onChange={(active) => {
                        setSections((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, active } : item,
                          ),
                        );
                      }}
                      label="Active"
                    />
                    <button
                      type="button"
                      className={cn(adminBtn("ghost"), "!min-h-8 !px-2")}
                      disabled={
                        !canUpdate || pending || sections.length <= 1
                      }
                      onClick={() =>
                        setSections((prev) =>
                          prev
                            .filter((_, i) => i !== index)
                            .map((item, i) => ({ ...item, sortOrder: i })),
                        )
                      }
                    >
                      Remove
                    </button>
                  </SortableRow>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            className={cn(adminBtn("outline"), "mt-3 !min-h-9")}
            disabled={!canUpdate || pending || sections.length >= 24}
            onClick={() =>
              setSections((prev) => [
                ...prev,
                {
                  id: newId(),
                  heading: "",
                  sortOrder: prev.length,
                  active: true,
                },
              ])
            }
          >
            Add heading
          </button>
        </section>
      ) : null}

      {panel === "faqs" ? (
        <section className={cn(adminCard(), adminCardPadding())}>
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            Product FAQs
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            Define questions once here. Drag to reorder. Answers are filled per
            product. FAQ is off on each product until enabled.
          </p>
          <div className="mt-4 max-w-md">
            <TextField
              size="small"
              label="FAQ header"
              placeholder="e.g. FAQs"
              value={faqHeading}
              required
              disabled={!canUpdate || pending}
              fullWidth
              error={Boolean(faqHeadingError)}
              helperText={faqHeadingError ?? undefined}
              onChange={(e) => {
                setFaqHeadingError(null);
                setFaqHeading(e.target.value);
              }}
            />
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onQuestionDragEnd}
          >
            <SortableContext
              items={faqQuestions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-4 space-y-2">
                {faqQuestions.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-[12px] text-[var(--color-muted)]">
                    No questions yet. Add one to start collecting answers on
                    products.
                  </li>
                ) : (
                  faqQuestions.map((q, index) => (
                    <SortableRow
                      key={q.id}
                      id={q.id}
                      disabled={dragDisabled}
                    >
                      <TextField
                        size="small"
                        label="Question"
                        placeholder="e.g. How should I store this?"
                        value={q.question}
                        required
                        disabled={!canUpdate || pending}
                        error={Boolean(questionErrors[q.id])}
                        helperText={questionErrors[q.id]}
                        onChange={(e) => {
                          const question = e.target.value;
                          setQuestionErrors((prev) => {
                            if (!prev[q.id]) return prev;
                            const next = { ...prev };
                            delete next[q.id];
                            return next;
                          });
                          setFaqQuestions((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, question } : item,
                            ),
                          );
                        }}
                        className="min-w-0 flex-1"
                      />
                      <AdminToggle
                        checked={q.active}
                        disabled={!canUpdate || pending}
                        onChange={(active) => {
                          setFaqQuestions((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, active } : item,
                            ),
                          );
                        }}
                        label="Active"
                      />
                      <button
                        type="button"
                        className={cn(adminBtn("ghost"), "!min-h-8 !px-2")}
                        disabled={!canUpdate || pending}
                        onClick={() =>
                          setFaqQuestions((prev) =>
                            prev
                              .filter((_, i) => i !== index)
                              .map((item, i) => ({ ...item, sortOrder: i })),
                          )
                        }
                      >
                        Remove
                      </button>
                    </SortableRow>
                  ))
                )}
              </ul>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            className={cn(adminBtn("outline"), "mt-3 !min-h-9")}
            disabled={!canUpdate || pending || faqQuestions.length >= 40}
            onClick={() =>
              setFaqQuestions((prev) => [
                ...prev,
                {
                  id: newId(),
                  question: "",
                  sortOrder: prev.length,
                  active: true,
                },
              ])
            }
          >
            Add question
          </button>
        </section>
      ) : null}

      {panel === "blog" ? (
        <section className={cn(adminCard(), adminCardPadding())}>
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            Blog on product page
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            Show articles linked to a product (from Content → Blog) above reels
            on the product detail page.
          </p>
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] p-3">
            <AdminToggle
              checked={blogEnabled}
              disabled={!canUpdate || pending}
              onChange={setBlogEnabled}
              label="Show blog posts on product pages"
              description="Off hides the section even when articles are linked"
              variant="row"
            />
          </div>
          <div className="mt-4 max-w-md">
            <TextField
              size="small"
              label="Section heading"
              placeholder={DEFAULT_PRODUCT_BLOG_HEADING}
              value={blogHeading}
              required
              disabled={!canUpdate || pending || !blogEnabled}
              fullWidth
              error={Boolean(blogHeadingError)}
              helperText={
                blogHeadingError ??
                "Shown above the linked articles (default: From our blog)."
              }
              onChange={(e) => {
                setBlogHeadingError(null);
                setBlogHeading(e.target.value);
              }}
            />
          </div>
        </section>
      ) : null}

      {canUpdate ? (
        <AdminSaveBar
          isDirty={isDirty}
          canUpdate={canUpdate}
          pending={pending}
          error={error}
          success={message}
          onSave={save}
          onCancel={resetFromInitial}
        />
      ) : null}

      <MediaPicker
        open={bannerMediaOpen}
        folder="products"
        allowUpload
        onClose={() => setBannerMediaOpen(false)}
        onSelect={(selection) => {
          setListingBannerImagePath(selection.storagePath);
          setBannerMediaOpen(false);
        }}
      />
    </div>
  );
}

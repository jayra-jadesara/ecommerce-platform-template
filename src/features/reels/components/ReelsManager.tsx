"use client";

import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminMultiSelect } from "@/features/admin/ui/AdminMultiSelect";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  createReelAction,
  deleteReelAction,
  patchReelAction,
  reorderReelsAction,
  updateAdminReelVideoMaxMbAction,
  updateReelAction,
  updateReelsAutoplayMutedAction,
  updateReelsProductCtaLabelAction,
  updateReelsProductPageHeadingAction,
  updateReelsShowcaseLimitAction,
  updateReelsVisibleSlidesAction,
  uploadReelVideoAction,
} from "@/features/reels/actions";
import {
  clampReelShowcaseLimit,
  clampReelVisibleSlides,
  normalizeReelProductPageHeading,
  REEL_PRODUCT_PAGE_HEADING_DEFAULT,
  REEL_PRODUCT_PAGE_HEADING_MAX,
  REEL_VISIBLE_SLIDES_DEFAULT,
  reelFormSchema,
  reelProductCtaOptions,
  reelShowcaseLimitOptions,
  reelVisibleSlidesOptions,
  type ReelFormValues,
  type ReelProductCtaLabel,
} from "@/features/reels/schemas";
import type { StoreReel } from "@/features/reels/types";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import {
  ADMIN_REEL_VIDEO_MAX_MB_DEFAULT,
  adminReelVideoMaxMbOptions,
  coerceAdminReelVideoMaxMb,
  formatReelVideoMaxMbHint,
  isValidReelAspectRatio,
  mbToBytes,
} from "@/features/media/upload-limits";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFormStack,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { cn } from "@/lib/cn";

type ProductOption = { id: string; label: string };

const iconBtnSx = {
  color: "var(--color-muted)",
  borderRadius: "10px",
  border: "1px solid transparent",
  "&:hover": {
    color: "var(--color-foreground)",
    backgroundColor:
      "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))",
    borderColor:
      "color-mix(in srgb, var(--color-primary) 22%, var(--color-border))",
  },
} as const;

const dialogPaperSx = {
  margin: 2,
  overflow: "hidden",
  borderRadius: "16px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  backgroundImage: "none",
  boxShadow:
    "0 24px 64px color-mix(in srgb, var(--color-foreground) 18%, transparent)",
} as const;

const dialogBackdropSx = {
  backgroundColor:
    "color-mix(in srgb, var(--color-foreground) 28%, transparent)",
  backdropFilter: "blur(6px)",
} as const;

function resolveVideoPreview(path: string | null | undefined) {
  if (!path) return undefined;
  return (
    resolvePublicStorageUrl(STORAGE_BUCKETS.reels, path) ||
    resolveCmsImageUrl(path)
  );
}

function readVideoDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (!width || !height) {
        reject(new Error("Could not read video dimensions."));
        return;
      }
      resolve({ width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata."));
    };
    video.src = url;
  });
}

function sortReels(list: StoreReel[]) {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });
}

/** Compact switch with label below — avoids mixed side-by-side labels. */
function VisibilityChip({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Tooltip title={hint} enterDelay={250}>
      <label
        className={cn(
          "flex w-[4.75rem] cursor-pointer flex-col items-center gap-0.5 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))] px-1.5 py-1.5 transition",
          checked &&
            "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]",
          disabled && "cursor-not-allowed opacity-55",
        )}
      >
        <Switch
          size="small"
          color="primary"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="!m-0"
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
          {label}
        </span>
      </label>
    </Tooltip>
  );
}

export function ReelsManager({
  initialReels,
  productOptions,
  productCtaLabel: initialCtaLabel,
  showcaseLimit: initialShowcaseLimit,
  autoplayMuted: initialAutoplay = true,
  productPageHeading: initialProductPageHeading = REEL_PRODUCT_PAGE_HEADING_DEFAULT,
  visibleSlides: initialVisibleSlides = REEL_VISIBLE_SLIDES_DEFAULT,
  canCreate,
  canUpdate,
  canDelete,
  adminReelVideoMaxMb: initialVideoMaxMb = ADMIN_REEL_VIDEO_MAX_MB_DEFAULT,
}: {
  initialReels: StoreReel[];
  productOptions: ProductOption[];
  productCtaLabel: ReelProductCtaLabel;
  showcaseLimit: number;
  autoplayMuted?: boolean;
  productPageHeading?: string;
  visibleSlides?: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  adminReelVideoMaxMb?: number;
}) {
  const router = useRouter();
  const settingsTitleId = useId();
  const formTitleId = useId();
  const [reels, setReels] = useState(() => sortReels(initialReels));
  const [ctaLabel, setCtaLabel] = useState(initialCtaLabel);
  const [showcaseLimit, setShowcaseLimit] = useState(
    clampReelShowcaseLimit(initialShowcaseLimit),
  );
  const [autoplayMuted, setAutoplayMuted] = useState(initialAutoplay);
  const [productPageHeading, setProductPageHeading] = useState(
    normalizeReelProductPageHeading(initialProductPageHeading),
  );
  const savedProductPageHeadingRef = useRef(
    normalizeReelProductPageHeading(initialProductPageHeading),
  );
  const [visibleSlides, setVisibleSlides] = useState(
    clampReelVisibleSlides(initialVisibleSlides),
  );
  const [videoMaxMb, setVideoMaxMb] = useState(
    coerceAdminReelVideoMaxMb(initialVideoMaxMb),
  );
  const [editing, setEditing] = useState<StoreReel | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<StoreReel | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const formOpen = creating || Boolean(editing);

  function applyReel(reel: StoreReel) {
    setReels((prev) =>
      sortReels(
        prev.some((r) => r.id === reel.id)
          ? prev.map((r) => (r.id === reel.id ? reel : r))
          : [reel, ...prev],
      ),
    );
  }

  function patchReel(
    reel: StoreReel,
    patch: {
      isActive?: boolean;
      showOnHome?: boolean;
      showOnProductPage?: boolean;
    },
  ) {
    if (!canUpdate) return;
    const previous = reel;
    applyReel({ ...reel, ...patch });
    setError(null);
    startTransition(async () => {
      const result = await patchReelAction(reel.id, patch);
      if (!result.ok) {
        applyReel(previous);
        setError(result.error);
        return;
      }
      applyReel(result.reel);
      router.refresh();
    });
  }

  function commitOrder(nextList: StoreReel[]) {
    const withOrder = nextList.map((reel, index) => ({
      ...reel,
      sortOrder: index,
    }));
    const previous = reels;
    setReels(withOrder);
    setError(null);
    startTransition(async () => {
      const result = await reorderReelsAction(withOrder.map((r) => r.id));
      if (!result.ok) {
        setReels(previous);
        setError(result.error);
        return;
      }
      setReels(sortReels(result.reels));
      router.refresh();
    });
  }

  function onDragStart(e: DragEvent, id: string) {
    if (!canUpdate || pending) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: DragEvent, id: string) {
    if (!canUpdate || !dragId || dragId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverId(id);
  }

  function onDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = dragId || e.dataTransfer.getData("text/plain");
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId || !canUpdate) return;
    const from = reels.findIndex((r) => r.id === sourceId);
    const to = reels.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...reels];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    commitOrder(next);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  return (
    <div className="space-y-3" style={adminStackStyle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-lg text-[12px] leading-snug text-[var(--color-muted)]">
          Drag to reorder. Visibility chips control home &amp; product pages.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {canUpdate ? (
            <button
              type="button"
              className={cn(adminBtn("secondary"), "gap-1.5")}
              onClick={() => {
                setError(null);
                setSettingsOpen(true);
              }}
            >
              <SettingsOutlinedIcon sx={{ fontSize: 17 }} aria-hidden />
              Settings
            </button>
          ) : null}
          {canCreate ? (
            <button
              type="button"
              className={adminBtn("primary")}
              onClick={() => {
                setCreating(true);
                setEditing(null);
                setError(null);
              }}
            >
              Add reel
            </button>
          ) : null}
        </div>
      </div>

      {error && !formOpen && !settingsOpen ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className={`${adminCard()} ${adminCardPadding()} !py-1.5`}>
        {reels.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            No reels yet. Click Add reel to upload a vertical MP4.
          </p>
        ) : (
          <>
            <div className="mb-1 hidden grid-cols-[1.25rem_2.75rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] lg:grid">
              <span />
              <span />
              <span>Reel</span>
              <span className="text-center">Visibility</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {reels.map((reel) => {
                const video = resolveVideoPreview(reel.videoPath);
                const isDragging = dragId === reel.id;
                const isOver = overId === reel.id && dragId !== reel.id;
                return (
                  <li
                    key={reel.id}
                    draggable={canUpdate && !pending}
                    onDragStart={(e) => onDragStart(e, reel.id)}
                    onDragOver={(e) => onDragOver(e, reel.id)}
                    onDrop={(e) => onDrop(e, reel.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className={cn(
                      "grid grid-cols-[1.25rem_2.75rem_minmax(0,1fr)] items-center gap-2.5 py-3 transition lg:grid-cols-[1.25rem_2.75rem_minmax(0,1fr)_auto_auto] lg:gap-3",
                      isDragging && "opacity-45",
                      isOver &&
                        "bg-[color-mix(in_srgb,var(--color-primary)_7%,transparent)]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-5 items-center justify-center text-[var(--color-muted)]",
                        canUpdate && !pending
                          ? "cursor-grab active:cursor-grabbing"
                          : "opacity-40",
                      )}
                      aria-hidden
                    >
                      <DragIndicatorIcon sx={{ fontSize: 18 }} />
                    </span>

                    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-black/85 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-border)_80%,transparent)]">
                      {video ? (
                        <video
                          src={video}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-white/45">
                          —
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold tracking-tight text-[var(--color-fg)]">
                        {reel.title || "Untitled"}
                      </p>
                      <p className="truncate text-[11px] text-[var(--color-muted)]">
                        {reel.productIds.length
                          ? `${reel.productIds.length} linked product${reel.productIds.length === 1 ? "" : "s"}`
                          : "No products"}
                        {reel.instagramUrl ? " · Instagram" : ""}
                      </p>
                    </div>

                    <div className="col-span-3 flex flex-wrap items-start justify-start gap-2 lg:col-span-1 lg:justify-center">
                      <VisibilityChip
                        label="Active"
                        hint="Reel is published and eligible to show"
                        checked={reel.isActive}
                        disabled={!canUpdate || pending}
                        onChange={(next) =>
                          patchReel(reel, { isActive: next })
                        }
                      />
                      <VisibilityChip
                        label="Home"
                        hint="Show on homepage showcase"
                        checked={reel.showOnHome}
                        disabled={!canUpdate || pending}
                        onChange={(next) =>
                          patchReel(reel, { showOnHome: next })
                        }
                      />
                      <VisibilityChip
                        label="Product"
                        hint="Show on linked product pages"
                        checked={reel.showOnProductPage}
                        disabled={!canUpdate || pending}
                        onChange={(next) =>
                          patchReel(reel, { showOnProductPage: next })
                        }
                      />
                    </div>

                    <div className="col-span-3 flex justify-end gap-0.5 lg:col-span-1">
                      {canUpdate ? (
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            aria-label={`Edit ${reel.title || "reel"}`}
                            disabled={pending}
                            onClick={() => {
                              setEditing(reel);
                              setCreating(false);
                              setError(null);
                            }}
                            sx={iconBtnSx}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canDelete ? (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            aria-label={`Delete ${reel.title || "reel"}`}
                            disabled={pending}
                            onClick={() => setDeleteTarget(reel)}
                            sx={{
                              ...iconBtnSx,
                              "&:hover": {
                                color: "var(--color-error)",
                                backgroundColor:
                                  "color-mix(in srgb, var(--color-error) 10%, var(--color-card))",
                                borderColor:
                                  "color-mix(in srgb, var(--color-error) 28%, var(--color-border))",
                              },
                            }}
                          >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <Dialog
        open={formOpen}
        onClose={pending ? undefined : closeForm}
        fullWidth
        maxWidth="sm"
        aria-labelledby={formTitleId}
        slotProps={{
          backdrop: { sx: dialogBackdropSx },
          paper: {
            className: "admin-form-dialog-paper",
            sx: {
              ...dialogPaperSx,
              maxHeight: "calc(100vh - 2rem)",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_12%,var(--color-card)),var(--color-card)_62%)] px-4 pb-3.5 pt-4">
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-[0_1px_3px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]">
                <MovieOutlinedIcon sx={{ fontSize: 22 }} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2
                  id={formTitleId}
                  className="text-[1rem] font-semibold tracking-tight text-[var(--color-foreground)]"
                >
                  {creating ? "Add reel" : "Edit reel"}
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
                  Vertical video, title, and product links for the storefront.
                </p>
              </div>
            </div>
            <IconButton
              size="small"
              aria-label="Close"
              disabled={pending}
              onClick={closeForm}
              sx={iconBtnSx}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </div>
        </div>
        <DialogContent
          className="!px-4 !pb-4 !pt-4"
          sx={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}
        >
          {error ? (
            <p className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-[13px] text-[var(--color-error)]">
              {error}
            </p>
          ) : null}
          <ReelForm
            mode={creating ? "create" : "edit"}
            reelId={editing?.id}
            productOptions={productOptions}
            adminReelVideoMaxMb={videoMaxMb}
            initialValues={{
              title: editing?.title ?? "",
              instagramUrl: editing?.instagramUrl ?? null,
              videoPath: editing?.videoPath ?? "",
              productIds: editing?.productIds ?? [],
            }}
            canSubmit={creating ? canCreate : canUpdate}
            onCancel={closeForm}
            onSaved={(reel) => {
              applyReel(reel);
              closeForm();
              router.refresh();
            }}
            onError={setError}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={settingsOpen}
        onClose={pending ? undefined : () => setSettingsOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby={settingsTitleId}
        slotProps={{
          backdrop: { sx: dialogBackdropSx },
          paper: {
            className: "admin-form-dialog-paper",
            sx: {
              ...dialogPaperSx,
              maxHeight: "calc(100vh - 2rem)",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_12%,var(--color-card)),var(--color-card)_62%)] px-4 pb-3.5 pt-4">
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-[0_1px_3px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]">
                <SettingsOutlinedIcon sx={{ fontSize: 22 }} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2
                  id={settingsTitleId}
                  className="text-[1rem] font-semibold tracking-tight text-[var(--color-foreground)]"
                >
                  Reel settings
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
                  Storefront headings, showcase limits, and uploads.
                </p>
              </div>
            </div>
            <IconButton
              size="small"
              aria-label="Close settings"
              disabled={pending}
              onClick={() => setSettingsOpen(false)}
              sx={iconBtnSx}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </div>
        </div>
        <DialogContent
          className={cn(adminFormStack(), "!px-4 !pb-4 !pt-4")}
          sx={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}
        >
          {error ? (
            <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-[13px] text-[var(--color-error)]">
              {error}
            </p>
          ) : null}
          <TextField
            label="Product page heading"
            size="small"
            fullWidth
            value={productPageHeading}
            disabled={!canUpdate || pending}
            slotProps={{
              htmlInput: { maxLength: REEL_PRODUCT_PAGE_HEADING_MAX },
            }}
            helperText="Shown above reels on product detail pages."
            onChange={(e) => setProductPageHeading(e.target.value)}
            onBlur={() => {
              if (!canUpdate || pending) return;
              const next = normalizeReelProductPageHeading(productPageHeading);
              setProductPageHeading(next);
              if (next === savedProductPageHeadingRef.current) return;
              const previous = savedProductPageHeadingRef.current;
              setError(null);
              startTransition(async () => {
                const result = await updateReelsProductPageHeadingAction(next);
                if (!result.ok) {
                  setProductPageHeading(previous);
                  setError(result.error);
                  return;
                }
                savedProductPageHeadingRef.current = result.heading;
                setProductPageHeading(result.heading);
                router.refresh();
              });
            }}
          />
          <AdminSelect
            label="Showcase count"
            value={String(showcaseLimit)}
            disabled={!canUpdate || pending}
            options={reelShowcaseLimitOptions()}
            helperText="Max reels loaded on the homepage (by drag order)."
            onChange={(value) => {
              const previous = showcaseLimit;
              const next = clampReelShowcaseLimit(value);
              setShowcaseLimit(next);
              setError(null);
              startTransition(async () => {
                const result = await updateReelsShowcaseLimitAction(next);
                if (!result.ok) {
                  setShowcaseLimit(previous);
                  setError(result.error);
                  return;
                }
                setShowcaseLimit(result.limit);
                router.refresh();
              });
            }}
          />
          <AdminSelect
            label="Visible slides"
            value={String(visibleSlides)}
            disabled={!canUpdate || pending}
            options={reelVisibleSlidesOptions()}
            helperText="How many reels peek in the carousel at once (home & product)."
            onChange={(value) => {
              const previous = visibleSlides;
              const next = clampReelVisibleSlides(value);
              setVisibleSlides(next);
              setError(null);
              startTransition(async () => {
                const result = await updateReelsVisibleSlidesAction(next);
                if (!result.ok) {
                  setVisibleSlides(previous);
                  setError(result.error);
                  return;
                }
                setVisibleSlides(result.visibleSlides);
                router.refresh();
              });
            }}
          />
          <AdminToggle
            variant="row"
            label="Autoplay reels"
            description="Muted autoplay on home and product showcase."
            checked={autoplayMuted}
            disabled={!canUpdate || pending}
            onChange={(next) => {
              const previous = autoplayMuted;
              setAutoplayMuted(next);
              setError(null);
              startTransition(async () => {
                const result = await updateReelsAutoplayMutedAction(next);
                if (!result.ok) {
                  setAutoplayMuted(previous);
                  setError(result.error);
                  return;
                }
                setAutoplayMuted(result.autoplayMuted);
                router.refresh();
              });
            }}
          />
          <AdminSelect
            label="Product button text"
            value={ctaLabel}
            disabled={!canUpdate || pending}
            options={reelProductCtaOptions()}
            helperText="Label on product CTAs in the reel showcase."
            onChange={(value) => {
              const previous = ctaLabel;
              setCtaLabel(value as ReelProductCtaLabel);
              setError(null);
              startTransition(async () => {
                const result = await updateReelsProductCtaLabelAction(value);
                if (!result.ok) {
                  setCtaLabel(previous);
                  setError(result.error);
                  return;
                }
                setCtaLabel(result.label);
                router.refresh();
              });
            }}
          />
          <AdminSelect
            label="Reel video max size"
            value={String(videoMaxMb)}
            disabled={!canUpdate || pending}
            options={adminReelVideoMaxMbOptions()}
            helperText="Upload limit for MP4 / WebM reels (2–50 MB)."
            onChange={(value) => {
              const previous = videoMaxMb;
              const next = coerceAdminReelVideoMaxMb(value);
              setVideoMaxMb(next);
              setError(null);
              startTransition(async () => {
                const result = await updateAdminReelVideoMaxMbAction(next);
                if (!result.ok) {
                  setVideoMaxMb(previous);
                  setError(result.error);
                  return;
                }
                setVideoMaxMb(result.mb);
                router.refresh();
              });
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete reel?"
        message={`Delete “${deleteTarget?.title || "this reel"}”? This cannot be undone.`}
        pending={pending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteReelAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setReels((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

function ReelForm({
  mode,
  reelId,
  initialValues,
  productOptions,
  adminReelVideoMaxMb,
  canSubmit,
  onCancel,
  onSaved,
  onError,
}: {
  mode: "create" | "edit";
  reelId?: string;
  initialValues: ReelFormValues;
  productOptions: ProductOption[];
  adminReelVideoMaxMb: number;
  canSubmit: boolean;
  onCancel: () => void;
  onSaved: (reel: StoreReel) => void;
  onError: (message: string | null) => void;
}) {
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pending, startTransition] = useTransition();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const maxBytes = mbToBytes(adminReelVideoMaxMb);
  const videoHint = formatReelVideoMaxMbHint(adminReelVideoMaxMb);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { errors },
  } = useForm<ReelFormValues>({
    resolver: zodResolver(reelFormSchema) as Resolver<ReelFormValues>,
    defaultValues: initialValues,
  });

  const videoPath = useWatch({ control, name: "videoPath" });
  const videoPreview = resolveVideoPreview(videoPath);

  async function onUploadVideo(file: File | null) {
    if (!file) return;
    setUploadingVideo(true);
    onError(null);
    try {
      if (file.size > maxBytes) {
        onError(`Video must be ${adminReelVideoMaxMb} MB or smaller.`);
        return;
      }

      let dimensions: { width: number; height: number };
      try {
        dimensions = await readVideoDimensions(file);
      } catch {
        onError("Could not read video dimensions. Try another MP4.");
        return;
      }

      if (!isValidReelAspectRatio(dimensions.width, dimensions.height)) {
        onError(
          "Video must be vertical reel ratio (~9:16). Landscape or square files are not allowed.",
        );
        return;
      }

      const fd = new FormData();
      fd.set("file", file);
      fd.set("width", String(dimensions.width));
      fd.set("height", String(dimensions.height));
      const result = await uploadReelVideoAction(fd);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      setValue("videoPath", result.path, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        onError(null);
        startTransition(async () => {
          const payload = {
            ...values,
            instagramUrl: values.instagramUrl || null,
          };
          const result =
            mode === "create"
              ? await createReelAction(payload)
              : await updateReelAction(reelId!, payload);
          if (!result.ok) {
            const serverFieldErrors = resultFieldErrors(result);
            if (serverFieldErrors) {
              applyServerFieldErrors(setFieldError as never, serverFieldErrors);
              focusFirstFieldError({
                fieldErrors: serverFieldErrors,
                setFocus: setFocus as (name: string) => void,
              });
            }
            onError(result.error);
            return;
          }
          onSaved(result.reel);
        });
      })}
    >
      <div className="grid gap-4 sm:grid-cols-[6.75rem_minmax(0,1fr)] sm:items-start">
        <div className="mx-auto w-[6.75rem] shrink-0 space-y-1.5 sm:mx-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Video <span className="text-[var(--color-error)]">*</span>
          </p>
          <button
            type="button"
            disabled={uploadingVideo || pending}
            onClick={() => videoInputRef.current?.click()}
            className={cn(
              "group relative mx-auto flex w-full overflow-hidden rounded-2xl bg-black text-left ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] transition",
              "shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)]",
              "hover:ring-[color-mix(in_srgb,var(--color-primary)_65%,var(--color-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
              (uploadingVideo || pending) && "opacity-70",
            )}
            style={{ aspectRatio: "9 / 16" }}
            aria-label={videoPath ? "Replace video" : "Upload video"}
          >
            {videoPreview ? (
              <video
                src={videoPreview}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_18%,#111)_0%,#0a0a0a_55%)] px-2 text-center">
                <span className="text-[10px] font-semibold tracking-wide text-white/90">
                  9:16
                </span>
                <span className="text-[9px] leading-snug text-white/55">
                  Tap to upload
                </span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-5 text-center text-[9px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
              {uploadingVideo
                ? "Uploading…"
                : videoPath
                  ? "Replace"
                  : "Upload"}
            </span>
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(e) => onUploadVideo(e.target.files?.[0] ?? null)}
          />
          <p className="text-center text-[10px] leading-snug text-[var(--color-muted)]">
            {videoHint}
          </p>
          <FieldError message={errors.videoPath?.message} />
        </div>

        <div className={cn(adminFormStack(), "min-w-0")}>
          <TextField
            label="Title"
            size="small"
            fullWidth
            required
            {...register("title")}
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
          />
          <TextField
            label="Instagram URL (optional)"
            size="small"
            fullWidth
            placeholder="https://www.instagram.com/reel/…"
            {...register("instagramUrl")}
            error={Boolean(errors.instagramUrl)}
            helperText={errors.instagramUrl?.message}
          />
          <Controller
            control={control}
            name="productIds"
            render={({ field }) => (
              <AdminMultiSelect
                label="Linked products"
                options={productOptions}
                value={field.value}
                onChange={(ids) => field.onChange(ids.slice(0, 12))}
                placeholder="Search products…"
                helperText={`${field.value.length}/12 linked`}
              />
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
        <button
          type="button"
          className={cn(adminBtn("secondary"), "!min-h-9 !px-3 !text-xs")}
          onClick={onCancel}
          disabled={pending || uploadingVideo}
        >
          Cancel
        </button>
        {canSubmit ? (
          <button
            type="submit"
            className={cn(adminBtn("primary"), "!min-h-9 !px-3 !text-xs")}
            disabled={pending || uploadingVideo}
          >
            {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

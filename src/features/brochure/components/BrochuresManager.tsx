"use client";

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createBrochureAction,
  deleteBrochureAction,
  renameBrochureAction,
  setAdminBrochurePdfMaxMbAction,
  setBrochurePageDescriptionAction,
  updateBrochureAction,
  uploadBrochurePdfAction,
} from "@/features/brochure/actions";
import type { StoreBrochure } from "@/features/brochure/types";
import {
  BROCHURE_PAGE_DESCRIPTION_MAX,
  normalizeBrochurePageDescription,
} from "@/features/brochure/page-description";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFormStack,
} from "@/features/admin/ui/admin-classes";
import {
  ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT,
  adminBrochurePdfMaxMbOptions,
  coerceAdminBrochurePdfMaxMb,
  formatBrochurePdfMaxMbHint,
  mbToBytes,
} from "@/features/media/upload-limits";
import { cn } from "@/lib/cn";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const JUST_CREATED_KEY = "admin:brochure:just-created";

function readJustCreated(): StoreBrochure | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(JUST_CREATED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoreBrochure;
  } catch {
    return null;
  }
}

function rememberJustCreated(brochure: StoreBrochure) {
  try {
    sessionStorage.setItem(JUST_CREATED_KEY, JSON.stringify(brochure));
  } catch {
    /* ignore quota */
  }
}

function clearJustCreated() {
  try {
    sessionStorage.removeItem(JUST_CREATED_KEY);
  } catch {
    /* ignore */
  }
}

function mergeBrochures(
  server: StoreBrochure[],
  pending: StoreBrochure | null,
): StoreBrochure[] {
  if (!pending) return server;
  if (server.some((b) => b.id === pending.id)) {
    clearJustCreated();
    return server;
  }
  return [pending, ...server];
}

const successBannerClass =
  "rounded-xl border border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] px-3 py-2 text-[13px] text-[var(--color-success)]";

export type BrochuresTab = "list" | "create";

type BrochuresManagerProps = {
  initialBrochures: StoreBrochure[];
  adminBrochurePdfMaxMb?: number;
  /** Storefront /brochure intro under the heading. */
  pageDescription?: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  tab: BrochuresTab;
  listHref: string;
  createHref: string;
};

export function BrochuresManager({
  initialBrochures,
  adminBrochurePdfMaxMb: initialMaxMb = ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT,
  pageDescription: initialPageDescription = "",
  canCreate,
  canUpdate,
  canDelete,
  tab,
  listHref,
  createHref,
}: BrochuresManagerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [brochures, setBrochures] = useState(initialBrochures);
  const [title, setTitle] = useState("");
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfSizeBytes, setPdfSizeBytes] = useState(0);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfMaxMb, setPdfMaxMb] = useState(initialMaxMb);
  const [pageDescription, setPageDescription] = useState(initialPageDescription);
  const savedPageDescriptionRef = useRef(initialPageDescription);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreBrochure | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setBrochures(mergeBrochures(initialBrochures, readJustCreated()));
  }, [initialBrochures]);

  useEffect(() => {
    const pending = readJustCreated();
    if (!pending) return;
    setBrochures((prev) => mergeBrochures(prev, pending));
  }, []);

  useEffect(() => {
    setPdfMaxMb(initialMaxMb);
  }, [initialMaxMb]);

  useEffect(() => {
    setPageDescription(initialPageDescription);
    savedPageDescriptionRef.current = initialPageDescription;
  }, [initialPageDescription]);

  const maxBytes = mbToBytes(pdfMaxMb);
  const pdfHint = formatBrochurePdfMaxMbHint(pdfMaxMb);
  const hasUnpublishedDraft = Boolean(pdfPath);
  const showSuccessMessage =
    Boolean(message) &&
    !error &&
    !(tab === "list" && hasUnpublishedDraft && /add a title/i.test(message ?? ""));

  function resetForm() {
    setTitle("");
    setPdfPath(null);
    setPdfSizeBytes(0);
    setPdfName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function goToListWithBrochure(brochure: StoreBrochure, successMessage: string) {
    rememberJustCreated(brochure);
    setBrochures((prev) => mergeBrochures(prev, brochure));
    resetForm();
    setError(null);
    setMessage(successMessage);
    router.push(listHref);
    router.refresh();
  }

  async function publishBrochure(path: string, sizeBytes: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a title.");
      return false;
    }
    const result = await createBrochureAction({
      title: trimmed,
      pdfPath: path,
      fileSizeBytes: sizeBytes,
    });
    if (!result.ok) {
      setError(result.error || "Unable to save brochure.");
      return false;
    }
    goToListWithBrochure(result.brochure, result.message);
    return true;
  }

  async function onPickPdf(file: File | null) {
    if (!file || !canCreate) return;
    setError(null);
    setMessage(null);

    if (file.size > maxBytes) {
      setError(`PDF must be ${pdfMaxMb} MB or smaller.`);
      return;
    }
    const mime = (file.type || "").toLowerCase();
    if (
      mime !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are allowed.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadBrochurePdfAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPdfPath(result.path);
      setPdfSizeBytes(result.sizeBytes);
      setPdfName(file.name);

      const trimmedTitle = title.trim();
      if (trimmedTitle) {
        await publishBrochure(result.path, result.sizeBytes, trimmedTitle);
        return;
      }
      setMessage("PDF uploaded. Add a title, then publish to see it in the list.");
    } finally {
      setUploading(false);
    }
  }

  function saveNew() {
    if (!canCreate || !pdfPath) {
      setError("Upload a PDF first.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      await publishBrochure(pdfPath, pdfSizeBytes, title);
    });
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex min-w-0 flex-1 gap-1 rounded-xl bg-[var(--color-surface)] p-1 ring-1 ring-[var(--color-border)] sm:max-w-xs"
          role="tablist"
        >
          <Link
            href={listHref}
            role="tab"
            aria-selected={tab === "list"}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-[12px] font-semibold transition",
              tab === "list"
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            List
            {brochures.length > 0 ? (
              <span className="ml-1.5 tabular-nums text-[10px] text-[var(--color-muted)]">
                {brochures.length}
              </span>
            ) : null}
          </Link>
          {canCreate ? (
            <Link
              href={createHref}
              role="tab"
              aria-selected={tab === "create"}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-center text-[12px] font-semibold transition",
                tab === "create"
                  ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              Create
            </Link>
          ) : null}
        </div>

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
              Brochure settings
            </button>
          ) : null}
          {canCreate && tab === "list" ? (
            <Link
              href={createHref}
              className={cn(adminBtn("primary"), "gap-1.5 no-underline")}
            >
              <AddOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />
              Add brochure
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-[13px] text-[var(--color-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {showSuccessMessage ? (
        <p className={successBannerClass} role="status">
          {message}
        </p>
      ) : null}
      {tab === "list" && hasUnpublishedDraft && !error ? (
        <p
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-warning,var(--color-primary))_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning,var(--color-primary))_8%,var(--color-card))] px-3 py-2 text-[13px] text-[var(--color-foreground)]"
          role="status"
        >
          PDF uploaded but not published yet.{" "}
          <Link
            href={createHref}
            className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Finish on Create
          </Link>{" "}
          (add a title and publish) to show it here.
        </p>
      ) : null}

      {tab === "list" ? (
        <section
          className={cn(adminCard(), adminCardPadding(), "!p-0 overflow-hidden")}
        >
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_4%,var(--color-card)),var(--color-card))] px-4 py-3.5">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Published PDFs
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
                Downloads count when shoppers use Download on /brochure.
              </p>
            </div>
          </div>

          {brochures.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))]">
                <PictureAsPdfOutlinedIcon sx={{ fontSize: 26 }} />
              </span>
              <p className="mt-4 text-[14px] font-medium text-[var(--color-foreground)]">
                No brochures yet
              </p>
              <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[var(--color-muted)]">
                Upload a PDF with a clear title. It appears on the store for
                customers to download.
              </p>
              {canCreate ? (
                <Link
                  href={createHref}
                  className={cn(
                    adminBtn("primary"),
                    "mt-5 gap-1.5 no-underline",
                  )}
                >
                  <AddOutlinedIcon sx={{ fontSize: 18 }} />
                  Create brochure
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {brochures.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_3%,transparent)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]">
                      <PictureAsPdfOutlinedIcon sx={{ fontSize: 20 }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      {editingId === item.id ? (
                        <TextField
                          size="small"
                          label="Title"
                          value={editTitle}
                          disabled={pending}
                          onChange={(e) => setEditTitle(e.target.value)}
                          fullWidth
                          className="max-w-md"
                        />
                      ) : (
                        <>
                          <p className="truncate text-[14px] font-semibold text-[var(--color-foreground)]">
                            {item.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-muted)]">
                            <span>{formatBytes(item.fileSizeBytes)}</span>
                            <span
                              className="h-1 w-1 rounded-full bg-[var(--color-border)]"
                              aria-hidden
                            />
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--color-foreground)]">
                              {item.downloadCount.toLocaleString()} downloads
                            </span>
                            {!item.isActive ? (
                              <span className="rounded-full bg-[color-mix(in_srgb,var(--color-muted)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <AdminToggle
                      checked={item.isActive}
                      disabled={!canUpdate || pending}
                      label="Active"
                      onChange={(active) => {
                        const previous = item.isActive;
                        setBrochures((prev) =>
                          prev.map((b) =>
                            b.id === item.id ? { ...b, isActive: active } : b,
                          ),
                        );
                        startTransition(async () => {
                          const result = await updateBrochureAction(item.id, {
                            isActive: active,
                          });
                          if (!result.ok) {
                            setBrochures((prev) =>
                              prev.map((b) =>
                                b.id === item.id
                                  ? { ...b, isActive: previous }
                                  : b,
                              ),
                            );
                            setError(result.error);
                            return;
                          }
                          setBrochures((prev) =>
                            prev.map((b) =>
                              b.id === item.id ? result.brochure : b,
                            ),
                          );
                          router.refresh();
                        });
                      }}
                    />
                    {editingId === item.id ? (
                      <>
                        <button
                          type="button"
                          className={cn(
                            adminBtn("primary"),
                            "!min-h-8 !px-2.5 !text-xs",
                          )}
                          disabled={!canUpdate || pending}
                          onClick={() => {
                            startTransition(async () => {
                              const result = await renameBrochureAction(
                                item.id,
                                editTitle,
                              );
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setBrochures((prev) =>
                                prev.map((b) =>
                                  b.id === item.id ? result.brochure : b,
                                ),
                              );
                              setEditingId(null);
                              setMessage(result.message);
                              router.refresh();
                            });
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={cn(
                            adminBtn("ghost"),
                            "!min-h-8 !px-2 !text-xs",
                          )}
                          disabled={pending}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {canUpdate ? (
                          <button
                            type="button"
                            className={cn(
                              adminBtn("ghost"),
                              "!min-h-8 !gap-1 !px-2 !text-xs",
                            )}
                            disabled={pending}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditTitle(item.title);
                            }}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 15 }} />
                            Rename
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className={cn(
                              adminBtn("ghost"),
                              "!min-h-8 !gap-1 !px-2 !text-xs text-[var(--color-error)]",
                            )}
                            disabled={pending}
                            onClick={() => setDeleteTarget(item)}
                          >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                            Delete
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "create" && canCreate ? (
        <section className={cn(adminCard(), adminCardPadding(), "max-w-2xl")}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))]">
              <CloudUploadOutlinedIcon sx={{ fontSize: 22 }} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                New brochure
              </h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
                Title and PDF only. Appears on the storefront /brochure page.
              </p>
            </div>
          </div>

          <div className={cn(adminFormStack(), "mt-5")}>
            <TextField
              size="small"
              label="Title"
              placeholder="e.g. Product catalogue 2026"
              value={title}
              required
              disabled={pending || uploading}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => void onPickPdf(e.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              disabled={pending || uploading}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onPickPdf(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition",
                dragOver
                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]"
                  : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                (pending || uploading) && "opacity-60",
              )}
            >
              <CloudUploadOutlinedIcon
                sx={{ fontSize: 28 }}
                className="text-[var(--color-primary)]"
              />
              <p className="mt-2 text-[13px] font-semibold text-[var(--color-foreground)]">
                {uploading
                  ? "Uploading…"
                  : pdfPath
                    ? "Replace PDF"
                    : "Drop PDF here or click to upload"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                {pdfHint}
              </p>
              {pdfName ? (
                <p className="mt-3 flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] text-[var(--color-foreground)]">
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />
                  <span className="truncate">{pdfName}</span>
                  <span className="shrink-0 text-[var(--color-muted)]">
                    · {formatBytes(pdfSizeBytes)}
                  </span>
                </p>
              ) : null}
            </button>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                className={cn(adminBtn("primary"), "!min-h-10")}
                disabled={pending || uploading || !pdfPath || !title.trim()}
                onClick={saveNew}
              >
                {pending ? "Saving…" : "Publish brochure"}
              </button>
              <Link
                href={listHref}
                className={cn(adminBtn("ghost"), "!min-h-10 no-underline")}
              >
                Cancel
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <AdminDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Brochure settings"
        description="Storefront intro copy and PDF upload limits."
        maxWidth="xs"
        pending={pending}
        icon={<SettingsOutlinedIcon sx={{ fontSize: 22 }} />}
      >
        <TextField
          label="Page description"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={pageDescription}
          disabled={!canUpdate || pending}
          slotProps={{
            htmlInput: { maxLength: BROCHURE_PAGE_DESCRIPTION_MAX },
          }}
          helperText="Shown under the Brochure heading on /brochure. Leave blank for the brand default."
          onChange={(e) => setPageDescription(e.target.value)}
          onBlur={() => {
            if (!canUpdate || pending) return;
            const next = normalizeBrochurePageDescription(pageDescription);
            setPageDescription(next);
            if (next === savedPageDescriptionRef.current) return;
            const previous = savedPageDescriptionRef.current;
            setError(null);
            startTransition(async () => {
              const result = await setBrochurePageDescriptionAction(next);
              if (!result.ok) {
                setPageDescription(previous);
                setError(result.error);
                return;
              }
              savedPageDescriptionRef.current = result.description;
              setPageDescription(result.description);
              setMessage("Brochure page description saved.");
              router.refresh();
            });
          }}
        />
        <AdminSelect
          label="Max PDF size"
          value={String(pdfMaxMb)}
          disabled={!canUpdate || pending}
          options={adminBrochurePdfMaxMbOptions()}
          helperText="Applies to new uploads (1–20 MB)."
          onChange={(value) => {
            const previous = pdfMaxMb;
            const next = coerceAdminBrochurePdfMaxMb(value);
            setPdfMaxMb(next);
            setError(null);
            startTransition(async () => {
              const result = await setAdminBrochurePdfMaxMbAction(next);
              if (!result.ok) {
                setPdfMaxMb(previous);
                setError(result.error);
                return;
              }
              setPdfMaxMb(result.mb);
              setMessage(`PDF upload limit set to ${result.mb} MB.`);
              router.refresh();
            });
          }}
        />
      </AdminDialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete brochure?"
        message={`Delete “${deleteTarget?.title || "this brochure"}”? The PDF will be removed.`}
        pending={pending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteBrochureAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setBrochures((prev) =>
              prev.filter((b) => b.id !== deleteTarget.id),
            );
            setDeleteTarget(null);
            setMessage(result.message);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

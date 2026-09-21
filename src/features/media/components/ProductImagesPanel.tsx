"use client";

import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  attachProductImageFromMediaAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryProductImageAction,
  updateProductImageAltAction,
  uploadProductImageAction,
} from "@/features/media/actions";
import { MediaPicker } from "@/features/media/components/MediaPicker";
import { SortableImageList } from "@/features/media/components/SortableImageList";
import type { ProductImageRow } from "@/features/media/product-images-service";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import { resolvePublicStorageUrl, resolveStoragePathUrl } from "@/lib/supabase/storage-url";

interface ProductImagesPanelProps {
  productId: string;
  initialImages: ProductImageRow[];
  canUpload: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** When true, omit outer card/title (parent StepCard provides them). */
  embedded?: boolean;
  /** Admin-configured max upload size in MB. */
  adminImageMaxMb?: number;
}

function imageUrl(row: ProductImageRow): string {
  return (
    row.public_url ||
    resolveStoragePathUrl(row.storage_path) ||
    resolvePublicStorageUrl("products", row.storage_path) ||
    ""
  );
}

export function ProductImagesPanel({
  productId,
  initialImages,
  canUpload,
  canUpdate,
  canDelete,
  embedded = false,
  adminImageMaxMb = 5,
}: ProductImagesPanelProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refreshLocal = useCallback((next: ProductImageRow[]) => {
    setImages(
      [...next].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.created_at.localeCompare(b.created_at),
      ),
    );
  }, []);

  const busy = pending || uploading;

  const body = (
    <>
      {!embedded ? (
        <div>
          <h2 className="font-semibold">Product images</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Photos are shown in full (no stretch or crop). The primary image is
            used on product cards and the product page.
          </p>
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-[var(--color-muted)]">
          Full photos (no crop). The primary image is used on cards and the
          product page.
        </p>
      )}

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {canUpload ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-dashed px-2.5 py-2",
            "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))]",
          )}
        >
          <div className="flex min-w-0 items-center gap-2 text-left">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-card)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
              <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight">
                Add product photos
              </p>
              <p className="truncate text-[10px] leading-snug text-[var(--color-muted)]">
                Choose from Images & Files · JPEG / PNG / WebP · max{" "}
                {adminImageMaxMb} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPickerOpen(true)}
            className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
          >
            Choose
          </button>
        </div>
      ) : null}

      <SortableImageList
        items={images.map((image) => ({
          id: image.id,
          url: imageUrl(image),
          altText: image.alt_text ?? "",
          isPrimary: image.is_primary,
        }))}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onSetPrimary={(id) => {
          startTransition(async () => {
            const result = await setPrimaryProductImageAction(id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            refreshLocal(
              images.map((image) => ({
                ...image,
                is_primary: image.id === id,
              })),
            );
            setSuccess(result.message);
            router.refresh();
          });
        }}
        onDelete={(id) => {
          startTransition(async () => {
            const result = await deleteProductImageAction(id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            const remaining = images.filter((image) => image.id !== id);
            if (
              images.find((image) => image.id === id)?.is_primary &&
              remaining[0]
            ) {
              remaining[0] = { ...remaining[0], is_primary: true };
            }
            refreshLocal(remaining);
            setSuccess(result.message);
            router.refresh();
          });
        }}
        onMove={(id, direction) => {
          const index = images.findIndex((image) => image.id === id);
          if (index < 0) return;
          const target = direction === "up" ? index - 1 : index + 1;
          if (target < 0 || target >= images.length) return;
          const next = [...images];
          const [item] = next.splice(index, 1);
          next.splice(target, 0, item);
          const withOrder = next.map((image, order) => ({
            ...image,
            sort_order: order,
          }));
          refreshLocal(withOrder);
          startTransition(async () => {
            const result = await reorderProductImagesAction(
              productId,
              withOrder.map((image) => image.id),
            );
            if (!result.ok) {
              setError(result.error);
              refreshLocal(images);
              return;
            }
            setSuccess(result.message);
            router.refresh();
          });
        }}
        onAltChange={(id, alt) => {
          startTransition(async () => {
            const result = await updateProductImageAltAction(id, alt);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            refreshLocal(
              images.map((image) =>
                image.id === id ? { ...image, alt_text: alt } : image,
              ),
            );
          });
        }}
      />

      <MediaPicker
        open={pickerOpen}
        folder="products"
        allowUpload
        adminImageMaxMb={adminImageMaxMb}
        onClose={() => setPickerOpen(false)}
        onSelect={(selection) => {
          setPickerOpen(false);
          setError(null);
          setSuccess(null);
          setUploading(true);
          void (async () => {
            try {
              // Prefer attaching library media; if the picker just uploaded,
              // the media row exists and this links it to the product.
              const attached = await attachProductImageFromMediaAction(
                productId,
                {
                  mediaId: selection.id,
                  storagePath: selection.storagePath,
                  altText: selection.altText,
                },
              );
              if (attached.ok && attached.image) {
                setImages((prev) => [...prev, attached.image!]);
                setSuccess(attached.message ?? "Image added.");
                router.refresh();
                return;
              }

              // Fallback: if attach failed because media metadata is missing,
              // fetch the file URL and re-upload as a product image.
              if (selection.publicUrl) {
                const response = await fetch(selection.publicUrl);
                if (!response.ok) {
                  setError(attached.ok ? "Could not add image." : attached.error);
                  return;
                }
                const blob = await response.blob();
                const ext =
                  blob.type === "image/png"
                    ? "png"
                    : blob.type === "image/webp"
                      ? "webp"
                      : "jpg";
                const file = new File([blob], `product.${ext}`, {
                  type: blob.type || "image/jpeg",
                });
                const formData = new FormData();
                formData.set("file", file);
                const uploaded = await uploadProductImageAction(
                  productId,
                  formData,
                );
                if (!uploaded.ok) {
                  setError(uploaded.error);
                  return;
                }
                if (uploaded.image) {
                  setImages((prev) => [...prev, uploaded.image!]);
                }
                setSuccess(uploaded.message ?? "Image uploaded.");
                router.refresh();
                return;
              }

              setError(attached.ok ? "Could not add image." : attached.error);
            } finally {
              setUploading(false);
            }
          })();
        }}
      />
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-5">
      {body}
    </section>
  );
}

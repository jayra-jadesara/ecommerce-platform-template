"use client";

import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryProductImageAction,
  updateProductImageAltAction,
  uploadProductImageAction,
} from "@/features/media/actions";
import { SortableImageList } from "@/features/media/components/SortableImageList";
import { UploadDropzone } from "@/features/media/components/UploadDropzone";
import type { ProductImageRow } from "@/features/media/product-images-service";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

interface ProductImagesPanelProps {
  productId: string;
  initialImages: ProductImageRow[];
  canUpload: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function imageUrl(row: ProductImageRow): string {
  return (
    row.public_url ||
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
}: ProductImagesPanelProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshLocal = useCallback((next: ProductImageRow[]) => {
    setImages(
      [...next].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.created_at.localeCompare(b.created_at),
      ),
    );
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      setSuccess(null);
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadProductImageAction(productId, formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.image) {
          setImages((prev) => [...prev, result.image!]);
        }
      }
      setSuccess("Images uploaded.");
      router.refresh();
    },
    [productId, router],
  );

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-5">
      <div>
        <h2 className="font-semibold">Product images</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Photos are shown in full (no stretch or crop). The primary image is
          used on product cards and the product page.
        </p>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <UploadDropzone
        disabled={!canUpload || pending}
        onFiles={uploadFiles}
        label="Drop product images here"
      />

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
    </section>
  );
}

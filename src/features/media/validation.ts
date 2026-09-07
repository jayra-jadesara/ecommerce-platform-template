import type { StorageBucket } from "@/lib/supabase/storage";

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

/** Default max upload size for product/media images (10 MB). */
export const MAX_MEDIA_IMAGE_BYTES = 10 * 1024 * 1024;

export const MEDIA_FOLDERS = [
  "products",
  "categories",
  "branding",
  "cms",
  "general",
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime);
}

export function extensionFromMime(mime: string): "jpg" | "png" | "webp" | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export function detectImageMimeFromBytes(
  bytes: Uint8Array,
): AllowedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageUpload(input: {
  declaredMime: string;
  size: number;
  fileName: string;
  bytes?: Uint8Array;
  maxBytes?: number;
}): { ok: true; mime: AllowedImageMime; ext: "jpg" | "png" | "webp" } | { ok: false; error: string } {
  const maxBytes = input.maxBytes ?? MAX_MEDIA_IMAGE_BYTES;
  if (input.size <= 0 || input.size > maxBytes) {
    return {
      ok: false,
      error: `Image must be between 1 byte and ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    };
  }

  const lower = input.fileName.toLowerCase();
  const hasExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasExt) {
    return {
      ok: false,
      error: "File extension must be .jpg, .jpeg, .png, or .webp.",
    };
  }

  if (lower.endsWith(".svg") || input.declaredMime === "image/svg+xml") {
    return { ok: false, error: "SVG uploads are not allowed." };
  }

  let mime: AllowedImageMime | null = isAllowedImageMime(input.declaredMime)
    ? input.declaredMime
    : null;

  if (input.bytes) {
    const detected = detectImageMimeFromBytes(input.bytes);
    if (!detected) {
      return { ok: false, error: "File content is not a valid JPEG, PNG, or WEBP image." };
    }
    if (mime && mime !== detected) {
      return {
        ok: false,
        error: "Declared MIME type does not match file contents.",
      };
    }
    mime = detected;
  }

  if (!mime) {
    return { ok: false, error: "Only JPEG, PNG, and WEBP images are allowed." };
  }

  const ext = extensionFromMime(mime);
  if (!ext) return { ok: false, error: "Unsupported image type." };

  return { ok: true, mime, ext };
}

/** Reject path traversal and absolute paths. */
export function assertSafeStorageSegment(value: string): boolean {
  if (!value || value.length > 200) return false;
  if (value.includes("..") || value.includes("\\") || value.includes("\0")) {
    return false;
  }
  if (value.startsWith("/") || value.includes("//")) return false;
  return /^[A-Za-z0-9._-]+$/.test(value);
}

export function assertSafeStoragePath(path: string): boolean {
  if (!path.trim() || path.includes("..") || path.includes("\\") || path.includes("\0")) {
    return false;
  }
  if (path.startsWith("/") || path.includes("//")) return false;
  const parts = path.split("/");
  return parts.every((part) => part.length > 0 && !part.includes(".."));
}

export function buildProductImagePath(input: {
  storeId: string;
  productId: string;
  fileId: string;
  ext: string;
}): string {
  if (
    !assertSafeStorageSegment(input.storeId) ||
    !assertSafeStorageSegment(input.productId) ||
    !assertSafeStorageSegment(input.fileId)
  ) {
    throw new Error("Unsafe storage path segment.");
  }
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  return `products/${input.storeId}/${input.productId}/${input.fileId}.${ext}`;
}

export function buildCategoryImagePath(input: {
  storeId: string;
  categoryId: string;
  fileId: string;
  ext: string;
}): string {
  if (
    !assertSafeStorageSegment(input.storeId) ||
    !assertSafeStorageSegment(input.categoryId) ||
    !assertSafeStorageSegment(input.fileId)
  ) {
    throw new Error("Unsafe storage path segment.");
  }
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  return `categories/${input.storeId}/${input.categoryId}/${input.fileId}.${ext}`;
}

export function buildGeneralMediaPath(input: {
  storeId: string;
  folder: MediaFolder;
  fileId: string;
  ext: string;
}): string {
  if (
    !assertSafeStorageSegment(input.storeId) ||
    !assertSafeStorageSegment(input.folder) ||
    !assertSafeStorageSegment(input.fileId)
  ) {
    throw new Error("Unsafe storage path segment.");
  }
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  const bucketRoot =
    input.folder === "general" ? "media" : input.folder;
  return `${bucketRoot}/${input.storeId}/library/${input.fileId}.${ext}`;
}

export function bucketForFolder(folder: MediaFolder): StorageBucket {
  switch (folder) {
    case "products":
      return "products";
    case "categories":
      return "categories";
    case "branding":
      return "branding";
    case "cms":
      return "cms";
    default:
      return "media";
  }
}

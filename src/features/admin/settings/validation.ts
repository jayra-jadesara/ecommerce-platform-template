import { z } from "zod";

const UNSAFE_URL_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

/** Safe absolute http(s) URL or empty. Prefers https. */
export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (UNSAFE_URL_PROTOCOLS.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Internal path (/...) or safe absolute http(s) URL. */
export function isSafeNavHref(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (UNSAFE_URL_PROTOCOLS.test(trimmed)) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("\\") || trimmed.includes("\0")) return false;
    return true;
  }
  return isSafeHttpUrl(trimmed) && Boolean(trimmed);
}

export const optionalSafeHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => isSafeHttpUrl(v), {
    message: "Enter a valid http(s) URL.",
  })
  .transform((v) => (v.trim() ? v.trim() : ""))
  .optional()
  .or(z.literal(""));

export const requiredSafeNavHref = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048)
  .refine((v) => isSafeNavHref(v), {
    message: "Use an internal path or a valid http(s) URL.",
  });

export const optionalSafeNavHref = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || isSafeNavHref(v), {
    message: "Use an internal path or a valid http(s) URL.",
  })
  .transform((v) => (v.trim() ? v.trim() : ""));

export const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address.",
  })
  .transform((v) => (v.trim() ? v.trim() : ""));

export const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .refine((v) => !v || /^[+0-9()\-\s.]{5,40}$/.test(v), {
    message: "Enter a valid phone number.",
  })
  .transform((v) => (v.trim() ? v.trim() : ""));

export const LOGO_SIZE_OPTIONS = ["small", "medium", "large"] as const;
export type LogoSizeOption = (typeof LOGO_SIZE_OPTIONS)[number];

export const BRANDING_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const BRANDING_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const MAX_BRANDING_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateBrandingImageFile(file: {
  type: string;
  size: number;
  name: string;
}): { ok: true } | { ok: false; error: string } {
  if (!BRANDING_IMAGE_MIME.includes(file.type as (typeof BRANDING_IMAGE_MIME)[number])) {
    return {
      ok: false,
      error: "Only JPEG, PNG, and WEBP images are allowed.",
    };
  }
  if (file.size <= 0 || file.size > MAX_BRANDING_IMAGE_BYTES) {
    return {
      ok: false,
      error: "Image must be between 1 byte and 5 MB.",
    };
  }
  const lower = file.name.toLowerCase();
  const hasExt = BRANDING_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasExt) {
    return {
      ok: false,
      error: "File extension must be .jpg, .jpeg, .png, or .webp.",
    };
  }
  return { ok: true };
}

export function brandingObjectPath(
  storeId: string,
  kind: "logo" | "dark-logo" | "favicon" | "social-image",
  ext: string,
): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  return `branding/${storeId}/${kind}.${safeExt}`;
}

export function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function diffChangedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      changed.push(key);
    }
  }
  return changed;
}

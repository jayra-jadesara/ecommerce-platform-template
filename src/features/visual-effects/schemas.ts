import { z } from "zod";

export const VISUAL_3D_PRESETS = [
  "NONE",
  "FLOATING_SHAPES",
  "PRODUCT_ORBIT",
  "ABSTRACT_PARTICLES",
  "SOFT_GEOMETRY",
] as const;

export type Visual3dPreset = (typeof VISUAL_3D_PRESETS)[number];

export const VISUAL_3D_QUALITY = ["LOW", "MEDIUM", "HIGH"] as const;
export type Visual3dQuality = (typeof VISUAL_3D_QUALITY)[number];

export const VISUAL_3D_PRESET_LABELS: Record<Visual3dPreset, string> = {
  NONE: "None (2D only)",
  FLOATING_SHAPES: "Floating shapes",
  PRODUCT_ORBIT: "Soft orbit",
  ABSTRACT_PARTICLES: "Soft particles",
  SOFT_GEOMETRY: "Soft geometry",
};

export const visualEffectsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  heroEnabled: z.boolean().default(false),
  productEnabled: z.boolean().default(false),
  quality: z.enum(VISUAL_3D_QUALITY).default("MEDIUM"),
  heroPreset: z.enum(VISUAL_3D_PRESETS).default("NONE"),
  mobileEnabled: z.boolean().default(false),
  respectReducedMotion: z.boolean().default(true),
});

export type VisualEffectsConfig = z.infer<typeof visualEffectsConfigSchema>;

export const DEFAULT_VISUAL_EFFECTS: VisualEffectsConfig = {
  enabled: false,
  heroEnabled: false,
  productEnabled: false,
  quality: "MEDIUM",
  heroPreset: "NONE",
  mobileEnabled: false,
  respectReducedMotion: true,
};

/** Normalize unknown DB/admin values; invalid presets → NONE. */
export function parseVisualEffectsConfig(
  input: unknown,
): VisualEffectsConfig {
  const parsed = visualEffectsConfigSchema.safeParse(input ?? {});
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_VISUAL_EFFECTS };
}

export function resolveHeroPreset(
  value: unknown,
): Visual3dPreset {
  if (
    typeof value === "string" &&
    (VISUAL_3D_PRESETS as readonly string[]).includes(value)
  ) {
    return value as Visual3dPreset;
  }
  return "NONE";
}

export function resolveQuality(value: unknown): Visual3dQuality {
  if (
    typeof value === "string" &&
    (VISUAL_3D_QUALITY as readonly string[]).includes(value)
  ) {
    return value as Visual3dQuality;
  }
  return "MEDIUM";
}

/**
 * Trusted product 3D asset path pattern:
 *   products/{storeId}/3d/{file}.glb|gltf
 * Rejects absolute URLs, protocol schemes, and path traversal.
 */
export const PRODUCT_MODEL_PATH_RE =
  /^products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/3d\/[A-Za-z0-9._-]+\.(glb|gltf)$/i;

export function isSafeModelStoragePath(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^(javascript|data|blob):/i.test(trimmed)) return false;
  if (trimmed.includes("..") || trimmed.includes("\\") || trimmed.startsWith("/")) {
    return false;
  }
  return PRODUCT_MODEL_PATH_RE.test(trimmed);
}

/** Reject models that belong to another store. */
export function isStoreScopedModelPath(
  path: string | null | undefined,
  storeId: string,
): boolean {
  if (!isSafeModelStoragePath(path) || !storeId) return false;
  const trimmed = path!.trim();
  const match = trimmed.match(PRODUCT_MODEL_PATH_RE);
  if (!match?.[1]) return false;
  return match[1].toLowerCase() === storeId.toLowerCase();
}

export function buildProductModelPath(input: {
  storeId: string;
  fileId: string;
  ext: "glb" | "gltf";
}): string {
  const fileId = input.fileId.replace(/[^A-Za-z0-9._-]/g, "");
  return `products/${input.storeId}/3d/${fileId}.${input.ext}`;
}

export const safeModelPathSchema = z
  .union([z.string(), z.null(), z.undefined(), z.literal("")])
  .transform((v) => {
    if (v == null || v === "") return null;
    return v.trim();
  })
  .refine((v) => v == null || isSafeModelStoragePath(v), {
    message: "Use a trusted store file path ending in .glb or .gltf.",
  });

/** Quality → safe internal render knobs (never exposed raw to Admin). */
export function qualityRenderHints(quality: Visual3dQuality): {
  dprMax: number;
  particleCount: number;
  shapeCount: number;
  enableShadows: boolean;
} {
  switch (quality) {
    case "LOW":
      return { dprMax: 1, particleCount: 24, shapeCount: 3, enableShadows: false };
    case "HIGH":
      return { dprMax: 2, particleCount: 80, shapeCount: 7, enableShadows: true };
    default:
      return { dprMax: 1.5, particleCount: 48, shapeCount: 5, enableShadows: false };
  }
}

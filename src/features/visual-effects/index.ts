export {
  DEFAULT_VISUAL_EFFECTS,
  VISUAL_3D_PRESETS,
  VISUAL_3D_PRESET_LABELS,
  VISUAL_3D_QUALITY,
  buildProductModelPath,
  isSafeModelStoragePath,
  isStoreScopedModelPath,
  parseVisualEffectsConfig,
  qualityRenderHints,
  resolveHeroPreset,
  resolveQuality,
  safeModelPathSchema,
  visualEffectsConfigSchema,
  type Visual3dPreset,
  type Visual3dQuality,
  type VisualEffectsConfig,
} from "./schemas";

export {
  clampHeroCameraDistance,
  clampHeroRotationSpeed,
  shouldMountDecorative3d,
  shouldMountHero3d,
  shouldMountProduct3d,
} from "./decide";

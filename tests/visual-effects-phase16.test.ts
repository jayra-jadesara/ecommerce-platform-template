import { describe, expect, it } from "vitest";
import {
  buildProductModelPath,
  DEFAULT_VISUAL_EFFECTS,
  isSafeModelStoragePath,
  isStoreScopedModelPath,
  parseVisualEffectsConfig,
  qualityRenderHints,
  resolveHeroPreset,
  resolveQuality,
  visualEffectsConfigSchema,
} from "@/features/visual-effects";
import {
  clampHeroCameraDistance,
  clampHeroRotationSpeed,
  shouldMountDecorative3d,
  shouldMountHero3d,
  shouldMountProduct3d,
} from "@/features/visual-effects/decide";
import {
  formValuesToVisualEffectsConfig,
  themeConfigToFormValues,
  validateThemeEditorPayload,
} from "@/features/admin/theme/editor-schema";
import { formValuesToVisualEffectsDbRow } from "@/features/admin/theme/map-to-db";
import { defaultPlatformConfig } from "@/config/defaults";
import { hasPermission } from "@/features/auth/permissions";
import {
  heroSectionConfigSchema,
  parseSectionConfig,
} from "@/features/cms/schemas";
import { readThemeColors } from "@/features/visual-effects/hooks";

const STORE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STORE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("visual effects config validation", () => {
  it("parses a valid config", () => {
    const parsed = visualEffectsConfigSchema.safeParse({
      enabled: true,
      heroEnabled: true,
      productEnabled: false,
      quality: "HIGH",
      heroPreset: "FLOATING_SHAPES",
      mobileEnabled: false,
      respectReducedMotion: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("falls back invalid preset to NONE via resolveHeroPreset", () => {
    expect(resolveHeroPreset("EVIL_SHADER")).toBe("NONE");
    expect(resolveHeroPreset("FLOATING_SHAPES")).toBe("FLOATING_SHAPES");
  });

  it("falls back invalid quality to MEDIUM", () => {
    expect(resolveQuality("ULTRA")).toBe("MEDIUM");
    expect(resolveQuality("LOW")).toBe("LOW");
  });

  it("parseVisualEffectsConfig rejects arbitrary junk safely", () => {
    const cfg = parseVisualEffectsConfig({
      enabled: "yes",
      heroPreset: "eval(alert(1))",
      quality: { nested: true },
      shaderCode: "void main(){}",
    });
    expect(cfg).toEqual(DEFAULT_VISUAL_EFFECTS);
  });

  it("does not execute arbitrary code from database-shaped input", () => {
    const spy = { ran: false };
    const payload = {
      enabled: true,
      heroPreset: "FLOATING_SHAPES",
      quality: "MEDIUM",
      // Impostor fields must be ignored by schema strip/defaults
      __proto__: { polluted: true },
      onMount: () => {
        spy.ran = true;
      },
    };
    const cfg = parseVisualEffectsConfig(payload);
    expect(spy.ran).toBe(false);
    expect(cfg.heroPreset).toBe("FLOATING_SHAPES");
    expect(cfg.enabled).toBe(true);
  });
});

describe("reduced motion / mobile / disabled gates", () => {
  const base = {
    visualEffects: {
      ...DEFAULT_VISUAL_EFFECTS,
      enabled: true,
      heroEnabled: true,
      productEnabled: true,
      heroPreset: "SOFT_GEOMETRY" as const,
      mobileEnabled: false,
      respectReducedMotion: true,
    },
    animationEnabled: true,
    featureEnabled: true,
    isMobile: false,
    prefersReducedMotion: false,
    webglAvailable: true,
    preset: "SOFT_GEOMETRY",
  };

  it("disables 3D when global visual effects off", () => {
    expect(
      shouldMountDecorative3d({
        ...base,
        visualEffects: { ...base.visualEffects, enabled: false },
      }),
    ).toBe(false);
  });

  it("disables 3D when WebGL unavailable", () => {
    expect(
      shouldMountDecorative3d({ ...base, webglAvailable: false }),
    ).toBe(false);
  });

  it("respects reduced motion", () => {
    expect(
      shouldMountDecorative3d({ ...base, prefersReducedMotion: true }),
    ).toBe(false);
  });

  it("keeps mobile 3D off by default", () => {
    expect(shouldMountDecorative3d({ ...base, isMobile: true })).toBe(false);
  });

  it("allows mobile when configured", () => {
    expect(
      shouldMountDecorative3d({
        ...base,
        isMobile: true,
        visualEffects: { ...base.visualEffects, mobileEnabled: true },
      }),
    ).toBe(true);
  });

  it("respects store animation master switch", () => {
    expect(
      shouldMountDecorative3d({ ...base, animationEnabled: false }),
    ).toBe(false);
  });

  it("hero gate requires section enable + store hero flag", () => {
    const off = shouldMountHero3d({
      ...base,
      section3dEnabled: false,
      sectionPreset: "FLOATING_SHAPES",
    });
    expect(off.mount).toBe(false);

    const on = shouldMountHero3d({
      ...base,
      section3dEnabled: true,
      sectionPreset: "FLOATING_SHAPES",
    });
    expect(on.mount).toBe(true);
    expect(on.preset).toBe("FLOATING_SHAPES");
  });

  it("product 3D requires trusted model", () => {
    expect(
      shouldMountProduct3d({ ...base, hasTrustedModel: false }),
    ).toBe(false);
    expect(
      shouldMountProduct3d({ ...base, hasTrustedModel: true }),
    ).toBe(true);
  });
});

describe("model path security", () => {
  it("accepts store-scoped glb paths", () => {
    const path = buildProductModelPath({
      storeId: STORE_A,
      fileId: "hero-pack",
      ext: "glb",
    });
    expect(isSafeModelStoragePath(path)).toBe(true);
    expect(isStoreScopedModelPath(path, STORE_A)).toBe(true);
  });

  it("rejects remote URLs and schemes", () => {
    expect(isSafeModelStoragePath("https://evil.example/x.glb")).toBe(false);
    expect(isSafeModelStoragePath("javascript:alert(1)")).toBe(false);
    expect(isSafeModelStoragePath("../../etc/passwd.glb")).toBe(false);
  });

  it("rejects cross-store assets", () => {
    const path = buildProductModelPath({
      storeId: STORE_A,
      fileId: "model",
      ext: "gltf",
    });
    expect(isStoreScopedModelPath(path, STORE_B)).toBe(false);
  });

  it("rejects non-glTF extensions", () => {
    expect(
      isSafeModelStoragePath(`products/${STORE_A}/3d/hack.exe`),
    ).toBe(false);
  });
});

describe("theme color usage (no hard-coded brand)", () => {
  it("quality hints are internal only", () => {
    expect(qualityRenderHints("LOW").dprMax).toBe(1);
    expect(qualityRenderHints("HIGH").enableShadows).toBe(true);
  });

  it("readThemeColors returns CSS variable fallbacks without brand names", () => {
    const colors = readThemeColors();
    expect(colors.primary).toBeTruthy();
    expect(JSON.stringify(colors).toLowerCase()).not.toContain("sonet");
  });
});

describe("admin visual effects payload", () => {
  it("maps form values to DB row without shaders/JS", () => {
    const form = themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
      undefined,
      {
        enabled: true,
        heroEnabled: true,
        productEnabled: false,
        quality: "MEDIUM",
        heroPreset: "ABSTRACT_PARTICLES",
        mobileEnabled: false,
        respectReducedMotion: true,
      },
    );
    const row = formValuesToVisualEffectsDbRow(form);
    expect(row.hero_preset).toBe("ABSTRACT_PARTICLES");
    expect(Object.keys(row).sort()).toEqual(
      [
        "enabled",
        "hero_enabled",
        "hero_preset",
        "mobile_enabled",
        "product_enabled",
        "quality",
        "respect_reduced_motion",
      ].sort(),
    );
    expect(formValuesToVisualEffectsConfig(form).heroPreset).toBe(
      "ABSTRACT_PARTICLES",
    );
  });

  it("rejects unauthorized roles for theme.update", () => {
    expect(hasPermission(["ORDER_MANAGER"], "theme.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "theme.update")).toBe(false);
    expect(hasPermission(["ADMIN"], "theme.update")).toBe(true);
  });

  it("rejects invalid visual3d preset in theme editor payload", () => {
    const form = themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
      undefined,
      defaultPlatformConfig.visualEffects,
    );
    const result = validateThemeEditorPayload({
      ...form,
      visual3dHeroPreset: "CUSTOM_JS",
    });
    expect(result.ok).toBe(false);
  });
});

describe("hero section 3D config", () => {
  it("accepts allow-listed hero 3D fields", () => {
    const parsed = heroSectionConfigSchema.safeParse({
      title: "Welcome",
      enable3d: true,
      scene3dPreset: "FLOATING_SHAPES",
      scene3dRotationSpeed: 0.5,
      scene3dCameraDistance: 5,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown section types / custom code paths", () => {
    const result = parseSectionConfig("custom", {
      componentPath: "@/evil",
      js: "alert(1)",
    });
    expect(result.ok).toBe(false);
  });

  it("clamps hero numeric knobs", () => {
    expect(clampHeroRotationSpeed(99)).toBe(2);
    expect(clampHeroRotationSpeed(-1)).toBe(0);
    expect(clampHeroCameraDistance(100)).toBe(12);
    expect(clampHeroCameraDistance(1)).toBe(2);
  });
});

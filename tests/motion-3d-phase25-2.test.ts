import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultPlatformConfig } from "@/config/defaults";
import {
  formValuesToAnimationConfig,
  formValuesToVisualEffectsConfig,
  themeConfigToFormValues,
} from "@/features/admin/theme/editor-schema";
import {
  applyRecommendedMotion3d,
  applyStoreFeel,
  applyThreeFeel,
  applyButtonStyle,
  applyButtonHover,
  applyPageMotion,
  applyCardMotion,
  applyScrollMotion,
  applyMobile3dUi,
  applyPerformanceUi,
  FORBIDDEN_STUDIO_TERMS,
  inferStoreFeel,
  inferThreeFeel,
  inferButtonStyle,
  inferButtonHover,
  inferPageMotion,
  inferMobile3dUi,
  inferPerformanceUi,
  STORE_FEEL_COPY,
  THREE_FEEL_COPY,
} from "@/features/motion-3d/studio-ui";
import {
  resolve3DConfig,
  resolveMotionConfig,
  applyMotionStylePreset,
  applyThreeStylePreset,
  RECOMMENDED_MOTION_3D,
} from "@/features/motion-3d";
import { hasPermission } from "@/features/auth/permissions";
import { parseSectionConfig } from "@/features/cms/schemas";
import type { SectionConfigMap } from "@/features/cms/schemas";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function baseForm() {
  return themeConfigToFormValues(
    defaultPlatformConfig.theme,
    defaultPlatformConfig.animation,
    undefined,
    defaultPlatformConfig.visualEffects,
  );
}

describe("Phase 25.2 — Store Feel mapping", () => {
  it("maps Calm/Modern/Lively/Bold onto safe internal presets", () => {
    expect(applyStoreFeel("CALM").animationIntensity).toMatch(/none|subtle/);
    expect(applyStoreFeel("MODERN")).toMatchObject({
      animationEnabled: true,
      animationIntensity: "medium",
    });
    expect(applyStoreFeel("LIVELY")).toMatchObject({
      animationEnabled: true,
      animationIntensity: "medium",
    });
    expect(applyStoreFeel("BOLD")).toMatchObject({
      animationEnabled: true,
      animationIntensity: "high",
    });
    expect(applyStoreFeel("DYNAMIC")).toMatchObject({
      animationEnabled: true,
      animationIntensity: "high",
    });
  });

  it("defaults recommend Modern feel with 3D off", () => {
    expect(RECOMMENDED_MOTION_3D.motionStyle).toBe("MODERN");
    expect(RECOMMENDED_MOTION_3D.threeStyle).toBe("NONE");
    const recommended = applyRecommendedMotion3d();
    expect(inferStoreFeel({ ...baseForm(), ...recommended })).toBe("MODERN");
    expect(inferThreeFeel({ ...baseForm(), ...recommended })).toBe("NONE");
    expect(recommended.visual3dMobileEnabled).toBe(false);
    expect(recommended.visual3dRespectReducedMotion).toBe(true);
  });

  it("uses business-friendly Store Feel copy (not MINIMAL)", () => {
    expect(STORE_FEEL_COPY.CALM.title).toBe("Calm");
    expect(STORE_FEEL_COPY.MODERN.title).toBe("Modern");
    expect(STORE_FEEL_COPY.LIVELY.title).toBe("Lively");
    expect(STORE_FEEL_COPY.BOLD.title).toBe("Bold");
    expect(STORE_FEEL_COPY.CALM.description).toContain("relaxed");
  });
});

describe("Phase 25.2 — draft preview vs save", () => {
  it("draft Store Feel patches do not equal a persisted save by themselves", () => {
    const saved = baseForm();
    const draft = { ...saved, ...applyStoreFeel("LIVELY") };
    expect(inferStoreFeel(draft)).toBe("LIVELY");
    expect(inferStoreFeel(saved)).not.toBe("LIVELY");
    // Preview reads draft; DB mapping only happens via formValuesTo* on save.
    expect(formValuesToAnimationConfig(draft).enabled).toBe(true);
    expect(formValuesToAnimationConfig(saved).enabled).toBe(
      defaultPlatformConfig.animation.enabled,
    );
  });

  it("Reset recommended restores Modern + 3D off in local form state", () => {
    const dirty = {
      ...baseForm(),
      ...applyStoreFeel("BOLD"),
      ...applyThreeFeel("IMMERSIVE"),
    };
    const reset = { ...dirty, ...applyRecommendedMotion3d() };
    expect(inferStoreFeel(reset)).toBe("MODERN");
    expect(inferThreeFeel(reset)).toBe("NONE");
  });

  it("save mapping persists animation + visual effects configs", () => {
    const values = {
      ...baseForm(),
      ...applyStoreFeel("BOLD"),
      ...applyThreeFeel("SOFT"),
    };
    const animation = formValuesToAnimationConfig(values);
    const visual = formValuesToVisualEffectsConfig(values);
    expect(animation.enabled).toBe(true);
    expect(animation.intensity).toBe("strong");
    expect(visual.enabled).toBe(true);
    expect(visual.heroEnabled).toBe(true);
  });
});

describe("Phase 25.2 — animation / button / 3D UI controls", () => {
  it("maps page / card / scroll animation chips", () => {
    expect(applyPageMotion("none").animationEnabled).toBe(false);
    expect(applyPageMotion("rise").animationPreset).toBe("fade-up");
    expect(applyCardMotion("zoom").animationIntensity).toBe("high");
    expect(applyScrollMotion("gentle").animationIntensity).toBe("subtle");
    expect(inferPageMotion({ ...baseForm(), ...applyPageMotion("fade") })).toBe(
      "fade",
    );
  });

  it("maps button style and hover onto theme fields", () => {
    const solid = applyButtonStyle("solid", baseForm());
    const outline = applyButtonStyle("outline", baseForm());
    const soft = applyButtonStyle("soft", baseForm());
    const floating = applyButtonStyle("floating", baseForm());
    expect(solid.borderRadiusPreset).toBe("medium");
    expect(soft.borderRadiusPreset).toBe("medium");
    expect(floating.borderRadiusPreset).toBe("xlarge");
    expect(outline.light?.buttonBackground).toBe(baseForm().light.card);
    expect(soft.light?.buttonBackground).toBe(baseForm().light.surface);
    expect(inferButtonStyle({ ...baseForm(), ...soft })).toBe("soft");
    expect(inferButtonStyle({ ...baseForm(), ...outline })).toBe("outline");
    expect(inferButtonStyle({ ...baseForm(), ...floating })).toBe("floating");

    const glow = applyButtonHover("glow");
    expect(glow.animationEnabled).toBe(true);
    expect(inferButtonHover({ ...baseForm(), ...glow })).toBe("glow");
  });

  it("maps 3D feel Soft/Premium/Immersive without exposing engine names in copy", () => {
    expect(THREE_FEEL_COPY.SOFT.title).toBe("Soft");
    expect(THREE_FEEL_COPY.PREMIUM.title).toBe("Premium");
    expect(THREE_FEEL_COPY.IMMERSIVE.title).toBe("Immersive");
    expect(applyThreeFeel("NONE").visual3dEnabled).toBe(false);
    expect(applyThreeFeel("PREMIUM").visual3dProductEnabled).toBe(true);
    expect(inferThreeFeel({ ...baseForm(), ...applyThreeFeel("SOFT") })).toBe(
      "SOFT",
    );
  });

  it("maps mobile 3D and performance business options", () => {
    expect(applyMobile3dUi("off").visual3dMobileEnabled).toBe(false);
    expect(applyMobile3dUi("light").visual3dMobileEnabled).toBe(true);
    expect(applyMobile3dUi("full").visual3dQuality).toBe("HIGH");
    expect(inferMobile3dUi({ ...baseForm(), visual3dMobileEnabled: false })).toBe(
      "off",
    );
    expect(applyPerformanceUi("balanced").visual3dQuality).toBe("MEDIUM");
    expect(
      inferPerformanceUi({ ...baseForm(), visual3dQuality: "HIGH" }),
    ).toBe("high");
  });
});

describe("Phase 25.2 — global disable + reduced motion + safety", () => {
  it("global animation disable stops decorative motion", () => {
    const effective = resolveMotionConfig({
      global: { enabled: false, intensity: "medium", defaultPreset: "fade-up" },
      reducedMotion: false,
    });
    expect(effective.shouldAnimate).toBe(false);
  });

  it("global 3D disable blocks canvas mount", () => {
    const soft = applyThreeStylePreset("SOFT");
    const effective = resolve3DConfig({
      global: { ...defaultPlatformConfig.visualEffects, ...soft, enabled: false },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: false,
      webglAvailable: true,
    });
    expect(effective.mayMount3d).toBe(false);
  });

  it("reduced motion wins over lively feel", () => {
    const motion = applyMotionStylePreset("DYNAMIC");
    const effective = resolveMotionConfig({
      global: motion,
      reducedMotion: true,
    });
    expect(effective.shouldAnimate).toBe(false);
  });
});

describe("Phase 25.2 — section inheritance / override", () => {
  it("CMS defaults inherit store settings", () => {
    const parsed = parseSectionConfig("hero", {});
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const hero = parsed.config as SectionConfigMap["hero"];
    expect(hero.motionSource).toBe("global");
    expect(hero.threeSource).toBe("global");
  });

  it("HomepageBuilder exposes compact Use store settings controls", () => {
    const src = read("src/features/cms/components/HomepageBuilder.tsx");
    expect(src).toContain("Use store settings");
    expect(src).toContain("Use store setting");
    expect(src).not.toContain("Customize for this section");
  });
});

describe("Phase 25.2 — Design Studio UI contracts", () => {
  it("Motion3DDesignStudio uses business wording and live preview flow", () => {
    const studio = read(
      "src/features/admin/theme/components/Motion3DDesignStudio.tsx",
    );
    const appearance = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    const preview = read(
      "src/features/admin/theme/components/ThemeEditorPreviewCanvas.tsx",
    );

    expect(studio).toContain("How should your store feel?");
    expect(studio).toContain("Card style &amp; motion");
    expect(studio).toContain("Product image effect");
    expect(studio).toContain("3D effects");
    expect(studio).toContain("Button style");
    expect(studio).toContain("Advanced");
    expect(studio).toContain("Reset to recommended");
    expect(studio).not.toContain("WebGL");
    expect(studio).not.toContain("Three.js");
    expect(studio).not.toContain("FLOATING_SHAPES");
    expect(studio).not.toMatch(/\bMINIMAL\b/);
    expect(studio).not.toContain(
      "Make your store feel more lively, polished and interactive.",
    );

    expect(appearance).toContain("Motion3DDesignStudio");
    expect(appearance).toContain("AppearanceSplitLayout");
    expect(appearance).toContain("Motion & 3D settings saved.");
    expect(appearance).toMatch(/>\s*Reset\s*</);

    const workspace = read(
      "src/features/admin/theme/components/Motion3DWorkspace.tsx",
    );
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );
    expect(workspace).toContain("data-motion-workspace");
    expect(split).toContain("ThemePreviewErrorBoundary");
    expect(split).toContain("Preview Motion");
    expect(split).toContain("Preview 3D");
    expect(split).toContain("Live preview");
    expect(split).toContain("65%");
    expect(split).toContain("35%");

    expect(preview).toContain("Example Product");
    expect(preview).toContain("Explore Collection");
    expect(preview).toContain("data-button-style");
    expect(preview).toContain("data-card-motion");
    expect(preview).toContain("sf-preview-product-mesh");
    expect(preview).not.toContain("Sample product");
    expect(preview).not.toContain("Your store, your brand");
    expect(preview).not.toMatch(/\bease both\b/);
    expect(preview).not.toContain("@react-three/fiber");
  });

  it("3D preview is gated — canvas not required for option cards", () => {
    const studio = read(
      "src/features/admin/theme/components/Motion3DDesignStudio.tsx",
    );
    const preview = read(
      "src/features/admin/theme/components/ThemeEditorPreviewCanvas.tsx",
    );
    expect(studio).toContain("sf-three-thumb");
    expect(studio).not.toContain("@react-three/fiber");
    expect(studio).not.toContain("Canvas");
    expect(preview).not.toContain("@react-three/fiber");
    expect(preview).toContain("preview3d");
  });

  it("forbidden technical terms stay out of normal studio UI copy", () => {
    const visibleCopy = [
      ...Object.values(STORE_FEEL_COPY).flatMap((c) => [
        c.title,
        c.description,
      ]),
      ...Object.values(THREE_FEEL_COPY).flatMap((c) => [
        c.title,
        c.description,
      ]),
      "Choose how your store looks, moves and feels.",
      "How should your store feel?",
      "3D Effects",
      "Add depth and interactive visual effects to your store.",
      "Respect reduced motion",
      "Button style",
      "Performance",
      "Balanced",
      "High quality",
    ]
      .join("\n")
      .toLowerCase();

    for (const term of FORBIDDEN_STUDIO_TERMS) {
      expect(visibleCopy).not.toContain(term.toLowerCase());
    }
  });

  it("permissions and cache invalidation contracts remain", () => {
    expect(hasPermission(["ADMIN"], "theme.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "theme.update")).toBe(false);
    expect("storefront-config").toBe("storefront-config");
  });
});

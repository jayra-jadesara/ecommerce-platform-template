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
  applyButtonHover,
  applyButtonStyle,
  applyCardMotion,
  applyImageMotion,
  applyMobile3dUi,
  applyRecommendedMotion3d,
  applyStoreFeel,
  applyThreeFeel,
  CARD_MOTION_OPTIONS,
  IMAGE_MOTION_OPTIONS,
  inferButtonHover,
  inferButtonStyle,
  inferCardMotion,
  inferImageMotion,
  inferStoreFeel,
  inferThreeFeel,
  STORE_FEEL_COPY,
  STORE_FEEL_OPTIONS,
} from "@/features/motion-3d/studio-ui";
import {
  motionDesignTokens,
  resolve3DConfig,
  resolveMotionConfig,
} from "@/features/motion-3d";
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

describe("Phase 25.3 — Store Feel", () => {
  it("exposes Calm/Modern/Lively/Bold without technical names", () => {
    expect([...STORE_FEEL_OPTIONS]).toEqual([
      "CALM",
      "MODERN",
      "LIVELY",
      "BOLD",
    ]);
    expect(STORE_FEEL_COPY.BOLD.title).toBe("Bold");
    expect(applyStoreFeel("CALM").animationIntensity).toMatch(/none|subtle/);
    expect(applyStoreFeel("BOLD").animationIntensity).toBe("high");
    expect(applyStoreFeel("DYNAMIC").animationIntensity).toBe("high");
    expect(inferStoreFeel({ ...baseForm(), ...applyStoreFeel("BOLD") })).toBe(
      "BOLD",
    );
  });
});

describe("Phase 25.3 — image / card / button controls", () => {
  it("maps product image effects", () => {
    expect(IMAGE_MOTION_OPTIONS).toContain("gentle-zoom");
    const zoom = applyImageMotion("gentle-zoom", baseForm());
    expect(zoom.animationPreset).toBe("scale");
    expect(
      inferImageMotion({ ...baseForm(), ...zoom }),
    ).toBe("gentle-zoom");
    expect(applyImageMotion("none", baseForm()).animationPreset).toBe("none");
  });

  it("maps card motion Clean/Lift/Zoom/Float/Glow", () => {
    expect([...CARD_MOTION_OPTIONS]).toEqual([
      "clean",
      "lift",
      "zoom",
      "float",
      "glow",
    ]);
    expect(applyCardMotion("lift").animationIntensity).toBe("medium");
    expect(applyCardMotion("zoom").animationIntensity).toBe("high");
    expect(inferCardMotion({ ...baseForm(), ...applyCardMotion("glow") })).toBe(
      "glow",
    );
    expect(
      inferCardMotion({ ...baseForm(), ...applyCardMotion("clean") }),
    ).toBe("clean");
  });

  it("maps button style including Pill and hover options", () => {
    const pill = applyButtonStyle("pill", baseForm());
    expect(pill.borderRadiusPreset).toBe("large");
    expect(inferButtonStyle({ ...baseForm(), ...pill })).toBe("pill");
    expect(applyButtonHover("none").animationIntensity).toBe("none");
    expect(
      inferButtonHover({ ...baseForm(), ...applyButtonHover("scale") }),
    ).toBe("scale");
  });
});

describe("Phase 25.3 — 3D + reduced motion + safety", () => {
  it("toggles 3D feel and mobile options", () => {
    expect(applyThreeFeel("NONE").visual3dEnabled).toBe(false);
    expect(applyThreeFeel("PREMIUM").visual3dEnabled).toBe(true);
    expect(inferThreeFeel({ ...baseForm(), ...applyThreeFeel("SOFT") })).toBe(
      "SOFT",
    );
    expect(applyMobile3dUi("off").visual3dMobileEnabled).toBe(false);
    expect(applyMobile3dUi("full").visual3dQuality).toBe("HIGH");
  });

  it("always persists respect reduced motion on save", () => {
    const values = {
      ...baseForm(),
      visual3dRespectReducedMotion: false,
    };
    expect(formValuesToVisualEffectsConfig(values).respectReducedMotion).toBe(
      true,
    );
  });

  it("respects global safety ceiling under reduced motion", () => {
    const motion = resolveMotionConfig({
      global: {
        enabled: true,
        intensity: "strong",
        defaultPreset: "fade-up",
      },
      reducedMotion: true,
    });
    expect(motion.shouldAnimate).toBe(false);
    const three = resolve3DConfig({
      global: {
        ...defaultPlatformConfig.visualEffects,
        enabled: true,
        respectReducedMotion: true,
      },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: true,
      webglAvailable: true,
    });
    expect(three.mayMount3d).toBe(false);
  });
});

describe("Phase 25.3 — draft preview / save / reset", () => {
  it("draft updates preview mapping without implying DB write", () => {
    const saved = baseForm();
    const draft = {
      ...saved,
      ...applyCardMotion("lift"),
      ...applyButtonStyle("floating", saved),
      ...applyStoreFeel("LIVELY"),
    };
    expect(inferStoreFeel(draft)).toBe("LIVELY");
    expect(inferButtonStyle(draft)).toBe("floating");
    expect(formValuesToAnimationConfig(saved).enabled).toBe(
      defaultPlatformConfig.animation.enabled,
    );
  });

  it("reset restores recommended Modern + 3D off locally", () => {
    const dirty = {
      ...baseForm(),
      ...applyStoreFeel("BOLD"),
      ...applyThreeFeel("IMMERSIVE"),
    };
    const reset = { ...dirty, ...applyRecommendedMotion3d() };
    expect(inferStoreFeel(reset)).toBe("MODERN");
    expect(inferThreeFeel(reset)).toBe("NONE");
  });
});

describe("Phase 25.3 — inheritance + tokens", () => {
  it("CMS sections default to global inheritance", () => {
    const parsed = parseSectionConfig("hero", {});
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const hero = parsed.config as SectionConfigMap["hero"];
    expect(hero.motionSource).toBe("global");
    expect(hero.threeSource).toBe("global");
  });

  it("motion design tokens include image vars and theme mixes", () => {
    const tokens = motionDesignTokens(
      resolveMotionConfig({
        global: {
          enabled: true,
          intensity: "medium",
          defaultPreset: "scale",
        },
        reducedMotion: false,
      }),
    );
    expect(tokens["--motion-image-scale"]).toMatch(/^1\./);
    expect(tokens["--motion-card-shadow"]).toContain("color-mix");
    expect(tokens["--motion-card-shadow"]).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});

describe("Phase 25.3 — two-column studio UI contracts", () => {
  it("Appearance uses sticky right preview layout for Motion & 3D", () => {
    const appearance = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    const studio = read(
      "src/features/admin/theme/components/Motion3DDesignStudio.tsx",
    );
    const preview = read(
      "src/features/admin/theme/components/ThemeEditorPreviewCanvas.tsx",
    );
    const css = read("src/styles/admin.css");
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );

    expect(appearance).toContain("AppearanceSplitLayout");
    expect(appearance).toContain("Motion & 3D settings saved.");
    expect(appearance).toContain("Unsaved changes");
    expect(appearance).toContain("Save Changes");
    expect(appearance).toContain("draftValues");
    expect(appearance).not.toContain(
      "Make your store feel more lively, polished and interactive.",
    );

    expect(split).toContain("ThemePreviewErrorBoundary");
    expect(split).toContain("65%");
    expect(split).toContain("35%");
    expect(split).toContain("Live preview");

    expect(studio).toContain("How should your store feel?");
    expect(studio).toContain("Product image effect");
    expect(studio).toContain("Card style &amp; motion");
    expect(studio).toContain("Button style");
    expect(studio).toContain("3D effects");
    expect(studio).toContain('role="radiogroup"');
    expect(studio).toContain("aria-checked");
    expect(studio).toContain("sf-mini-img-zoom");
    expect(studio).toContain("sf-mini-card-lift");
    expect(studio).not.toContain("WebGL");
    expect(studio).not.toContain("Three.js");
    expect(studio).not.toMatch(/\bMINIMAL\b/);

    expect(preview).toContain("Example Product");
    expect(preview).toContain("Featured Pick");
    expect(preview).toContain("Daily Essential");
    expect(preview).toContain("data-button-style");
    expect(preview).toContain("data-image-motion");
    expect(preview).toContain("Shop Now");
    expect(preview).toContain("Add to Cart");
    expect(preview).not.toContain("@react-three/fiber");

    expect(css).toContain("sf-mini-img-zoom");
    expect(css).toContain("sf-mini-card-glow");
    expect(css).toContain("65%");
    expect(css).toContain("35%");
  });

  it("HomepageBuilder keeps compact section overrides", () => {
    const src = read("src/features/cms/components/HomepageBuilder.tsx");
    expect(src).toContain("Use store settings");
    expect(src).not.toContain("Motion3DDesignStudio");
  });

  it("storefront product tiles use motion image tokens", () => {
    const css = read("src/styles/storefront.css");
    const card = read("src/features/catalog/components/ProductCard.tsx");
    expect(css).toContain("--motion-image-scale");
    expect(css).toContain("sf-product-tile-image");
    expect(card).toContain("sf-product-tile-image");
    expect(card).not.toContain("group-hover:scale-105");
  });
});

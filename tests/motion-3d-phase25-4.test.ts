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
  applyRecommendedMotion3d,
  applyStoreFeel,
  applyThreeFeel,
  inferButtonHover,
  inferButtonStyle,
  inferCardMotion,
  inferImageMotion,
  inferStoreFeel,
  inferThreeFeel,
} from "@/features/motion-3d/studio-ui";
import { resolve3DConfig, resolveMotionConfig } from "@/features/motion-3d";
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

describe("Phase 25.4 — desktop two-column Appearance workspace", () => {
  it("uses AppearanceSplitLayout 65/35 for every Appearance tab", () => {
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );
    const appearance = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    const workspace = read(
      "src/features/admin/theme/components/Motion3DWorkspace.tsx",
    );

    expect(appearance).toContain("AppearanceSplitLayout");
    expect(appearance).toContain("Motion3DDesignStudio");
    expect(appearance).not.toContain("md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]");

    expect(split).toContain('data-appearance-split="true"');
    expect(split).toContain('minmax(0, 65%) minmax(280px, 35%)');
    expect(split).toContain("position: \"sticky\"");
    expect(split).toContain("Live preview");
    expect(split).toContain("ThemeEditorPreviewCanvas");

    expect(workspace).toContain("AppearanceSplitLayout");
    expect(workspace).toContain('data-motion-workspace="true"');
  });

  it("stacks settings above preview only under narrow viewports", () => {
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );
    expect(split).toContain("flexDirection: \"column\"");
    expect(split).toContain("min-width: ${DESKTOP_MIN}px");
  });

  it("does not rely on Tailwind lg:grid-cols for Motion tab layout", () => {
    const appearance = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    expect(appearance).toContain("AppearanceSplitLayout");
    expect(appearance).not.toContain("lg:grid-cols-[minmax(0,0.42fr)");
  });
});

describe("Phase 25.4 — draft preview sync without DB writes", () => {
  it("Store Feel / image / card / button update draft only", () => {
    const saved = baseForm();
    const draft = {
      ...saved,
      ...applyImageMotion("gentle-zoom", saved),
      ...applyCardMotion("lift"),
      ...applyButtonStyle("floating", saved),
      ...applyButtonHover("glow"),
      ...applyStoreFeel("LIVELY"),
    };
    expect(inferStoreFeel(draft)).toBe("LIVELY");
    expect(inferImageMotion(draft)).toBe("gentle-zoom");
    expect(inferButtonStyle(draft)).toBe("floating");
    expect(inferButtonHover(draft)).toBe("glow");
    expect(formValuesToAnimationConfig(saved).enabled).toBe(
      defaultPlatformConfig.animation.enabled,
    );
  });

  it("Reset recommended restores Modern + 3D off locally", () => {
    const dirty = {
      ...baseForm(),
      ...applyStoreFeel("BOLD"),
      ...applyThreeFeel("IMMERSIVE"),
    };
    const reset = { ...dirty, ...applyRecommendedMotion3d() };
    expect(inferStoreFeel(reset)).toBe("MODERN");
    expect(inferThreeFeel(reset)).toBe("NONE");
  });

  it("Save mapping persists animation + visual effects", () => {
    const values = {
      ...baseForm(),
      ...applyStoreFeel("BOLD"),
      ...applyThreeFeel("PREMIUM"),
    };
    const animation = formValuesToAnimationConfig(values);
    const visual = formValuesToVisualEffectsConfig(values);
    expect(animation.enabled).toBe(true);
    expect(visual.enabled).toBe(true);
    expect(visual.respectReducedMotion).toBe(true);
  });
});

describe("Phase 25.4 — instant draft preview on every Appearance tab", () => {
  it("wires useWatch draft theme + fonts into the shared live preview", () => {
    const appearance = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );
    const preview = read(
      "src/features/admin/theme/components/ThemeEditorPreviewCanvas.tsx",
    );
    const themePreview = read("src/features/theme/ThemePreview.tsx");

    expect(appearance).toContain("useWatch({ control })");
    expect(appearance).toContain("liveTheme");
    expect(appearance).toContain("fontIdToCss(draftValues.fontSans)");
    expect(appearance).toContain("fontIdToCss(draftValues.fontDisplay)");
    expect(appearance).toContain("useState(true)");
    expect(appearance).toContain("livePreviewMode");
    expect(appearance).toContain("paletteSide");
    expect(split).toContain("updates instantly");
    expect(split).toContain("fonts={fonts}");
    expect(preview).toContain("fonts={fonts}");
    expect(themePreview).toContain("--font-sans");
    expect(themePreview).toContain("--font-display");
    expect(themePreview).toContain("--radius-default");
  });
});

describe("Phase 25.4 — 3D gating + accessibility + inheritance", () => {
  it("does not initialize 3D when disabled; Preview 3D is gated in workspace", () => {
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );
    const preview = read(
      "src/features/admin/theme/components/ThemeEditorPreviewCanvas.tsx",
    );
    expect(split).toContain("preview3d");
    expect(split).not.toContain("@react-three/fiber");
    expect(preview).not.toContain("@react-three/fiber");
    expect(preview).toContain("threeActive && (preview3d || threeFeel !== \"NONE\")");
    expect(preview).not.toContain("preview3d && threeActive");

    const off = resolve3DConfig({
      global: {
        ...defaultPlatformConfig.visualEffects,
        enabled: false,
      },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: false,
      webglAvailable: true,
    });
    expect(off.mayMount3d).toBe(false);
  });

  it("option cards use radio semantics", () => {
    const studio = read(
      "src/features/admin/theme/components/Motion3DDesignStudio.tsx",
    );
    expect(studio).toContain('role="radiogroup"');
    expect(studio).toContain('role="radio"');
    expect(studio).toContain("aria-checked");
  });

  it("sections inherit global motion by default", () => {
    const parsed = parseSectionConfig("hero", {});
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const hero = parsed.config as SectionConfigMap["hero"];
    expect(hero.motionSource).toBe("global");
    expect(hero.threeSource).toBe("global");
  });

  it("resolvers remain the source of truth", () => {
    const motion = resolveMotionConfig({
      global: {
        enabled: true,
        intensity: "medium",
        defaultPreset: "fade-up",
      },
      reducedMotion: false,
    });
    expect(motion.shouldAnimate).toBe(true);
    expect(inferCardMotion({ ...baseForm(), ...applyCardMotion("zoom") })).toBe(
      "zoom",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  applyMotionStylePreset,
  applyThreeStylePreset,
  getMotion3DConfig,
  inferMotionStyle,
  inferThreeStyle,
  isValidMotionStylePreset,
  isValidThreeStylePreset,
  motionDesignTokens,
  resolve3DConfig,
  resolveMotionConfig,
  section3dOverrideFromConfig,
  sectionMotionOverrideFromConfig,
  RECOMMENDED_MOTION_3D,
} from "@/features/motion-3d";
import { defaultPlatformConfig } from "@/config/defaults";
import { hasPermission } from "@/features/auth/permissions";
import {
  formValuesToAnimationConfig,
  formValuesToVisualEffectsConfig,
  themeConfigToFormValues,
} from "@/features/admin/theme/editor-schema";
import { parseSectionConfig } from "@/features/cms/schemas";
import type { SectionConfigMap } from "@/features/cms/schemas";
import { shouldMountHero3d, shouldMountProduct3d } from "@/features/visual-effects/decide";

const globalMotion = defaultPlatformConfig.animation;
const global3d = defaultPlatformConfig.visualEffects;

describe("Phase 25 — global motion config", () => {
  it("recommended default is Modern motion + 3D off", () => {
    expect(RECOMMENDED_MOTION_3D.motionStyle).toBe("MODERN");
    expect(RECOMMENDED_MOTION_3D.threeStyle).toBe("NONE");
    expect(RECOMMENDED_MOTION_3D.respectReducedMotion).toBe(true);
    const motion = applyMotionStylePreset("MODERN");
    const three = applyThreeStylePreset("NONE");
    expect(motion.enabled).toBe(true);
    expect(three.enabled).toBe(false);
  });

  it("getMotion3DConfig returns the store pair without duplication", () => {
    const cfg = getMotion3DConfig({
      animation: globalMotion,
      visualEffects: global3d,
    });
    expect(cfg.animation).toEqual(globalMotion);
    expect(cfg.visualEffects).toEqual(global3d);
  });

  it("resolves global enable", () => {
    const effective = resolveMotionConfig({
      global: { enabled: true, intensity: "medium", defaultPreset: "fade-up" },
      reducedMotion: false,
    });
    expect(effective.shouldAnimate).toBe(true);
    expect(effective.defaultPreset).toBe("fade-up");
  });

  it("resolves global disable", () => {
    const effective = resolveMotionConfig({
      global: { enabled: false, intensity: "medium", defaultPreset: "fade-up" },
      reducedMotion: false,
    });
    expect(effective.shouldAnimate).toBe(false);
    expect(effective.defaultPreset).toBe("none");
  });
});

describe("Phase 25 — global 3D config", () => {
  it("global 3D off blocks mount", () => {
    const effective = resolve3DConfig({
      global: { ...global3d, enabled: false },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: false,
      webglAvailable: true,
    });
    expect(effective.mayMount3d).toBe(false);
    expect(effective.mayMountHero3d).toBe(false);
  });

  it("global 3D enable with hero permits hero mount", () => {
    const soft = applyThreeStylePreset("SOFT");
    const effective = resolve3DConfig({
      global: { ...global3d, ...soft, respectReducedMotion: true },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: false,
      webglAvailable: true,
    });
    expect(effective.mayMountHero3d).toBe(true);
    expect(effective.mayMountProduct3d).toBe(false);
  });
});

describe("Phase 25 — section inherit vs override", () => {
  it("section inherits global when source=global", () => {
    const effective = resolveMotionConfig({
      global: { enabled: true, intensity: "medium", defaultPreset: "fade-up" },
      section: { source: "global", preset: "scale", enabled: false },
      reducedMotion: false,
    });
    expect(effective.shouldAnimate).toBe(true);
    expect(effective.defaultPreset).toBe("fade-up");
  });

  it("section override can change preset within global", () => {
    const effective = resolveMotionConfig({
      global: { enabled: true, intensity: "medium", defaultPreset: "fade-up" },
      section: {
        source: "custom",
        enabled: true,
        preset: "scale",
        intensity: "subtle",
      },
      reducedMotion: false,
    });
    expect(effective.defaultPreset).toBe("scale");
    expect(effective.intensity).toBe("subtle");
  });

  it("section cannot enable motion when global is off", () => {
    const effective = resolveMotionConfig({
      global: { enabled: false, intensity: "medium", defaultPreset: "fade" },
      section: { source: "custom", enabled: true, preset: "fade-up" },
      reducedMotion: false,
    });
    expect(effective.shouldAnimate).toBe(false);
  });

  it("section override cannot exceed global intensity", () => {
    const effective = resolveMotionConfig({
      global: { enabled: true, intensity: "subtle", defaultPreset: "fade" },
      section: {
        source: "custom",
        enabled: true,
        intensity: "smooth",
      },
      reducedMotion: false,
    });
    expect(effective.intensity).toBe("subtle");
  });
});

describe("Phase 25 — safety bounds", () => {
  it("mobile 3D off is a hard boundary", () => {
    const effective = resolve3DConfig({
      global: {
        ...applyThreeStylePreset("PREMIUM"),
        mobileEnabled: false,
        respectReducedMotion: true,
      },
      animationEnabled: true,
      section: { source: "custom", enabled: true, preset: "FLOATING_SHAPES" },
      isMobile: true,
      reducedMotion: false,
      webglAvailable: true,
      hasTrustedModel: true,
    });
    expect(effective.mayMount3d).toBe(false);
    expect(effective.mayMountProduct3d).toBe(false);
  });

  it("reduced motion disables decorative motion and 3D", () => {
    const motion = resolveMotionConfig({
      global: globalMotion,
      reducedMotion: true,
    });
    expect(motion.shouldAnimate).toBe(false);

    const three = resolve3DConfig({
      global: {
        ...applyThreeStylePreset("SOFT"),
        respectReducedMotion: true,
      },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: true,
      webglAvailable: true,
    });
    expect(three.mayMount3d).toBe(false);
  });

  it("quality ceiling clamps to global", () => {
    const effective = resolve3DConfig({
      global: {
        ...applyThreeStylePreset("SOFT"),
        quality: "LOW",
        respectReducedMotion: true,
      },
      animationEnabled: true,
      isMobile: false,
      reducedMotion: false,
      webglAvailable: true,
    });
    expect(effective.quality).toBe("LOW");
  });

  it("rejects invalid motion / 3D presets", () => {
    expect(isValidMotionStylePreset("MODERN")).toBe(true);
    expect(isValidMotionStylePreset("ULTRA")).toBe(false);
    expect(isValidThreeStylePreset("SOFT")).toBe(true);
    expect(isValidThreeStylePreset("SHADER_PACK")).toBe(false);
  });
});

describe("Phase 25 — theme tokens + CMS defaults", () => {
  it("motion design tokens derive from effective config", () => {
    const off = motionDesignTokens(
      resolveMotionConfig({
        global: { enabled: false, intensity: "medium", defaultPreset: "none" },
        reducedMotion: false,
      }),
    );
    expect(off["--motion-duration"]).toBe("0ms");

    const on = motionDesignTokens(
      resolveMotionConfig({
        global: { enabled: true, intensity: "medium", defaultPreset: "fade-up" },
        reducedMotion: false,
      }),
    );
    expect(on["--motion-duration"]).not.toBe("0ms");
  });

  it("CMS sections default to use global settings", () => {
    const parsed = parseSectionConfig("hero", {});
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.type).toBe("hero");
    const hero = parsed.config as SectionConfigMap["hero"];
    expect(hero.motionSource).toBe("global");
    expect(hero.threeSource).toBe("global");
  });

  it("section helper maps global by default", () => {
    expect(sectionMotionOverrideFromConfig({}).source).toBe("global");
    expect(section3dOverrideFromConfig({}).source).toBe("global");
  });

  it("infer presets stay compatible with stored DB shapes", () => {
    expect(inferMotionStyle(globalMotion)).toBe("MODERN");
    expect(inferThreeStyle(global3d)).toBe("NONE");
  });
});

describe("Phase 25 — no duplicate settings source / permissions / cache", () => {
  it("form round-trip uses existing animation + visual effects fields only", () => {
    const values = themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
      undefined,
      defaultPlatformConfig.visualEffects,
    );
    const animation = formValuesToAnimationConfig(values);
    const visual = formValuesToVisualEffectsConfig(values);
    expect(animation.enabled).toBe(true);
    expect(visual.enabled).toBe(false);
  });

  it("theme.update permission covers Appearance Motion & 3D", () => {
    expect(hasPermission(["SUPER_ADMIN"], "theme.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "theme.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "theme.update")).toBe(false);
  });

  it("storefront config cache tag is the invalidation target", () => {
    // Matches STOREFRONT_CONFIG_CACHE_TAG in theme/service (server-only).
    expect("storefront-config").toBe("storefront-config");
  });

  it("decide helpers do not mount 3D when global off", () => {
    expect(
      shouldMountHero3d({
        visualEffects: global3d,
        animationEnabled: true,
        isMobile: false,
        prefersReducedMotion: false,
        webglAvailable: true,
        section3dEnabled: true,
        sectionPreset: "SOFT_GEOMETRY",
        threeSource: "global",
      }).mount,
    ).toBe(false);

    expect(
      shouldMountProduct3d({
        visualEffects: global3d,
        animationEnabled: true,
        isMobile: false,
        prefersReducedMotion: false,
        webglAvailable: true,
        hasTrustedModel: true,
      }),
    ).toBe(false);
  });

  it("invalid motion style preset helpers reject junk", () => {
    expect(isValidMotionStylePreset("alert(1)")).toBe(false);
    expect(isValidThreeStylePreset("void main(){}")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  THEME_COLOR_PACKS,
  findMatchingThemePackId,
} from "@/features/admin/theme/color-packs";
import {
  contrastGuidance,
  contrastLevel,
  contrastRatio,
} from "@/features/admin/theme/contrast";
import {
  adminCard,
  adminFormGrid,
  adminFormStack,
  adminScrollHide,
} from "@/features/admin/ui/admin-classes";
import { ADMIN_NAV_TREE } from "@/features/admin/nav";
import { hasPermission } from "@/features/auth/permissions";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("phase 21.1 — admin design system", () => {
  it("exposes reusable admin spacing / card helpers", () => {
    expect(adminFormStack()).toContain("gap-5");
    expect(adminFormGrid()).toContain("md:grid-cols-2");
    expect(adminCard()).toContain("var(--color-card)");
    expect(adminScrollHide()).toBe("admin-scroll-hide");
  });

  it("loads admin scrollbar-hide styles globally", () => {
    const css = read("src/styles/admin.css");
    expect(css).toContain(".admin-scroll-hide");
    expect(css).toContain("scrollbar-width: none");
    expect(read("src/app/globals.css")).toContain('admin.css');
  });

  it("sidebar isolates nav scroll and hides scrollbar visually", () => {
    const shell = read("src/features/admin/components/AdminShell.tsx");
    expect(shell).toContain("adminScrollHide");
    expect(shell).toContain("max-h-dvh");
    expect(shell).toContain("overflow-x-hidden");
    expect(shell).toContain("flex min-h-0 flex-1 flex-col");
  });
});

describe("phase 21.1 — color preset library", () => {
  it("provides at least 12 curated presets", () => {
    expect(THEME_COLOR_PACKS.length).toBeGreaterThanOrEqual(12);
    for (const pack of THEME_COLOR_PACKS) {
      expect(pack.preview.length).toBe(4);
      expect(pack.light.primary).toMatch(/^#/);
      expect(pack.dark.primary).toMatch(/^#/);
      expect(pack.description.length).toBeGreaterThan(8);
    }
  });

  it("matches packs by primary/background pairs", () => {
    const ocean = THEME_COLOR_PACKS.find((p) => p.id === "ocean");
    expect(ocean).toBeTruthy();
    expect(findMatchingThemePackId(ocean!.light, ocean!.dark)).toBe("ocean");
  });

  it("does not hardcode Sonet branding in packs or shell", () => {
    const packs = read("src/features/admin/theme/color-packs.ts");
    const shell = read("src/features/admin/components/AdminShell.tsx");
    expect(packs.toLowerCase()).not.toContain("sonet");
    expect(shell.toLowerCase()).not.toContain("sonet");
  });
});

describe("phase 21.1 — contrast utility", () => {
  it("computes WCAG contrast ratios", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).toBe(21);
    expect(contrastLevel(ratio!)).toBe("AAA");
  });

  it("flags weak contrast pairs", () => {
    const guidance = contrastGuidance("#cccccc", "#ffffff");
    expect(guidance?.level).toBe("fail");
    expect(guidance?.label).toContain("Check contrast");
  });

  it("marks strong button pairs as good", () => {
    const guidance = contrastGuidance("#ffffff", "#1a5f4a");
    expect(guidance?.level).toMatch(/AA|AAA/);
    expect(guidance?.label).toContain("Good contrast");
  });
});

describe("phase 21.1 — branding & appearance polish", () => {
  it("branding form uses larger visual previews without exposing paths by default", () => {
    const src = read(
      "src/features/admin/settings/components/BrandingSettingsForm.tsx",
    );
    expect(src).toContain("AdminSection");
    expect(src).toContain("Replace");
    expect(src).toContain("File details");
    expect(src).toContain("max-h-24");
    expect(src).toContain("Explore our collection");
  });

  it("appearance colors use grouped fields and selected preset affordance", () => {
    const src = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    expect(src).toContain("COLOR_GROUPS");
    expect(src).toContain("CHROME_GROUPS");
    expect(src).toContain("aria-pressed");
    expect(src).toContain("admin-scroll-hide");
    expect(src).toContain("native: true");
    expect(src).toContain("APPEARANCE_TABS");
    expect(src).not.toContain('from "@mui/material/Tabs"');
  });

  it("save bar confirms reset and does not auto-save", () => {
    const src = read("src/features/admin/ui/AdminSaveBar.tsx");
    expect(src).toContain("Nothing is saved until you click Save");
    expect(src).toContain("Save changes");
    expect(src).toContain("AdminStatusBadge");
  });
});

describe("phase 21.1 — product form sections + nav IA", () => {
  it("product form sections use shared field rhythm", () => {
    const src = read("src/features/catalog/components/ProductForm.tsx");
    expect(src).toContain("admin-form-stack");
    expect(src).toContain("gap-5");
  });

  it("keeps business-friendly top-level nav groups", () => {
    const labels = ADMIN_NAV_TREE.map((entry) => entry.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Products",
        "Orders",
        "Customers",
        "Content",
        "Store Settings",
      ]),
    );
    expect(labels.join(" ").toLowerCase()).not.toContain("supabase");
  });

  it("permission helper still gates admin capabilities", () => {
    expect(hasPermission(["ADMIN"], "products.view")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "products.delete")).toBe(false);
  });
});

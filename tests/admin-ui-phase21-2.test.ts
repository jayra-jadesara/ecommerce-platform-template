import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  THEME_COLOR_PACKS,
  THEME_COLOR_PACK_CATEGORIES,
  packsByCategory,
} from "@/features/admin/theme/color-packs";
import {
  ADMIN_NAV_SECTION_LABELS,
  ADMIN_NAV_TREE,
  getAdminSidebarLinks,
  getAdminNavTreeForPermissions,
} from "@/features/admin/nav";
import { permissionsForRoles } from "@/features/auth/permissions";
import {
  adminAppBg,
  adminSidebarBg,
  adminTopBar,
  adminNavSectionLabel,
} from "@/features/admin/ui/admin-classes";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("phase 21.2 — admin shell & IA", () => {
  it("exposes sectioned sidebar helpers", () => {
    expect(ADMIN_NAV_SECTION_LABELS.main).toBe("Main");
    expect(ADMIN_NAV_SECTION_LABELS.catalog).toBe("Catalog");
    expect(ADMIN_NAV_SECTION_LABELS.store).toBe("Store");
    expect(adminNavSectionLabel()).toContain("tracking");
    expect(adminTopBar()).toContain("h-14");
    expect(adminAppBg()).toContain("color-background");
    expect(adminSidebarBg()).toContain("color-surface");
  });

  it("flattens primary sidebar destinations with sections", () => {
    const tree = getAdminNavTreeForPermissions(permissionsForRoles(["ADMIN"]));
    const links = getAdminSidebarLinks(tree);
    const labels = links.map((link) => link.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "All Products",
        "Categories",
        "Orders",
        "Customers",
        "Homepage",
        "Images & Files",
        "Overview",
      ]),
    );
    expect(labels).not.toContain("Store Information");
    expect(links.every((link) => Boolean(link.section))).toBe(true);
  });

  it("shell wires View Store and sectioned nav", () => {
    const shell = read("src/features/admin/components/AdminShell.tsx");
    expect(shell).toContain("View Store");
    expect(shell).toContain("getAdminSidebarLinks");
    expect(shell).toContain("ADMIN_NAV_SECTION_LABELS");
    expect(shell).toContain("admin-shell");
    expect(shell.toLowerCase()).not.toContain("sonet");
  });

  it("keeps top-level nav tree business-friendly", () => {
    expect(ADMIN_NAV_TREE.map((e) => e.label)).toEqual([
      "Dashboard",
      "Products",
      "Orders",
      "Error Logs",
      "Customers",
      "Content",
      "Store Settings",
    ]);
  });
});

describe("phase 21.2 — color studio library", () => {
  it("provides at least 20 curated presets across categories", () => {
    expect(THEME_COLOR_PACKS.length).toBeGreaterThanOrEqual(20);
    expect(THEME_COLOR_PACK_CATEGORIES.length).toBeGreaterThanOrEqual(8);
    for (const pack of THEME_COLOR_PACKS) {
      expect(pack.category).toBeTruthy();
      expect(pack.preview.length).toBe(4);
    }
    const groups = packsByCategory();
    expect(groups.length).toBeGreaterThanOrEqual(6);
    expect(groups.every((g) => g.packs.length > 0)).toBe(true);
  });

  it("appearance editor behaves like a design studio", () => {
    const src = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    const split = read(
      "src/features/admin/theme/components/AppearanceSplitLayout.tsx",
    );
    const typography = read(
      "src/features/admin/theme/components/TypographyStudioPanel.tsx",
    );
    expect(src).toContain("packsByCategory");
    expect(src).toContain("TypographyStudioPanel");
    expect(typography).toContain("Heading font");
    expect(src).toContain("Motion & 3D");
    expect(src).toContain("Motion3DDesignStudio");
    expect(src).toContain("AppearanceSplitLayout");
    expect(split).toContain("Live preview");
    expect(split).toContain("Preview Motion");
    expect(split).toContain("65%");
    expect(src).toContain("sticky top-0");
    expect(src).toContain("APPEARANCE_TABS");
    expect(src).not.toContain('from "@mui/material/Tabs"');
  });
});

describe("phase 21.2 — dashboard & settings hub", () => {
  it("dashboard uses executive overview copy and setup progress", () => {
    const dash = read(
      "src/app/(admin)/[adminSlug]/(protected)/dashboard/page.tsx",
    );
    expect(dash).toContain("Here's what's happening in your store.");
    expect(dash).toContain("Quick actions");
    expect(dash).toContain("AdminSetupChecklist");
    expect(dash).toContain("alwaysShow");
  });

  it("settings hub uses card modules with explanations", () => {
    const hub = read(
      "src/app/(admin)/[adminSlug]/(protected)/settings/page.tsx",
    );
    expect(hub).toContain("Manage how your store looks");
    expect(hub).toContain("AdminCard");
    expect(hub).toContain("Appearance");
    expect(hub).toContain("Logo & Branding");
  });
});

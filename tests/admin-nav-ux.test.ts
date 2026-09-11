import { describe, expect, it } from "vitest";
import {
  ADMIN_BREADCRUMB_LABELS,
  ADMIN_NAV_TREE,
  getAdminNavForPermissions,
  getAdminNavTreeForPermissions,
} from "@/features/admin/nav";
import {
  permissionsForRoles,
  type Permission,
} from "@/features/auth/permissions";
import { getAdminPath } from "@/config/admin-route";

function labelsFromTree(
  permissions: Set<Permission>,
): { top: string[]; links: string[] } {
  const tree = getAdminNavTreeForPermissions(permissions);
  const top = tree.map((entry) => entry.label);
  const links = getAdminNavForPermissions(permissions).map((item) => item.label);
  return { top, links };
}

describe("admin navigation structure", () => {
  it("exposes the client-friendly top-level groups", () => {
    const topLabels = ADMIN_NAV_TREE.map((entry) => entry.label);
    expect(topLabels).toEqual([
      "Dashboard",
      "Products",
      "Orders",
      "Customers",
      "Content",
      "Store Settings",
    ]);
  });

  it("nests product destinations under Products", () => {
    const products = ADMIN_NAV_TREE.find((entry) => entry.id === "products");
    expect(products?.kind).toBe("group");
    if (products?.kind !== "group") return;
    expect(products.children.map((child) => child.label)).toEqual([
      "All Products",
      "Categories",
    ]);
  });

  it("nests content destinations with friendly labels", () => {
    const content = ADMIN_NAV_TREE.find((entry) => entry.id === "content");
    expect(content?.kind).toBe("group");
    if (content?.kind !== "group") return;
    expect(content.children.map((child) => child.label)).toEqual([
      "Homepage",
      "About",
      "Pages",
      "Banners",
      "Blog",
      "Images & Files",
    ]);
    expect(content.children.map((child) => child.href)).toContain(
      getAdminPath("/media"),
    );
  });

  it("nests store settings with business labels", () => {
    const settings = ADMIN_NAV_TREE.find((entry) => entry.id === "settings");
    expect(settings?.kind).toBe("group");
    if (settings?.kind !== "group") return;
    const labels = settings.children.map((child) => child.label);
    expect(labels).toContain("Store Information");
    expect(labels).toContain("Logo & Branding");
    expect(labels).toContain("Appearance");
    expect(labels).toContain("Menu & Navigation");
    expect(labels).toContain("Google & SEO");
    expect(labels).toContain("Coupons");
    expect(labels).not.toContain("CMS");
    expect(labels).not.toContain("Theme");
    expect(labels).not.toContain("Media");
  });
});

describe("permission-based admin nav visibility", () => {
  it("shows full tree for ADMIN", () => {
    const { top, links } = labelsFromTree(permissionsForRoles(["ADMIN"]));
    expect(top).toEqual([
      "Dashboard",
      "Products",
      "Orders",
      "Customers",
      "Content",
      "Store Settings",
    ]);
    expect(links).toContain("All Products");
    expect(links).toContain("Images & Files");
    expect(links).toContain("Shipping");
    expect(links).toContain("Payments");
    expect(links).toContain("Coupons");
  });

  it("hides orders and customers for EDITOR", () => {
    const { top, links } = labelsFromTree(permissionsForRoles(["EDITOR"]));
    expect(top).toContain("Products");
    expect(top).toContain("Content");
    expect(top).toContain("Store Settings");
    expect(top).not.toContain("Orders");
    expect(top).not.toContain("Customers");
    expect(links).not.toContain("View Orders");
    expect(links.some((label) => label === "Orders")).toBe(false);
  });

  it("limits ORDER_MANAGER to ops items plus Payments settings", () => {
    const { top, links } = labelsFromTree(
      permissionsForRoles(["ORDER_MANAGER"]),
    );
    expect(top).toEqual(["Dashboard", "Orders", "Customers", "Store Settings"]);
    expect(links).toContain("Dashboard");
    expect(links).toContain("Orders");
    expect(links).toContain("Customers");
    expect(links).toContain("Payments");
    expect(links).not.toContain("All Products");
    expect(links).not.toContain("Images & Files");
  });

  it("does not expose unauthorized settings children", () => {
    const perms = new Set<Permission>(["dashboard.view", "theme.view"]);
    const tree = getAdminNavTreeForPermissions(perms);
    const settings = tree.find((entry) => entry.id === "settings");
    expect(settings?.kind).toBe("group");
    if (settings?.kind !== "group") return;
    expect(settings.children.every((child) => child.label === "Overview" || child.label === "Appearance")).toBe(
      true,
    );
    expect(settings.children.map((c) => c.label)).not.toContain("Shipping");
  });

  it("requires products.create is not a separate nav item anymore", () => {
    const viewOnly = getAdminNavForPermissions(
      new Set<Permission>(["products.view"]),
    ).map((item) => item.label);
    expect(viewOnly).toContain("All Products");
    expect(viewOnly).not.toContain("Add Product");

    const withCreate = getAdminNavForPermissions(
      new Set<Permission>(["products.view", "products.create"]),
    ).map((item) => item.label);
    // Add lives on the products page, not as its own nav link
    expect(withCreate).toContain("All Products");
    expect(withCreate).not.toContain("Add Product");
  });
});

describe("admin breadcrumb labels", () => {
  it("maps technical segments to friendly names", () => {
    expect(ADMIN_BREADCRUMB_LABELS.media).toBe("Images & Files");
    expect(ADMIN_BREADCRUMB_LABELS.theme).toBe("Appearance");
    expect(ADMIN_BREADCRUMB_LABELS.branding).toBe("Logo & Branding");
    expect(ADMIN_BREADCRUMB_LABELS.navigation).toBe("Menu & Navigation");
    expect(ADMIN_BREADCRUMB_LABELS.seo).toBe("Google & SEO");
    expect(ADMIN_BREADCRUMB_LABELS.general).toBe("Store Information");
    expect(ADMIN_BREADCRUMB_LABELS.new).toBe("Add Product");
  });
});

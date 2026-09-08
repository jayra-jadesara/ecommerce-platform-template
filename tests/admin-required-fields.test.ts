import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("admin required field markers", () => {
  it("marks login credentials as required", () => {
    const source = read("features/admin/components/AdminLoginForm.tsx");
    expect(source).toMatch(/label="Admin email"[\s\S]*?required/);
    expect(source).toMatch(/label="Password"[\s\S]*?required/);
  });

  it("marks core product fields as required", () => {
    const source = read("features/catalog/components/ProductForm.tsx");
    expect(source).toMatch(/label="Product name"[\s\S]*?required/);
    expect(source).toMatch(/label="Price"[\s\S]*?required/);
    expect(source).toMatch(/label="Status"[\s\S]*?required/);
  });

  it("marks store settings required fields", () => {
    expect(read("features/admin/settings/components/GeneralSettingsForm.tsx")).toMatch(
      /label="Display name"[\s\S]*?required/,
    );
    expect(read("features/admin/settings/components/BrandingSettingsForm.tsx")).toMatch(
      /label="Brand name"[\s\S]*?required/,
    );
    expect(read("features/admin/settings/components/SeoSettingsForm.tsx")).toMatch(
      /label="Site title"[\s\S]*?required/,
    );
    expect(read("features/admin/settings/components/NavigationSettingsForm.tsx")).toMatch(
      /label="Label"[\s\S]*?required/,
    );
    expect(read("features/admin/settings/components/ShippingSettingsForm.tsx")).toMatch(
      /label="Delivery charge"[\s\S]*?required/,
    );
  });

  it("styles required asterisks in the MUI theme", () => {
    const source = read("features/theme/create-mui-theme.ts");
    expect(source).toContain("MuiFormLabel");
    expect(source).toContain("asterisk");
  });
});

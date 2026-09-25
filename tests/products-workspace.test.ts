import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { autoSkuFromSlug, slugify } from "@/features/catalog/slug";

describe("auto-generated catalog codes", () => {
  it("builds stock codes from slug", () => {
    expect(autoSkuFromSlug("Garam Masala", 0)).toBe("garam-masala");
    expect(autoSkuFromSlug("Garam Masala", 1)).toBe("garam-masala-2");
    expect(slugify("Garam Masala")).toBe("garam-masala");
  });

  it("locks auto codes without showing slug/sku fields", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/catalog/components/ProductForm.tsx"),
      "utf8",
    );
    expect(source).toContain("syncAutoCodesFromName");
    expect(source).toContain("sizeOptions");
    expect(source).toContain("Extra details");
    expect(source).not.toContain("Product page link (auto)");
    expect(source).not.toContain("Generated automatically — not editable.");
  });

  it("locks category slug without showing the field", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/features/catalog/components/CategoryManager.tsx",
      ),
      "utf8",
    );
    expect(source).toContain('setValue("slug", slugify(event.target.value)');
    expect(source).not.toContain('label="Page link (auto)"');
    expect(source).toContain("More options");
  });
});

describe("products single-page workspace", () => {
  it("uses panel query for add/edit/view on the list route", () => {
    const page = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(admin)/[adminSlug]/(protected)/catalog/products/page.tsx",
      ),
      "utf8",
    );
    expect(page).toContain('panel === "new"');
    expect(page).toContain('panel === "edit" || panel === "view"');
    expect(page).toContain("ProductListTable");
  });

  it("exposes view, edit, and delete on the product grid", () => {
    const list = readFileSync(
      resolve(
        process.cwd(),
        "src/features/catalog/components/ProductListTable.tsx",
      ),
      "utf8",
    );
    expect(list).toContain('panelHref("view"');
    expect(list).toContain('panelHref("edit"');
    expect(list).toContain("deleteProductAction");
    // Row actions are icon buttons — identified by their accessible labels.
    expect(list).toContain("aria-label={`View ${item.name}`}");
    expect(list).toContain("aria-label={`Edit ${item.name}`}");
    expect(list).toContain("aria-label={`Delete ${item.name}`}");
  });
});

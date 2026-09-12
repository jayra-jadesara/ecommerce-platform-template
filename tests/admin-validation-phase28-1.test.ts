import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  applyServerFieldErrors,
  firstFieldErrorKey,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("Phase 28.1 — form error helpers", () => {
  it("applies server fieldErrors via setError", () => {
    const setError = vi.fn();
    applyServerFieldErrors(setError, {
      name: "Required",
      _form: "ignored",
      slug: "Already taken",
    });
    expect(setError).toHaveBeenCalledWith("name", {
      type: "server",
      message: "Required",
    });
    expect(setError).toHaveBeenCalledWith("slug", {
      type: "server",
      message: "Already taken",
    });
    expect(setError).not.toHaveBeenCalledWith(
      "_form",
      expect.anything(),
    );
  });

  it("picks the first field error key", () => {
    expect(firstFieldErrorKey({ _form: "x", name: "Required" })).toBe(
      "name",
    );
    expect(firstFieldErrorKey(null)).toBeNull();
  });

  it("focuses via setFocus when provided", () => {
    const setFocus = vi.fn();
    focusFirstFieldError({
      fieldErrors: { price: "Must be positive" },
      setFocus,
    });
    expect(setFocus).toHaveBeenCalledWith("price");
  });

  it("narrows fieldErrors off SafeFailure unions", () => {
    expect(
      resultFieldErrors({ ok: false, error: "x", referenceId: "1" }),
    ).toBeUndefined();
    expect(
      resultFieldErrors({
        ok: false,
        error: "Invalid",
        fieldErrors: { name: "Required" },
      }),
    ).toEqual({ name: "Required" });
  });
});

describe("Phase 28.1 — no window.confirm in Admin sources", () => {
  it("has zero window.confirm usages under src/", () => {
    const files = walkTsFiles(join(root, "src"));
    const hits: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (/window\.confirm\s*\(/.test(src)) {
        hits.push(file.replace(root + "\\", "").replace(root + "/", ""));
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("Phase 28.1 — ConfirmDeleteDialog coverage", () => {
  const dialogConsumers = [
    "src/features/catalog/components/ProductListTable.tsx",
    "src/features/catalog/components/ProductForm.tsx",
    "src/features/catalog/components/CategoryManager.tsx",
    "src/features/coupons/components/CouponListTable.tsx",
    "src/features/blog/components/BlogPostsTable.tsx",
    "src/features/blog/components/BlogCategoriesPanel.tsx",
    "src/features/media/components/MediaLibraryClient.tsx",
    "src/features/media/components/SortableImageList.tsx",
    "src/features/cms/components/BannersManager.tsx",
    "src/features/cms/components/HomepageBuilder.tsx",
    "src/features/cms/components/PagesListClient.tsx",
    "src/features/orders/components/AdminOrderDetailClient.tsx",
    "src/features/admin/ui/AdminSaveBar.tsx",
    "src/features/admin/theme/components/AppearanceStudio.tsx",
  ];

  it("uses ConfirmDeleteDialog in listed mutation surfaces", () => {
    for (const rel of dialogConsumers) {
      expect(read(rel)).toContain("ConfirmDeleteDialog");
    }
  });

  it("supports confirmTone for discard flows", () => {
    const dialog = read("src/features/admin/ui/ConfirmDeleteDialog.tsx");
    expect(dialog).toContain('confirmTone?: "danger" | "default"');
    expect(dialog).toContain("aria-labelledby");
    expect(dialog).toContain("aria-describedby");
    expect(read("src/features/admin/ui/AdminSaveBar.tsx")).toContain(
      'confirmTone="default"',
    );
  });
});

describe("Phase 28.1 — FieldError / fieldErrors wiring", () => {
  const fieldForms = [
    "src/features/catalog/components/ProductForm.tsx",
    "src/features/catalog/components/CategoryManager.tsx",
    "src/features/coupons/components/CouponForm.tsx",
    "src/features/blog/components/BlogPostForm.tsx",
    "src/features/cms/components/PageForm.tsx",
    "src/features/admin/settings/components/BrandingSettingsForm.tsx",
    "src/features/admin/settings/components/ShippingSettingsForm.tsx",
    "src/features/admin/settings/components/PaymentSettingsForm.tsx",
  ];

  it("wires applyServerFieldErrors on major Admin forms", () => {
    for (const rel of fieldForms) {
      const src = read(rel);
      expect(src).toContain("applyServerFieldErrors");
      expect(src).toMatch(/FieldError|fieldErrors/);
    }
  });

  it("services return zodValidationFailure / fieldErrors for key domains", () => {
    expect(read("src/features/coupons/admin-service.ts")).toContain(
      "zodValidationFailure",
    );
    expect(read("src/features/blog/posts-service.ts")).toContain(
      "fieldErrors",
    );
    expect(read("src/features/cms/pages-service.ts")).toContain(
      "zodValidationFailure",
    );
    expect(read("src/features/admin/settings/update-branding.ts")).toContain(
      "zodValidationFailure",
    );
    expect(
      read("src/features/admin/settings/update-shipping-payment.ts"),
    ).toContain("zodValidationFailure");
  });
});

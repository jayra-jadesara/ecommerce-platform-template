import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  emailSchema,
  isNonEmptyText,
  isSafeHttpUrl,
  isSafeNavHref,
  normalizeText,
  optionalEmailSchema,
  optionalPhoneSchema,
  percentageSchema,
  requiredSafeNavHrefSchema,
  requiredText,
  zodFieldErrors,
  zodValidationFailure,
} from "@/lib/validation";
import { mapDatabaseConstraintError } from "@/lib/validation/db-errors";
import {
  categoryFormSchema,
  productFormSchema,
  DEFAULT_PRODUCT_FORM,
} from "@/features/catalog/validation";
import { couponFormSchema } from "@/features/coupons/schemas";
import { safeColorSchema } from "@/features/theme/validation";
import { validateImageUpload } from "@/features/media/validation";
import {
  VISUAL_3D_PRESETS,
  resolveHeroPreset,
} from "@/features/visual-effects/schemas";
import {
  themeConfigToFormValues,
  themeEditorFormSchema,
} from "@/features/admin/theme/editor-schema";
import { defaultPlatformConfig } from "@/config/defaults";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Phase 28 — required text / whitespace", () => {
  it("rejects empty and whitespace-only values", () => {
    expect(isNonEmptyText("")).toBe(false);
    expect(isNonEmptyText(" ")).toBe(false);
    expect(isNonEmptyText("   ")).toBe(false);
    expect(isNonEmptyText("\t")).toBe(false);
    expect(isNonEmptyText("\n")).toBe(false);
    expect(isNonEmptyText("Spices")).toBe(true);
  });

  it("normalizes leading/trailing whitespace", () => {
    expect(normalizeText("  Spices  ")).toBe("Spices");
    const schema = requiredText("Product name", { max: 160 });
    expect(schema.parse("  Spices  ")).toBe("Spices");
    expect(schema.safeParse("   ").success).toBe(false);
  });
});

describe("Phase 28 — email / phone / URL", () => {
  it("validates email", () => {
    expect(emailSchema.safeParse("a@b.com").success).toBe(true);
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(optionalEmailSchema.safeParse("").success).toBe(true);
    expect(optionalEmailSchema.safeParse("bad").success).toBe(false);
  });

  it("validates phone", () => {
    expect(optionalPhoneSchema.safeParse("+1 (555) 123-4567").success).toBe(
      true,
    );
    expect(optionalPhoneSchema.safeParse("12").success).toBe(false);
    expect(optionalPhoneSchema.safeParse("").success).toBe(true);
  });

  it("rejects unsafe URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeNavHref("/products")).toBe(true);
    expect(isSafeNavHref("//evil.com")).toBe(false);
    expect(requiredSafeNavHrefSchema.safeParse("javascript:x").success).toBe(
      false,
    );
  });
});

describe("Phase 28 — numeric / percentage", () => {
  it("rejects negative and invalid percentage", () => {
    expect(percentageSchema.safeParse(0).success).toBe(false);
    expect(percentageSchema.safeParse(50).success).toBe(true);
    expect(percentageSchema.safeParse(101).success).toBe(false);
  });

  it("rejects negative product price via catalog schema", () => {
    const parsed = productFormSchema.safeParse({
      ...DEFAULT_PRODUCT_FORM,
      name: "Tea",
      slug: "tea",
      variants: [
        {
          ...DEFAULT_PRODUCT_FORM.variants[0],
          price: -1,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("Phase 28 — catalog Zod contracts", () => {
  it("requires category name", () => {
    const parsed = categoryFormSchema.safeParse({
      name: "   ",
      slug: "spices",
      description: "",
      parentId: null,
      imagePath: null,
      sortOrder: 0,
      isActive: true,
      seoTitle: "",
      seoDescription: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("maps zod issues to field errors", () => {
    const result = z
      .object({ email: emailSchema })
      .safeParse({ email: "bad" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = zodFieldErrors(result.error);
    expect(fields.email).toMatch(/valid email/i);
    const failure = zodValidationFailure(result.error);
    expect(failure.kind).toBe("validation");
    expect(failure.fieldErrors?.email).toBeTruthy();
  });
});

describe("Phase 28 — coupon / theme / motion", () => {
  it("rejects coupon expiry before start", () => {
    const parsed = couponFormSchema.safeParse({
      code: "SAVE10",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      minimumOrderAmount: null,
      maximumDiscountAmount: null,
      usageLimit: null,
      perUserLimit: null,
      startsAt: "2026-09-10T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
      isActive: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unsafe theme colors", () => {
    expect(safeColorSchema.safeParse("#ff0000").success).toBe(true);
    expect(safeColorSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
    expect(safeColorSchema.safeParse("url(evil)").success).toBe(false);
  });

  it("rejects invalid 3D presets", () => {
    expect(resolveHeroPreset("NOT_A_PRESET")).toBe("NONE");
    expect(VISUAL_3D_PRESETS).toContain("SOFT_GEOMETRY");
    const form = themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
      undefined,
      defaultPlatformConfig.visualEffects,
    );
    expect(themeEditorFormSchema.safeParse({
      ...form,
      visual3dHeroPreset: "HACKED",
    }).success).toBe(false);
  });
});

describe("Phase 28 — images", () => {
  it("rejects unsupported and oversized images", () => {
    const badType = validateImageUpload({
      fileName: "x.gif",
      declaredMime: "image/gif",
      size: 100,
    });
    expect(badType.ok).toBe(false);

    const huge = validateImageUpload({
      fileName: "x.jpg",
      declaredMime: "image/jpeg",
      size: 11 * 1024 * 1024,
    });
    expect(huge.ok).toBe(false);
    if (!huge.ok) {
      expect(huge.error.toLowerCase()).toMatch(/large|size|mb/);
    }
  });
});

describe("Phase 28 — database constraint mapping", () => {
  it("maps unique and foreign-key codes to friendly copy", () => {
    const unique = mapDatabaseConstraintError(
      { code: "23505", message: "duplicate key value" },
      { uniqueHint: "SKU already exists." },
    );
    expect(unique?.kind).toBe("validation");
    expect(unique?.message).toBe("SKU already exists.");

    const fk = mapDatabaseConstraintError(
      { code: "23503", message: "violates foreign key constraint" },
      { entity: "category" },
    );
    expect(fk?.kind).toBe("dependency");
    expect(fk?.message.toLowerCase()).toContain("being used");
  });
});

describe("Phase 28 — wiring contracts", () => {
  it("exposes FieldError, ConfirmDeleteDialog, dependency helpers", () => {
    expect(read("src/features/admin/ui/FieldError.tsx")).toContain(
      "var(--color-error)",
    );
    expect(read("src/features/admin/ui/ConfirmDeleteDialog.tsx")).toContain(
      "Deactivate",
    );
    expect(read("src/features/catalog/components/CategoryManager.tsx")).toContain(
      "Can't delete this category",
    );
    expect(
      read("src/features/admin/validation/dependencies.ts"),
    ).toContain("checkCategoryDependencies");
    expect(read("src/features/catalog/categories-service.ts")).toContain(
      "checkCategoryDependencies",
    );
    expect(read("src/features/catalog/products-service.ts")).toContain(
      "checkProductDependencies",
    );
    expect(read("src/features/catalog/components/CategoryManager.tsx")).toContain(
      "ConfirmDeleteDialog",
    );
    expect(read("src/features/media/media-service.ts")).toContain(
      "checkMediaDependencies",
    );
  });

  it("uses friendly coupon duplicate copy", () => {
    expect(read("src/features/coupons/admin-service.ts")).toContain(
      "That coupon code is already in use.",
    );
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CUSTOMER_SAFE_MESSAGE } from "@/features/error-monitoring/types";
import { isValidErrorReferenceId } from "@/features/error-monitoring/reference";

vi.mock("server-only", () => ({}));

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

vi.mock("@/features/error-monitoring/logger", () => ({
  logError: vi.fn(async () => ({
    referenceId: "ERR-ABCDEF12",
    id: "log-1",
    grouped: false,
  })),
  logPaymentError: vi.fn(async () => ({
    referenceId: "ERR-ABCDEF12",
    id: "log-1",
    grouped: false,
  })),
  customerFacingError: (referenceId?: string | null) =>
    referenceId
      ? {
          error: `${CUSTOMER_SAFE_MESSAGE} Reference: ${referenceId}`,
          referenceId,
        }
      : { error: CUSTOMER_SAFE_MESSAGE },
}));

describe("Phase 27.1 — unexpectedFailure helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs once and returns safe message + referenceId", async () => {
    const { unexpectedFailure } = await import(
      "@/features/error-monitoring/unexpected"
    );
    const { logError } = await import("@/features/error-monitoring/logger");

    const result = await unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "CREATE_PRODUCT",
      feature: "PRODUCTS",
      message: "insert failed",
      error: { message: "insert failed", code: "57014" },
      storeId: "store-1",
    });

    expect(logError).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.referenceId).toBe("ERR-ABCDEF12");
    expect(isValidErrorReferenceId(result.referenceId)).toBe(true);
    expect(result.error).toContain(CUSTOMER_SAFE_MESSAGE);
    expect(result.error).toContain("ERR-ABCDEF12");
    expect(result.error.toLowerCase()).not.toContain("insert failed");
    expect(result.error.toLowerCase()).not.toContain("57014");
    expect(result.error.toLowerCase()).not.toContain("stack");
  });

  it("runLoggedMutation logs thrown errors once and passes through ok results", async () => {
    const { runLoggedMutation } = await import(
      "@/features/error-monitoring/unexpected"
    );
    const { logError } = await import("@/features/error-monitoring/logger");

    const ok = await runLoggedMutation(
      {
        type: "SERVER",
        operation: "CREATE_PRODUCT",
        feature: "PRODUCTS",
      },
      async () => ({ ok: true as const, message: "ok" }),
    );
    expect(ok).toEqual({ ok: true, message: "ok" });
    expect(logError).not.toHaveBeenCalled();

    const businessFail = await runLoggedMutation(
      {
        type: "SERVER",
        operation: "CREATE_PRODUCT",
        feature: "PRODUCTS",
      },
      async () => ({ ok: false as const, error: "Name is required." }),
    );
    expect(businessFail).toEqual({ ok: false, error: "Name is required." });
    expect(logError).not.toHaveBeenCalled();

    const boom = await runLoggedMutation(
      {
        type: "SERVER",
        operation: "CREATE_PRODUCT",
        feature: "PRODUCTS",
      },
      async () => {
        throw new Error("boom");
      },
    );
    expect(logError).toHaveBeenCalledTimes(1);
    expect(boom).toMatchObject({
      ok: false,
      referenceId: "ERR-ABCDEF12",
    });
  });

  it("does not double-log when service already returned SafeFailure", async () => {
    const { runLoggedMutation, unexpectedFailure } = await import(
      "@/features/error-monitoring/unexpected"
    );
    const { logError } = await import("@/features/error-monitoring/logger");

    const result = await runLoggedMutation(
      {
        type: "SERVER",
        operation: "CREATE_PRODUCT",
        feature: "PRODUCTS",
      },
      async () =>
        unexpectedFailure({
          type: "DATABASE",
          source: "DATABASE",
          operation: "CREATE_PRODUCT",
          feature: "PRODUCTS",
          message: "db down",
        }),
    );

    expect(logError).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: false, referenceId: "ERR-ABCDEF12" });
  });
});

describe("Phase 27.1 — service coverage contracts", () => {
  const cases: Array<{ file: string; ops: string[] }> = [
    {
      file: "src/features/catalog/products-service.ts",
      ops: [
        "CREATE_PRODUCT",
        "UPDATE_PRODUCT",
        "ARCHIVE_PRODUCT",
        "DELETE_PRODUCT",
        "UPDATE_INVENTORY",
        "CREATE_PRODUCT_VARIANT",
        "UPDATE_PRODUCT_VARIANT",
        "DELETE_PRODUCT_VARIANT",
      ],
    },
    {
      file: "src/features/catalog/categories-service.ts",
      ops: [
        "CREATE_CATEGORY",
        "UPDATE_CATEGORY",
        "DISABLE_CATEGORY",
        "DELETE_CATEGORY",
      ],
    },
    {
      file: "src/features/media/media-service.ts",
      ops: ["MEDIA_UPLOAD", "MEDIA_DELETE", "MEDIA_UPDATE"],
    },
    {
      file: "src/features/media/product-images-service.ts",
      ops: [
        "PRODUCT_IMAGE_UPLOAD",
        "PRODUCT_IMAGE_DELETE",
        "PRODUCT_IMAGE_UPDATE",
      ],
    },
    {
      file: "src/features/admin/settings/update-branding.ts",
      ops: ["BRANDING_UPDATE", "BRANDING_UPLOAD"],
    },
    {
      file: "src/features/admin/theme/update-service.ts",
      ops: ["THEME_UPDATE", "MOTION_3D_UPDATE"],
    },
    {
      file: "src/features/admin/settings/update-general.ts",
      ops: ["STORE_SETTINGS_UPDATE"],
    },
    {
      file: "src/features/admin/settings/update-header-footer.ts",
      ops: ["HEADER_SETTINGS_UPDATE", "FOOTER_SETTINGS_UPDATE"],
    },
    {
      file: "src/features/admin/settings/update-navigation.ts",
      ops: ["NAVIGATION_UPDATE"],
    },
    {
      file: "src/features/admin/settings/update-seo.ts",
      ops: ["SEO_UPDATE"],
    },
    {
      file: "src/features/admin/settings/update-shipping-payment.ts",
      ops: ["SHIPPING_SETTINGS_UPDATE"],
    },
    {
      file: "src/features/cms/pages-service.ts",
      ops: ["CREATE_PAGE", "UPDATE_PAGE", "DELETE_PAGE"],
    },
    {
      file: "src/features/cms/sections-service.ts",
      ops: [
        "CREATE_SECTION",
        "UPDATE_SECTION",
        "DELETE_SECTION",
        "REORDER_SECTION",
      ],
    },
    {
      file: "src/features/cms/banners-service.ts",
      ops: ["CREATE_BANNER", "UPDATE_BANNER", "DELETE_BANNER"],
    },
    {
      file: "src/features/blog/posts-service.ts",
      ops: [
        "CREATE_BLOG_POST",
        "UPDATE_BLOG_POST",
        "PUBLISH_BLOG_POST",
        "DELETE_BLOG_POST",
      ],
    },
    {
      file: "src/features/blog/categories-service.ts",
      ops: ["UPDATE_BLOG_CATEGORY"],
    },
    {
      file: "src/features/blog/settings-service.ts",
      ops: ["UPDATE_BLOG_SETTINGS"],
    },
    {
      file: "src/features/auth/actions.ts",
      ops: ["UPDATE_PROFILE"],
    },
    {
      file: "src/features/addresses/service.ts",
      ops: [
        "CREATE_ADDRESS",
        "UPDATE_ADDRESS",
        "DELETE_ADDRESS",
        "SET_DEFAULT_ADDRESS",
      ],
    },
    {
      file: "src/features/wishlist/service.ts",
      ops: ["WISHLIST_ADD", "WISHLIST_REMOVE"],
    },
    {
      file: "src/features/coupons/admin-service.ts",
      ops: ["CREATE_COUPON", "UPDATE_COUPON", "DELETE_COUPON"],
    },
    {
      file: "src/features/orders/admin-service.ts",
      ops: ["UPDATE_ORDER_STATUS", "UPDATE_ORDER_TRACKING"],
    },
    {
      file: "src/features/cart/service.ts",
      ops: ["ADD_TO_CART", "UPDATE_CART_ITEM", "MERGE_CART"],
    },
  ];

  for (const item of cases) {
    it(`covers unexpected failures in ${item.file}`, () => {
      const src = read(item.file);
      expect(src).toContain("unexpectedFailure");
      for (const op of item.ops) {
        expect(src).toContain(op);
      }
    });
  }
});

describe("Phase 27.1 — action throw wrappers (no payment double-wrap)", () => {
  const actionFiles = [
    "src/features/catalog/actions.ts",
    "src/features/media/actions.ts",
    "src/features/admin/settings/actions.ts",
    "src/features/admin/theme/actions.ts",
    "src/features/cms/actions.ts",
    "src/features/blog/actions.ts",
    "src/features/addresses/actions.ts",
    "src/features/wishlist/actions.ts",
    "src/features/coupons/actions.ts",
    "src/features/orders/actions.ts",
    "src/features/cart/actions.ts",
  ];

  it("wraps important mutation actions with runLoggedMutation", () => {
    for (const file of actionFiles) {
      const src = read(file);
      expect(src).toContain("runLoggedMutation");
    }
  });

  it("does not wrap payment actions with logError (already covered downstream)", () => {
    const payments = read("src/features/payments/actions.ts");
    expect(payments).not.toContain("logError");
    expect(payments).not.toContain("logPaymentError");
    expect(payments).not.toContain("unexpectedFailure");
  });
});

describe("Phase 27.1 — no noise for expected business failures", () => {
  it("permission/validation paths in catalog do not call unexpectedFailure inline", () => {
    const products = read("src/features/catalog/products-service.ts");
    // Expected denial still uses plain ok:false strings, not unexpectedFailure for permission.
    expect(products).toContain(
      'return { ok: false, error: "You do not have permission to create products." }',
    );
    expect(products).toContain("zodValidationFailure");
    expect(products).toContain('zodValidationFailure(parsed.error, "Invalid product.")');
  });

  it("coupon apply path is not wrapped with unexpectedFailure", () => {
    const apply = read("src/features/coupons/apply.ts");
    expect(apply).not.toContain("unexpectedFailure");
    expect(apply).not.toContain("logError");
  });
});

describe("Phase 27.1 — safe customer message contract", () => {
  it("customerFacingError never exposes technical wording", () => {
    expect(CUSTOMER_SAFE_MESSAGE.toLowerCase()).not.toContain("supabase");
    expect(CUSTOMER_SAFE_MESSAGE.toLowerCase()).not.toContain("sql");
    expect(CUSTOMER_SAFE_MESSAGE.toLowerCase()).not.toContain("stack");
    expect(CUSTOMER_SAFE_MESSAGE.toLowerCase()).not.toContain("token");
  });
});

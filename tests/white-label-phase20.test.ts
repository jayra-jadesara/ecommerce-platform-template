import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateEnvironment,
  ENV_VAR_SPECS,
  FORBIDDEN_PUBLIC_SECRET_PATTERNS,
} from "@/config/env-schema";
import {
  DEFAULT_FRESH_STORE_NAME,
  DEFAULT_FRESH_STORE_TAGLINE,
  buildDefaultSeoInsert,
  buildDefaultThemeInsert,
} from "@/features/admin/settings/store-defaults";
import { defaultPlatformConfig } from "@/config/defaults";
import { buildManifestFields } from "@/features/pwa";
import { getAppVersion } from "@/config/version";

describe("environment validation", () => {
  it("requires core public vars always", () => {
    const result = validateEnvironment({}, { nodeEnv: "development" });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.key === "NEXT_PUBLIC_SUPABASE_URL")).toBe(
      true,
    );
  });

  it("requires guest cart secret and service role in production", () => {
    const result = validateEnvironment(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        NEXT_PUBLIC_SITE_URL: "https://client-domain.com",
      },
      { nodeEnv: "production", requirePayments: false },
    );
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.key === "GUEST_CART_SECRET" && i.level === "error"),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) => i.key === "SUPABASE_SERVICE_ROLE_KEY" && i.level === "error",
      ),
    ).toBe(true);
  });

  it("does not require Razorpay when payments are disabled", () => {
    const result = validateEnvironment(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        NEXT_PUBLIC_SITE_URL: "https://client-domain.com",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        GUEST_CART_SECRET: "guest-secret",
        PAYMENT_PROVIDER: "none",
      },
      { nodeEnv: "production", requirePayments: false },
    );
    expect(result.ok).toBe(true);
  });

  it("requires Razorpay secrets when payments keys are partially set", () => {
    const result = validateEnvironment(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        NEXT_PUBLIC_SITE_URL: "https://client-domain.com",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        GUEST_CART_SECRET: "guest-secret",
        RAZORPAY_KEY_ID: "rzp_test_x",
      },
      { nodeEnv: "production" },
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.key === "RAZORPAY_KEY_SECRET")).toBe(
      true,
    );
  });

  it("flags NEXT_PUBLIC_ secret-shaped keys", () => {
    const result = validateEnvironment(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_RAZORPAY_KEY_SECRET: "leak",
      },
      { nodeEnv: "development", requirePayments: false },
    );
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.key === "NEXT_PUBLIC_RAZORPAY_KEY_SECRET"),
    ).toBe(true);
  });

  it("documents forbidden public secret patterns", () => {
    expect(FORBIDDEN_PUBLIC_SECRET_PATTERNS.length).toBeGreaterThan(0);
    expect(ENV_VAR_SPECS.some((s) => s.key === "GUEST_CART_SECRET")).toBe(true);
  });
});

describe("fresh-store defaults (no client brand leakage)", () => {
  it("uses generic My Store defaults", () => {
    expect(DEFAULT_FRESH_STORE_NAME).toBe("My Store");
    expect(DEFAULT_FRESH_STORE_TAGLINE.toLowerCase()).not.toContain("sonet");
    expect(JSON.stringify(defaultPlatformConfig).toLowerCase()).not.toContain(
      "sonet",
    );
  });

  it("builds theme/seo stubs without client names", () => {
    const theme = buildDefaultThemeInsert("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const seo = buildDefaultSeoInsert(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      DEFAULT_FRESH_STORE_NAME,
    );
    expect(theme.light_primary).toMatch(/^#/);
    expect(seo.site_title).toBe("My Store");
    expect(JSON.stringify({ theme, seo }).toLowerCase()).not.toContain("sonet");
  });

  it("PWA manifest defaults stay generic", () => {
    const fields = buildManifestFields({});
    expect(fields.name).toBe("Store");
    expect(JSON.stringify(fields).toLowerCase()).not.toContain("sonet");
  });
});

describe("system vs demo seed", () => {
  it("system seed only inserts roles", () => {
    const seed = readFileSync(resolve(process.cwd(), "supabase/seed.sql"), "utf8");
    expect(seed).toMatch(/SYSTEM SEED/i);
    expect(seed).toContain("SUPER_ADMIN");
    expect(seed).toContain("ORDER_MANAGER");
    expect(seed.toLowerCase()).not.toContain("insert into public.products");
    expect(seed.toLowerCase()).not.toContain("sonet");
  });

  it("demo seed is optional and labeled DEMO ONLY", () => {
    const demo = readFileSync(
      resolve(process.cwd(), "supabase/seed-demo.sql"),
      "utf8",
    );
    expect(demo).toMatch(/DEMO ONLY/);
    expect(demo).toContain("demo-product");
    expect(demo.toLowerCase()).not.toContain("sonet");
  });
});

describe("admin bootstrap safety", () => {
  it("bootstrap script is deliberate CLI — not a public route", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/create-default-admin.mjs"),
      "utf8",
    );
    expect(script).toContain("SUPER_ADMIN");
    expect(script).toContain("cannot self-promote");
    expect(script).not.toMatch(/app\/api\/.*admin.*promote/i);
  });

  it("init-store creates generic store without demo catalog", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/init-store.mjs"),
      "utf8",
    );
    expect(script).toContain("My Store");
    expect(script).toContain("provider: \"none\"");
    expect(script).not.toContain("insert into public.products");
  });
});

describe("deployment tooling", () => {
  it("ships onboarding and deployment docs", () => {
    expect(existsSync(resolve(process.cwd(), "docs/CLIENT-ONBOARDING.md"))).toBe(
      true,
    );
    expect(existsSync(resolve(process.cwd(), "docs/DEPLOYMENT.md"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "docs/SETUP-CHECKLIST.md"))).toBe(
      true,
    );
    expect(existsSync(resolve(process.cwd(), "SECURITY.md"))).toBe(true);
  });

  it("package scripts include verify/init/bootstrap/scan", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    );
    expect(pkg.scripts["verify:production"]).toBeTruthy();
    expect(pkg.scripts["init:store"]).toBeTruthy();
    expect(pkg.scripts["bootstrap:admin"]).toBeTruthy();
    expect(pkg.scripts["scan:secrets"]).toBeTruthy();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(getAppVersion()).toBe(pkg.version);
  });

  it(".env.example separates public/server/payments and has no real secrets", () => {
    const example = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    expect(example).toMatch(/PUBLIC/);
    expect(example).toMatch(/SERVER/);
    expect(example).toMatch(/PAYMENTS/);
    expect(example).toContain("GUEST_CART_SECRET=");
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./);
    expect(example.toLowerCase()).not.toContain("sonet");
  });

  it("storage buckets migration defines required buckets", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260907140700_storage_buckets.sql",
      ),
      "utf8",
    );
    for (const bucket of ["branding", "products", "categories", "cms", "media"]) {
      expect(sql).toContain(`'${bucket}'`);
    }
  });
});

describe("domain configuration expectations", () => {
  it("docs reference NEXT_PUBLIC_SITE_URL and webhook path", () => {
    const deploy = readFileSync(
      resolve(process.cwd(), "docs/DEPLOYMENT.md"),
      "utf8",
    );
    expect(deploy).toContain("NEXT_PUBLIC_SITE_URL");
    expect(deploy).toContain("/api/webhooks/razorpay");
    expect(deploy).toContain("client-domain.com");
  });
});

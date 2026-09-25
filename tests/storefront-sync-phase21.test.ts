import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  SYNC_TOPICS,
  SYNC_TOPIC_REGISTRY,
  isSyncTopic,
  resolveSyncPlan,
} from "@/features/sync/topics";
import {
  storefrontSyncFilter,
  STOREFRONT_SYNC_TABLE,
} from "@/features/sync/channel";
import {
  ADMIN_NAV_TREE,
  type AdminNavEntry,
  type AdminNavLink,
} from "@/features/admin/nav";
import { ROLE_PERMISSIONS, type Permission } from "@/features/auth/permissions";

function flattenAdminNav(tree: AdminNavEntry[]): AdminNavLink[] {
  const links: AdminNavLink[] = [];
  for (const entry of tree) {
    if (entry.kind === "link") links.push(entry);
    else links.push(...entry.children);
  }
  return links;
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("Phase 21 storefront sync registry", () => {
  it("registers every SyncTopic with tags and optional paths", () => {
    for (const topic of SYNC_TOPICS) {
      const def = SYNC_TOPIC_REGISTRY[topic];
      expect(def, topic).toBeDefined();
      expect(def.tags.length).toBeGreaterThan(0);
    }
  });

  it("resolveSyncPlan unions tags/paths and sets refreshRouter", () => {
    const plan = resolveSyncPlan(["catalog.products", "store.branding"]);
    expect(plan.tags).toEqual(
      expect.arrayContaining([
        "catalog",
        "catalog-products",
        "storefront-config",
      ]),
    );
    expect(plan.paths).toEqual(expect.arrayContaining(["/products", "/"]));
    expect(plan.refreshRouter).toBe(true);
  });

  it("isSyncTopic rejects unknown topics", () => {
    expect(isSyncTopic("catalog.products")).toBe(true);
    expect(isSyncTopic("admin.team")).toBe(false);
  });

  it("store isolation filter is store_id scoped", () => {
    expect(STOREFRONT_SYNC_TABLE).toBe("storefront_sync_events");
    expect(storefrontSyncFilter("abc-123")).toBe("store_id=eq.abc-123");
  });

  it("does not treat Admin-only domains as sync topics", () => {
    expect(isSyncTopic("team.roles")).toBe(false);
    expect(isSyncTopic("orders")).toBe(false);
    expect(isSyncTopic("error_logs")).toBe(false);
    expect(isSyncTopic("platform.usage")).toBe(false);
  });
});

describe("Phase 21 Admin nav discovery (source of truth)", () => {
  it("exposes a non-empty ADMIN_NAV_TREE with permission-gated links", () => {
    expect(ADMIN_NAV_TREE.length).toBeGreaterThan(5);
    const links = flattenAdminNav(ADMIN_NAV_TREE);
    expect(links.length).toBeGreaterThan(10);
    for (const link of links) {
      expect(link.permissions.length).toBeGreaterThan(0);
      expect(link.href).toMatch(/^\//);
    }
  });

  it("includes storefront-facing content routes discovered from nav", () => {
    const hrefs = flattenAdminNav(ADMIN_NAV_TREE).map((l) => l.href);
    expect(hrefs.some((h) => h.includes("/content/homepage"))).toBe(true);
    expect(hrefs.some((h) => h.includes("/content/blog"))).toBe(true);
    expect(hrefs.some((h) => h.includes("/content/brochures"))).toBe(true);
    expect(hrefs.some((h) => h.includes("/settings/branding"))).toBe(true);
    expect(hrefs.some((h) => h.includes("/settings/theme"))).toBe(true);
  });

  it("SUPER_ADMIN retains settings/content permissions used by storefront sync", () => {
    const needed: Permission[] = [
      "branding.update",
      "theme.update",
      "navigation.update",
      "seo.update",
      "content.update",
      "products.update",
      "coupons.update",
    ];
    for (const perm of needed) {
      expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain(perm);
    }
  });
});

describe("Phase 21 mutation wiring (source scan)", () => {
  const root = resolve(process.cwd(), "src/features");

  it("publishStorefrontSync is used by storefront-facing Admin mutation modules", () => {
    const requiredSnippets = [
      "admin/settings/update-branding.ts",
      "admin/settings/update-general.ts",
      "admin/settings/update-navigation.ts",
      "admin/settings/update-header-footer.ts",
      "admin/settings/update-seo.ts",
      "admin/settings/update-contact-content.ts",
      "admin/settings/update-shipping-payment.ts",
      "admin/theme/update-service.ts",
      "catalog/products-service.ts",
      "catalog/categories-service.ts",
      "cms/pages-service.ts",
      "cms/banners-service.ts",
      "reels/reels-service.ts",
      "blog/posts-service.ts",
      "brochure/service.ts",
      "coupons/actions.ts",
      "career/actions.ts",
      "media/media-service.ts",
      "reviews/actions.ts",
    ];

    for (const rel of requiredSnippets) {
      const source = readFileSync(resolve(root, rel), "utf8");
      expect(source, rel).toContain("publishStorefrontSync");
    }
  });

  it("AppProviders mounts StorefrontSyncListener with config.identity", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/providers/AppProviders.tsx"),
      "utf8",
    );
    expect(source).toContain("StorefrontSyncListener");
    expect(source).toContain("config.identity");
  });

  it("migration defines store-scoped RLS select for sync events", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260925160000_storefront_sync_events.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("storefront_sync_events");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain("supabase_realtime");
  });

  it("brochure + coupons storefront readers use sync cache tags", () => {
    const brochure = readFileSync(resolve(root, "brochure/service.ts"), "utf8");
    expect(brochure).toContain("unstable_cache");
    expect(brochure).toContain("STOREFRONT_BROCHURE_CACHE_TAG");
    expect(brochure).toContain("createSupabasePublicClient");
    expect(brochure).toContain("listStorefrontBrochuresUncached");

    const coupons = readFileSync(
      resolve(root, "coupons/storefront.ts"),
      "utf8",
    );
    expect(coupons).toContain("unstable_cache");
    expect(coupons).toContain("STOREFRONT_COUPONS_CACHE_TAG");
  });

  it("StorefrontSyncListener debounces and filters by store_id", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/sync/StorefrontSyncListener.tsx"),
      "utf8",
    );
    expect(source).toContain("storefrontSyncFilter");
    expect(source).toContain("DEBOUNCE_MS");
    expect(source).toContain("visibilitychange");
    expect(source).toContain("removeChannel");
    expect(source).toContain("invalidateQueries");
    expect(source).toContain("router.refresh");
  });

  it("no duplicate blind subscribe-all tables in sync feature", () => {
    const files = walkTsFiles(resolve(process.cwd(), "src/features/sync"));
    const joined = files.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(joined).not.toMatch(
      /\.on\(\s*["']postgres_changes["'][\s\S]*table:\s*["']\*/,
    );
  });
});

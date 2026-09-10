import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("client-safe site config boundary", () => {
  it("keeps @/config/site free of server-only theme/supabase imports", () => {
    const site = readFileSync(join(process.cwd(), "src/config/site.ts"), "utf8");
    expect(site).not.toMatch(/import ["']server-only["']/);
    expect(site).not.toContain("theme/service");
    expect(site).not.toMatch(/export async function getPlatformConfigAsync/);
    expect(site).toContain("getSiteUrl");
    expect(site).toContain("export function getPlatformConfig");
  });

  it("isolates async platform config behind site.server", () => {
    const server = readFileSync(
      join(process.cwd(), "src/config/site.server.ts"),
      "utf8",
    );
    expect(server).toContain('import "server-only"');
    expect(server).toContain("getPlatformConfigAsync");
    expect(server).toContain("theme/service");
  });

  it("client catalog forms import getSiteUrl from client-safe site module", () => {
    const product = readFileSync(
      join(process.cwd(), "src/features/catalog/components/ProductForm.tsx"),
      "utf8",
    );
    const category = readFileSync(
      join(process.cwd(), "src/features/catalog/components/CategoryManager.tsx"),
      "utf8",
    );
    expect(product).toContain('from "@/config/site"');
    expect(product).not.toContain("site.server");
    expect(product).not.toContain("typeof window");
    expect(category).toContain('from "@/config/site"');
    expect(category).not.toContain("site.server");
  });
});

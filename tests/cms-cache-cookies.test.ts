import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CMS storefront cache safety", () => {
  it("does not call cookie-bound server client inside unstable_cache loaders", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/cms/storefront.ts"),
      "utf8",
    );
    expect(source).toContain("createSupabasePublicClient");
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).toContain("unstable_cache");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("store bootstrap", () => {
  it("exposes ensureActiveStore for first-time setup", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/admin/settings/store-context.ts"),
      "utf8",
    );
    expect(source).toContain("export async function ensureActiveStore");
    expect(source).toContain('status: "active"');
  });

  it("general settings save uses ensureActiveStore", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/admin/settings/update-general.ts"),
      "utf8",
    );
    expect(source).toContain("ensureActiveStore");
    expect(source).not.toContain('error: "No active store found."');
  });
});

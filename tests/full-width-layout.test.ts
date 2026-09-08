import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("full-width layout", () => {
  it("removes storefront container max-width gutters", () => {
    const container = readFileSync(
      resolve(process.cwd(), "src/components/layout/Container.tsx"),
      "utf8",
    );
    expect(container).not.toContain("max-w-[var(--layout-max-width)]");
    expect(container).toContain("px-[var(--layout-container-padding)]");
  });

  it("defaults layout to full width", () => {
    const defaults = readFileSync(
      resolve(process.cwd(), "src/config/defaults.ts"),
      "utf8",
    );
    expect(defaults).toContain('maxWidth: "100%"');
    expect(defaults).toContain('containerPadding: "0.75rem"');
  });

  it("forces storefront layout to full width when loading config", () => {
    const service = readFileSync(
      resolve(process.cwd(), "src/features/theme/service.ts"),
      "utf8",
    );
    expect(service).toContain('maxWidth: "100%"');
    expect(service).toContain('containerPadding: "0.75rem"');
  });
});

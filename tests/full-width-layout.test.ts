import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("storefront container layout", () => {
  it("constrains readable content width with responsive padding", () => {
    const container = readFileSync(
      resolve(process.cwd(), "src/components/layout/Container.tsx"),
      "utf8",
    );
    expect(container).toContain("max-w-[var(--layout-content-max,1520px)]");
    expect(container).toContain("px-[var(--layout-container-padding)]");
    expect(container).toContain("flush");
  });

  it("defaults layout padding for premium spacing", () => {
    const defaults = readFileSync(
      resolve(process.cwd(), "src/config/defaults.ts"),
      "utf8",
    );
    expect(defaults).toContain('maxWidth: "100%"');
    expect(defaults).toContain('containerPadding: "1.5rem"');
  });

  it("keeps storefront shell full-bleed capable while content is constrained", () => {
    const service = readFileSync(
      resolve(process.cwd(), "src/features/theme/service.ts"),
      "utf8",
    );
    expect(service).toContain('maxWidth: "100%"');
    const tokens = readFileSync(
      resolve(process.cwd(), "src/styles/tokens.css"),
      "utf8",
    );
    expect(tokens).toContain("--layout-content-max: 1520px");
  });
});

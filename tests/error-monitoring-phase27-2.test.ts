import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Phase 27.2 — ThemeProvider compile regression", () => {
  it("declares reducedMotion exactly once (no duplicate const)", () => {
    const src = read("src/features/theme/ThemeProvider.tsx");
    const matches = src.match(/\bconst\s+reducedMotion\b/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(src).toContain("reducedMotionPreference");
    expect(src).toContain("resolveMotionConfig");
    expect(src).toContain("muiReady && reducedMotionPreference");
  });
});

describe("Phase 27.2 — runtime error pages use central client reporter", () => {
  it("storefront / root / global / admin error boundaries report via shared client API", () => {
    const storefront = read("src/app/(storefront)/error.tsx");
    const rootError = read("src/app/error.tsx");
    const globalError = read("src/app/global-error.tsx");
    const admin = read("src/app/(admin)/[adminSlug]/(protected)/error.tsx");

    expect(storefront).toContain("reportClientErrorAsync");
    expect(storefront).toContain("CUSTOMER_SAFE_TITLE");
    expect(storefront).toContain("Back to Store");
    expect(storefront).toContain("Try Again");

    expect(rootError).toContain("reportClientErrorAsync");
    expect(rootError).toContain("Reference:");

    expect(globalError).toContain("reportClientError");
    expect(globalError).not.toMatch(/fetch\(\s*["']\/api\/errors["']/);

    expect(admin).toContain("reportClientError");
  });

  it("customer-facing copy stays non-technical", () => {
    const types = read("src/features/error-monitoring/types.ts");
    expect(types).toContain('CUSTOMER_SAFE_TITLE = "Something went wrong."');
    expect(types.toLowerCase()).not.toContain("supabase");
    expect(types.toLowerCase()).not.toContain("razorpay");
  });
});

describe("Phase 27.2 — build failures gated by CI / verify (not error_logs)", () => {
  it("verify:production runs typecheck and build and documents compile vs runtime", () => {
    const script = read("scripts/verify-production.mjs");
    expect(script).toContain("build/compile failure");
    expect(script).toContain("NOT written to Admin Error Logs");
    expect(script).toContain("npm\", [\"run\", \"typecheck\"]");
    expect(script).toContain("npm\", [\"run\", \"lint\"]");
    expect(script).toContain("npm\", [\"test\"]");
    expect(script).toContain("npm\", [\"run\", \"build\"]");
    // Order: typecheck before lint before test before build
    const typeIdx = script.indexOf('run("npm", ["run", "typecheck"]');
    const lintIdx = script.indexOf('run("npm", ["run", "lint"]');
    const testIdx = script.indexOf('run("npm", ["test"]');
    const buildIdx = script.indexOf('run("npm", ["run", "build"]');
    expect(typeIdx).toBeGreaterThan(-1);
    expect(lintIdx).toBeGreaterThan(typeIdx);
    expect(testIdx).toBeGreaterThan(lintIdx);
    expect(buildIdx).toBeGreaterThan(testIdx);
  });

  it("GitHub Actions CI fails the job on typecheck/lint/test/build", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("npm run typecheck");
    expect(ci).toContain("npm run lint");
    expect(ci).toContain("npm test");
    expect(ci).toContain("npm run build");
    expect(ci).toContain("Build/compile/typecheck failures block deployment");
  });

  it("coverage docs do not claim build errors land in error_logs", () => {
    const coverage = read("docs/error-monitoring-coverage.md");
    expect(coverage).toContain(
      "All runtime application errors are centrally monitored",
    );
    expect(coverage).toContain(
      "Build/deployment failures are blocked by CI",
    );
    expect(coverage).not.toMatch(/All errors are stored in error_logs/i);
    expect(coverage).toMatch(/compile/i);
    expect(coverage).toMatch(/Build.*CI/i);
  });

  it("does not invent a BUILD runtime admin tab or error_logs insert from next build", () => {
    const adminUi = read(
      "src/features/error-monitoring/components/AdminErrorLogsClient.tsx",
    );
    expect(adminUi).not.toMatch(/Build Errors/i);
    expect(adminUi).toMatch(/Page & Browser/i);
    expect(adminUi).toMatch(/Database & Server/i);

    const logger = read("src/features/error-monitoring/logger.ts");
    expect(logger).not.toMatch(/\bBUILD\b/);
  });
});

describe("Phase 27.2 — obvious duplicate const scan (recent theme module)", () => {
  it("ThemeProvider has no repeated top-level const name pairs", () => {
    const src = read("src/features/theme/ThemeProvider.tsx");
    const names = [...src.matchAll(/\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\b/g)].map(
      (m) => m[1],
    );
    const counts = new Map<string, number>();
    for (const name of names) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1);
    // Nested scopes may re-use short names; flag only the known regression name.
    expect(counts.get("reducedMotion") ?? 0).toBe(1);
    expect(dupes.map(([n]) => n)).not.toContain("reducedMotionPreference");
  });

  it("typography-css module exists for storefront font application", () => {
    expect(existsSync(join(root, "src/features/theme/typography-css.ts"))).toBe(
      true,
    );
  });
});

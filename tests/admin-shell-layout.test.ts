import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin shell responsive layout", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/admin/components/AdminShell.tsx"),
    "utf8",
  );

  it("uses viewport-locked shell with isolated nav scroll", () => {
    expect(source).toContain("h-dvh max-h-dvh overflow-hidden");
    expect(source).toContain("flex min-h-0 flex-1");
    expect(source).toContain("overflow-y-auto");
    expect(source).toContain("adminScrollHide");
    expect(source).toContain("admin-page-content");
  });

  it("pins logout in the sidebar footer without scrolling the whole sidebar", () => {
    expect(source).toContain("LogoutControl");
    expect(source).toContain('label="Log out"');
    expect(source).toContain("shrink-0 space-y-2 border-t");
  });

  it("uses layered admin surfaces and View Store action", () => {
    expect(source).toContain("adminSidebarBg");
    expect(source).toContain("adminTopBar");
    expect(source).toContain("View Store");
    expect(source).toContain("siteUrl");
  });
});

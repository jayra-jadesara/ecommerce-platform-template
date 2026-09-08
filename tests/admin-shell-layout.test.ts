import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin shell responsive layout", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/admin/components/AdminShell.tsx"),
    "utf8",
  );

  it("uses full-width content area", () => {
    expect(source).toContain("h-dvh overflow-hidden");
    expect(source).toContain("overflow-y-auto");
    expect(source).toContain('className="w-full min-w-0 px-2 py-2 sm:px-3 sm:py-3"');
  });

  it("puts logout in the sidebar footer", () => {
    expect(source).toContain("LogoutButton");
    expect(source).toContain('label="Log out"');
    expect(source).toContain("shrink-0 space-y-2 border-t");
  });

  it("applies tinted backgrounds to sidebar and navbar", () => {
    expect(source).toContain("sidebarBg");
    expect(source).toContain("chromeBg");
  });
});

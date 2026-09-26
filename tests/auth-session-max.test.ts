import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("proxy auth header reuse", () => {
  it("proxy strips client headers then sets trusted identity", () => {
    const proxy = read("src/proxy.ts");
    expect(proxy).toContain("applyTrustedAuthHeaders");
    expect(proxy).toContain("requestHeaders.delete(AUTH_USER_ID_HEADER)");
    expect(proxy).toContain("requestHeaders.set(AUTH_USER_ID_HEADER, user.id)");
    expect(proxy).toContain("AUTH_LAST_SIGN_IN_HEADER");
  });

  it("session prefers proxy headers over a second getUser", () => {
    const session = read("src/features/auth/session.ts");
    expect(session).toContain("readProxyAuthSnapshot");
    expect(session).toContain("AUTH_USER_ID_HEADER");
    expect(session).toContain("fromProxy");
    expect(session).toMatch(/getAuthSessionUser = cache/);
  });
});

describe("per-role session max hours", () => {
  it("migration adds roles.session_max_hours with defaults", () => {
    const migration = read(
      "supabase/migrations/20260926140000_roles_session_max_hours.sql",
    );
    expect(migration).toContain("session_max_hours");
    expect(migration).toContain("SUPER_ADMIN");
    expect(migration).toContain("CHECK (session_max_hours >= 1");
  });

  it("enforces role session max without mutating cookies in RSC", () => {
    const session = read("src/features/auth/session.ts");
    expect(session).toContain("enforceRoleSessionMax");
    expect(session).toContain("roleSessionMaxHours");
    expect(session).toContain("readSessionStartedAtSec");
    expect(session).toContain("/api/auth/expire-session");
    expect(session).not.toContain("await clearSessionStarted");
    expect(session).not.toContain("await supabase.auth.signOut");

    const expire = read("src/app/api/auth/expire-session/route.ts");
    expect(expire).toContain("signOut");
    expect(expire).toContain("SESSION_STARTED_COOKIE");
  });

  it("login marks session start and logout clears it", () => {
    const actions = read("src/features/auth/actions.ts");
    expect(actions).toContain("markSessionStarted");
    expect(actions).toContain("clearSessionStarted");
    expect(actions).toMatch(/logoutAction[\s\S]*clearSessionStarted/);
  });

  it("Teams role editor saves Maximum login duration", () => {
    const dialog = read(
      "src/features/admin/team/components/AdminCreateRoleDialog.tsx",
    );
    expect(dialog).toContain("Maximum login duration");
    expect(dialog).toContain("sessionMaxHours");
    expect(dialog).toContain("AdminSelect");
    expect(dialog).toContain("Never (JWT expiry only)");

    const service = read("src/features/admin/team/service.ts");
    expect(service).toContain("session_max_hours");
    expect(service).toContain("parseSessionMaxHours");
  });
});

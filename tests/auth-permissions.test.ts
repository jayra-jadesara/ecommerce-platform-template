import { describe, expect, it } from "vitest";
import {
  hasAnyRole,
  hasPermission,
  permissionsForRoles,
  ROLE_PERMISSIONS,
} from "@/features/auth/permissions";
import { safeAdminNextPath, safeInternalPath } from "@/features/auth/redirect";
import { mapAuthError } from "@/features/auth/errors";

describe("permissionsForRoles", () => {
  it("grants SUPER_ADMIN every permission", () => {
    const set = permissionsForRoles(["SUPER_ADMIN"]);
    expect(set.has("users.manage")).toBe(true);
    expect(set.has("audit.view")).toBe(true);
    expect(set.has("error_logs.view")).toBe(true);
    expect(set.has("error_logs.update")).toBe(true);
    expect(set.has("dashboard.view")).toBe(true);
  });

  it("does not grant EDITOR order update", () => {
    expect(hasPermission(["EDITOR"], "orders.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "cms.update")).toBe(true);
  });

  it("grants ORDER_MANAGER orders but not products.create", () => {
    expect(hasPermission(["ORDER_MANAGER"], "orders.view")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "products.create")).toBe(false);
  });

  it("unions permissions across multiple roles", () => {
    const set = permissionsForRoles(["EDITOR", "ORDER_MANAGER"]);
    expect(set.has("cms.view")).toBe(true);
    expect(set.has("orders.update")).toBe(true);
  });

  it("ADMIN lacks users.manage", () => {
    expect(ROLE_PERMISSIONS.ADMIN.includes("users.manage")).toBe(false);
    expect(hasPermission(["ADMIN"], "users.manage")).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("detects required roles", () => {
    expect(hasAnyRole(["EDITOR"], ["ADMIN", "EDITOR"])).toBe(true);
    expect(hasAnyRole(["EDITOR"], ["ADMIN"])).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("allows relative internal paths", () => {
    expect(safeInternalPath("/account/profile")).toBe("/account/profile");
    expect(safeInternalPath("/manage-store/dashboard")).toBe(
      "/manage-store/dashboard",
    );
  });

  it("blocks open redirects", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/");
    expect(safeInternalPath("//evil.example")).toBe("/");
    expect(safeInternalPath("\\evil")).toBe("/");
    expect(safeInternalPath("account")).toBe("/");
  });

  it("uses fallback when empty", () => {
    expect(safeInternalPath(null, "/login")).toBe("/login");
  });
});

describe("safeAdminNextPath", () => {
  it("rejects admin login as the post-login destination", () => {
    expect(
      safeAdminNextPath(
        "/manage-store/login",
        "/manage-store",
        "/manage-store/dashboard",
      ),
    ).toBe("/manage-store/dashboard");
    expect(
      safeAdminNextPath(
        "/manage-store/catalog/products",
        "/manage-store",
        "/manage-store/dashboard",
      ),
    ).toBe("/manage-store/catalog/products");
  });
});

describe("mapAuthError", () => {
  it("maps invalid credentials", () => {
    expect(mapAuthError({ message: "Invalid login credentials" })).toBe(
      "Email or password is incorrect.",
    );
  });

  it("maps existing user", () => {
    expect(mapAuthError({ message: "User already registered" })).toBe(
      "An account with this email already exists.",
    );
  });

  it("falls back to generic message", () => {
    expect(mapAuthError({ message: "weird failure" })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

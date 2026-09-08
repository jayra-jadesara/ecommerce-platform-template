import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Platform template version from package.json — use for release notes / support. */
export function getAppVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const APP_VERSION = getAppVersion();

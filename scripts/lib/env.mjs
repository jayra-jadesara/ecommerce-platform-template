/**
 * Shared helpers for Node scripts (admin bootstrap, init-store, verify).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFiles() {
  const env = { ...process.env };
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (env[key] === undefined) env[key] = value;
    }
  }
  return env;
}

export function normalizeSupabaseUrl(raw) {
  let url = (raw || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    if (/^[a-z0-9-]+$/i.test(url)) url = `https://${url}.supabase.co`;
    else if (/^[a-z0-9-]+\.supabase\.co$/i.test(url)) url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

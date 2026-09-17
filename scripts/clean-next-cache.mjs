/**
 * Clears local Next.js caches (`.next`, `.next-profiles`).
 * Safe to run when PostCSS/Turbopack workers crash or the cache is corrupt.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function removePath(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed ${dir}`);
    return;
  } catch {
    const r = spawnSync("cmd.exe", ["/c", "rmdir", "/S", "/Q", dir], {
      encoding: "utf8",
    });
    if (r.status === 0) console.log(`Removed ${dir}`);
    else console.warn(`Could not remove ${dir}`);
  }
}

removePath(path.join(root, ".next"));
removePath(path.join(root, ".next-profiles"));

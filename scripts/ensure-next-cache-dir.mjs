/**
 * Ensures `.next` exists as a normal in-repo folder (not a cross-drive junction).
 *
 * Cross-drive junctions (F: repo → C: cache) break Next/webpack externals:
 *   Error: Cannot find module 'react/jsx-runtime'
 * because compiled pages on C: resolve node_modules from C:, not the project.
 *
 * Corrupt vendor-chunks on HDD are mitigated by webpack memory cache +
 * capped parallelism in next.config.ts, and `npm run clean:next` when needed.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

function removePath(dir) {
  try {
    const st = fs.lstatSync(dir);
    if (st.isSymbolicLink()) {
      fs.unlinkSync(dir);
      console.log(`[next-cache] Removed junction/symlink ${dir}`);
      return;
    }
  } catch {
    return;
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[next-cache] Removed ${dir}`);
  } catch {
    const r = spawnSync("cmd.exe", ["/c", "rmdir", "/S", "/Q", dir], {
      encoding: "utf8",
    });
    if (r.status === 0) console.log(`[next-cache] Removed ${dir}`);
    else console.warn(`[next-cache] Could not remove ${dir}`);
  }
}

try {
  const st = fs.lstatSync(nextDir);
  if (st.isSymbolicLink()) {
    console.log(
      "[next-cache] Cross-drive .next junction detected — removing (breaks react resolution).",
    );
    removePath(nextDir);
  }
} catch {
  /* missing */
}

fs.mkdirSync(nextDir, { recursive: true });
console.log(`[next-cache] Using in-repo .next at ${nextDir}`);

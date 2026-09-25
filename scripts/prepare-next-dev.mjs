/**
 * Prepares `.next` for local `next dev`.
 *
 * - Keeps `.next` on the same drive as the repo (no cross-drive junctions —
 *   those break `react/jsx-runtime` resolution).
 * - Stops leftover Next/Turbopack processes that lock cache files on Windows
 *   (os error 1224 / "Unable to commit snapshot").
 * - Clears Turbopack disk cache when recovering from those locks.
 * - Removes empty / truncated webpack vendor-chunks that cause:
 *     TypeError: Cannot read properties of undefined (reading 'call')
 *   on Windows HDDs when a chunk is read mid-write.
 *
 * Prefer Turbopack (`npm run dev`) on this machine. Use `npm run dev:webpack`
 * only when you need the webpack toolchain.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stopOtherNextDev } from "./stop-project-next.mjs";

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

function walkFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * Truncated or empty JS chunks under .next/dev make webpack's module registry
 * return undefined factories → `.call` TypeError at runtime.
 */
function healCorruptDevChunks() {
  const hotspots = [
    path.join(nextDir, "dev", "server", "vendor-chunks"),
    path.join(nextDir, "dev", "static", "chunks", "vendor-chunks"),
    path.join(nextDir, "dev", "server", "webpack-runtime.js"),
  ];

  let bad = false;
  for (const target of hotspots) {
    try {
      const st = fs.statSync(target);
      if (st.isFile()) {
        if (st.size < 32) {
          bad = true;
          break;
        }
        continue;
      }
      if (!st.isDirectory()) continue;
      for (const file of walkFiles(target)) {
        if (!/\.(js|json)$/i.test(file)) continue;
        const size = fs.statSync(file).size;
        if (size === 0) {
          bad = true;
          break;
        }
        // Huge next.js vendor chunk half-written on HDD often ends abruptly.
        if (file.endsWith(`${path.sep}next.js`) && size < 100_000) {
          bad = true;
          break;
        }
        const sample = fs.readFileSync(file, { encoding: "utf8", flag: "r" });
        const tail = sample.slice(-80).trimEnd();
        if (
          /\.(js)$/i.test(file) &&
          sample.length > 0 &&
          !/[;})\]]\s*$/.test(tail) &&
          !tail.endsWith("*/") &&
          !/sourceMappingURL=/.test(tail)
        ) {
          // Heuristic only for very small files — large minified can end oddly.
          if (sample.length < 4096) {
            bad = true;
            break;
          }
        }
      }
      if (bad) break;
    } catch {
      /* missing — fine */
    }
  }

  if (!bad) return;

  console.warn(
    "[next-cache] Corrupt webpack dev chunks detected — clearing .next/dev to recover.",
  );
  removePath(path.join(nextDir, "dev"));
}

/**
 * Windows error 1224: Turbopack cannot rewrite *.meta while another process
 * still has the file memory-mapped. Clearing the cache after stopping leftover
 * Next processes lets the next session persist again.
 */
function healTurbopackLocks(force = false) {
  const turboDir = path.join(nextDir, "dev", "cache", "turbopack");
  if (!fs.existsSync(turboDir)) return;
  if (!force && process.platform !== "win32") return;

  console.warn(
    "[next-cache] Clearing Turbopack disk cache to avoid Windows file-lock errors (1224).",
  );
  removePath(turboDir);
}

const killed = stopOtherNextDev();
if (killed.length) {
  console.log(
    `[next-cache] Stopped ${killed.length} leftover Next process(es): ${killed.join(", ")}`,
  );
  // Give Windows a moment to release memory-mapped sections.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
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
healCorruptDevChunks();
healTurbopackLocks(
  killed.length > 0 || process.env.NEXT_RESET_TURBO === "1",
);
console.log(`[next-cache] Using in-repo .next at ${nextDir}`);

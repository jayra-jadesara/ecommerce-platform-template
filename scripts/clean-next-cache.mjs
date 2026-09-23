/**
 * Clears local Next.js caches (`.next`, `.next-profiles`) and any leftover
 * SSD junction targets from older setups under %LOCALAPPDATA%/next-dev-cache.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function removePath(dir) {
  try {
    const st = fs.lstatSync(dir);
    if (st.isSymbolicLink()) {
      fs.unlinkSync(dir);
      console.log(`Removed link ${dir}`);
      return;
    }
  } catch {
    /* missing or not a link — fall through */
  }

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

const projectId = crypto
  .createHash("sha1")
  .update(root)
  .digest("hex")
  .slice(0, 12);
const localAppData =
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
const legacySsdCache = path.join(localAppData, "next-dev-cache", projectId);

removePath(path.join(root, ".next"));
removePath(path.join(root, ".next-profiles"));
removePath(legacySsdCache);

console.log("Next.js caches cleared. Run npm run dev to rebuild.");

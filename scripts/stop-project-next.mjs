/**
 * Stops leftover `next` / Turbopack worker processes for this repo.
 * Duplicate instances on Windows lock Turbopack cache files (os error 1224).
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootNorm = root.replaceAll("/", "\\").toLowerCase();
const projectSlug = path.basename(root).toLowerCase();

function listNodeProcesses() {
  if (process.platform !== "win32") {
    try {
      return execSync("ps -eo pid=,args=", { encoding: "utf8" })
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          const m = line.match(/^(\d+)\s+(.*)$/);
          return m ? [{ pid: Number(m[1]), cmd: m[2] }] : [];
        });
    } catch {
      return [];
    }
  }

  const script = `
$ErrorActionPreference = 'Stop'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Select-Object ProcessId, CommandLine |
  ConvertTo-Json -Compress
`.trim();

  const ps1 = path.join(
    os.tmpdir(),
    `stop-next-${projectSlug}-${process.pid}.ps1`,
  );
  try {
    fs.writeFileSync(ps1, script, "utf8");
    const out = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
      { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
    ).trim();
    if (!out) return [];
    const parsed = JSON.parse(out);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .filter((r) => r?.ProcessId && r?.CommandLine)
      .map((r) => ({ pid: Number(r.ProcessId), cmd: String(r.CommandLine) }));
  } catch {
    return [];
  } finally {
    try {
      fs.unlinkSync(ps1);
    } catch {
      /* ignore */
    }
  }
}

function isProjectNextProcess(cmd) {
  const c = cmd.toLowerCase().replaceAll("/", "\\");
  if (!c.includes(projectSlug)) return false;
  if (!c.includes(rootNorm) && !c.includes(`\\${projectSlug}\\`)) return false;
  return (
    c.includes("next dev") ||
    c.includes("bin\\next") ||
    c.includes("next\\dist\\bin\\next") ||
    c.includes("pool_entry") ||
    c.includes("turbopack")
  );
}

export function stopOtherNextDev({ selfPid = process.pid } = {}) {
  const killed = new Set();

  // Prefer the official Next lockfile PID (most reliable on Windows).
  const lockPath = path.join(root, ".next", "dev", "lock");
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const lockPid = Number(lock?.pid);
    if (Number.isFinite(lockPid) && lockPid !== selfPid) {
      try {
        if (process.platform === "win32") {
          execFileSync("taskkill", ["/PID", String(lockPid), "/T", "/F"], {
            windowsHide: true,
            stdio: "ignore",
          });
        } else {
          process.kill(lockPid, "SIGTERM");
        }
        killed.add(lockPid);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* no lock */
  }

  for (const { pid, cmd } of listNodeProcesses()) {
    if (!Number.isFinite(pid) || pid === selfPid || killed.has(pid)) continue;
    if (!isProjectNextProcess(cmd)) continue;
    try {
      if (process.platform === "win32") {
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      } else {
        process.kill(pid, "SIGTERM");
      }
      killed.add(pid);
    } catch {
      /* already gone */
    }
  }
  return [...killed];
}

const invokedDirectly =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const killed = stopOtherNextDev();
  if (killed.length) {
    console.log(
      `[next-cache] Stopped ${killed.length} leftover Next process(es): ${killed.join(", ")}`,
    );
  } else {
    console.log("[next-cache] No leftover Next dev processes found.");
  }
}

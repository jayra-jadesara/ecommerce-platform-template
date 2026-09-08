/**
 * Lightweight secret scan over tracked source files.
 * Does not print secret values — only file paths and pattern names.
 *
 * Usage: node scripts/scan-secrets.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  {
    name: "supabase_service_role_jwt",
    re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "aws_access_key",
    re: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: "razorpay_live_secret",
    re: /rzp_live_[A-Za-z0-9]{10,}/,
  },
  {
    name: "generic_private_key_block",
    re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "next_public_service_role",
    re: /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/,
  },
  {
    name: "next_public_razorpay_secret",
    re: /NEXT_PUBLIC_RAZORPAY_KEY_SECRET/,
  },
];

const SKIP =
  /(^|\/)(node_modules|\.next|\.git|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.env\.example)(\/|$)/;

function listTrackedFiles() {
  try {
    const out = execSync("git ls-files", { encoding: "utf8" });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    console.error("git ls-files failed — run inside the git repository.");
    process.exit(1);
  }
}

function main() {
  const files = listTrackedFiles().filter((f) => !SKIP.test(f));
  const hits = [];

  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // Skip binary-ish
    if (text.includes("\0")) continue;

    for (const pattern of PATTERNS) {
      if (pattern.re.test(text)) {
        hits.push({ file, pattern: pattern.name });
      }
    }

    if (/sonet/i.test(text) && !/not\.toContain\([\"']sonet/i.test(text)) {
      if (
        file.startsWith("docs/") ||
        file === "SECURITY.md" ||
        file === "README.md" ||
        /no\s+sonet|not\s+.*sonet|sonet-specific|Do NOT.*Sonet|anti-leakage|without.*Sonet|mandatory Sonet/i.test(
          text,
        )
      ) {
        // Documentation / anti-leakage tests may mention the brand name to forbid it.
      } else {
        hits.push({ file, pattern: "possible_client_brand_sonet" });
      }
    }
  }

  if (hits.length) {
    console.error("Secret / leakage scan found potential issues:");
    for (const hit of hits) {
      console.error(`  - ${hit.file} (${hit.pattern})`);
    }
    process.exit(1);
  }

  console.log("Secret scan: no obvious issues in tracked files.");
}

main();

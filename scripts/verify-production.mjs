/**
 * Production / pre-deploy verification.
 * Does not print secret values.
 *
 * Catches build/compile failures BEFORE deployment. Those failures cannot be
 * written to application error_logs (the app never starts). Runtime errors are
 * handled separately by the Phase 27 monitoring system.
 *
 * Usage: npm run verify:production
 */
import { spawnSync } from "node:child_process";
import { loadEnvFiles } from "./lib/env.mjs";

function run(cmd, args, label) {
  const title = label || `${cmd} ${args.join(" ")}`;
  console.log(`\n> ${title}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\nverify:production FAILED at: ${title}`);
    if (/build|typecheck/i.test(title)) {
      console.error(
        "This is a build/compile failure. It is NOT written to Admin Error Logs.",
      );
      console.error(
        "Fix the compiler error locally, then re-run verification before deploying.",
      );
      console.error(
        "Runtime application errors continue to use error_logs + ERR- references.",
      );
    }
    process.exit(result.status || 1);
  }
}

function main() {
  const env = loadEnvFiles();
  const nodeEnv = "production";

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SITE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GUEST_CART_SECRET",
  ];
  const missing = required.filter((k) => !String(env[k] || "").trim());
  if (missing.length) {
    console.error("Missing required production env keys (values not shown):");
    for (const k of missing) console.error(`  - ${k}`);
    process.exit(1);
  }

  const badPublic = Object.keys(env).filter(
    (k) =>
      /NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|PASSWORD)/i.test(k) &&
      String(env[k] || "").trim(),
  );
  if (badPublic.length) {
    console.error("Forbidden NEXT_PUBLIC_ secret-shaped keys present:");
    for (const k of badPublic) console.error(`  - ${k}`);
    process.exit(1);
  }

  const paymentsOn = Boolean(
    String(env.RAZORPAY_KEY_ID || "").trim() ||
      String(env.RAZORPAY_KEY_SECRET || "").trim() ||
      String(env.RAZORPAY_WEBHOOK_SECRET || "").trim(),
  );
  if (paymentsOn) {
    for (const k of [
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
    ]) {
      if (!String(env[k] || "").trim()) {
        console.error(`Payments appear enabled but ${k} is missing.`);
        process.exit(1);
      }
    }
  }

  console.log(`Environment: OK (${nodeEnv} checks; secret values not printed)`);
  console.log(
    "Gate: typecheck + lint + test + build must all pass (compile errors block deploy).",
  );

  run("node", ["scripts/scan-secrets.mjs"], "scan:secrets");
  // Fail fast on compile issues before the heavier test suite when possible.
  run("npm", ["run", "typecheck"], "npm run typecheck");
  run("npm", ["run", "lint"], "npm run lint");
  run("npm", ["test"], "npm test");
  run("npm", ["run", "build"], "npm run build");

  console.log("\nverify:production passed.");
  console.log(
    "Reminder: runtime errors → Admin Error Logs (ERR-*). Build failures → CI/deploy logs only.",
  );
}

main();

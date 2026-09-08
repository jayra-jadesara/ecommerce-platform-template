/**
 * Production / pre-deploy verification.
 * Does not print secret values.
 *
 * Usage: npm run verify:production
 */
import { spawnSync } from "node:child_process";
import { loadEnvFiles } from "./lib/env.mjs";

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
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

  run("node", ["scripts/scan-secrets.mjs"]);
  run("npm", ["test"]);
  run("npm", ["run", "typecheck"]);
  run("npm", ["run", "lint"]);
  run("npm", ["run", "build"]);

  console.log("\nverify:production passed.");
}

main();

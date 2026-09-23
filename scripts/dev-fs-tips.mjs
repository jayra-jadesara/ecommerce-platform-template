/**
 * Dev filesystem tips for this Windows + HDD setup.
 *
 * F: is an HDD; C: is an SSD. Large webpack vendor-chunks written on the HDD
 * can be read mid-write → SyntaxError: Invalid or unexpected token.
 *
 * Do NOT move `.next` to another drive — Next then fails with:
 *   Cannot find module 'react/jsx-runtime'
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log(`Project: ${root}`);
console.log("");
console.log("Mitigations in this repo:");
console.log("  - .next stays in the project (same drive as node_modules)");
console.log("  - webpack memory cache (no pack.gz rename races)");
console.log("  - webpack parallelism capped (fewer half-written chunks)");
console.log("  - npm run clean:next when vendor-chunks look corrupt");
console.log("");
console.log("If you see SyntaxError in vendor-chunks/next.js:");
console.log("  1. Ctrl+C the dev server");
console.log("  2. npm run clean:next");
console.log("  3. npm run dev");
console.log("");
console.log("Best long-term: open/copy the project on C: (SSD), e.g.");
console.log(
  `  ${path.join(process.env.USERPROFILE || "C:\\Users\\you", "dev", "ecommerce-platform-template")}`,
);
console.log("  and add a Windows Defender exclusion for that folder.");

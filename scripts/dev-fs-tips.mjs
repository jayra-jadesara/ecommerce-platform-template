/**
 * Dev filesystem tips for this Windows + HDD setup.
 *
 * F: is an HDD; C: is an SSD. Webpack's large vendor-chunks written on the HDD
 * can be read mid-write → SyntaxError / TypeError: reading 'call'.
 *
 * Do NOT move `.next` to another drive — Next then fails with:
 *   Cannot find module 'react/jsx-runtime'
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log(`Project: ${root}`);
console.log("");
console.log("Permanent mitigations in this repo:");
console.log("  - npm run dev uses Turbopack (no webpack vendor-chunks)");
console.log("  - .next stays in the project (same drive as node_modules)");
console.log("  - prepare-next-dev auto-clears corrupt webpack chunks");
console.log("  - webpack fallback: memory cache + parallelism=1");
console.log("");
console.log("If you see Turbopack “Unable to commit snapshot” / os error 1224:");
console.log("  1. Close every terminal running this app’s next dev");
console.log("  2. npm run clean:next");
console.log("  3. npm run dev          (prepare now stops leftover Next processes)");
console.log("");
console.log("If you still see reading 'call' / vendor-chunks errors:");
console.log("  1. Ctrl+C the dev server");
console.log("  2. npm run clean:next");
console.log("  3. npm run dev          (Turbopack — preferred)");
console.log("     npm run dev:webpack  (only if you need webpack)");
console.log("");
console.log("Best long-term: open/copy the project on C: (SSD), e.g.");
console.log(
  `  ${path.join(process.env.USERPROFILE || "C:\\Users\\you", "dev", "ecommerce-platform-template")}`,
);
console.log("  and add a Windows Defender exclusion for that folder.");

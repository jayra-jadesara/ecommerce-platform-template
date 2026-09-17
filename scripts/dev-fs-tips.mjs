/**
 * Why Next.js warns about a slow filesystem on this machine, and what to do.
 *
 * F: is an HDD (TOSHIBA); C: is an SSD (ADATA). Turbopack's PostCSS worker often
 * times out when `.next` lives on the HDD. Webpack is more tolerant; moving the
 * repo to the SSD removes the warning entirely.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log(`Project: ${root}`);
console.log("");
console.log("Cause: this repo is on F: (HDD). Next writes heavily to `.next`.");
console.log("Turbopack PostCSS can crash with: failed to receive message / timeout.");
console.log("");
console.log("What we already do:");
console.log("  - npm run dev  → webpack (avoids Turbopack PostCSS timeouts)");
console.log("  - Images load from Supabase CDN (no /_next/image proxy timeouts)");
console.log("  - Fonts via Google CSS (no next/font 3s fetch retries)");
console.log("  - Tailwind scans only src/ (faster CSS pipeline)");
console.log("  - npm run clean:next when the cache is corrupt");
console.log("");
console.log("For a truly fast filesystem:");
console.log("  1. Open/copy the project on C: (SSD), e.g.");
console.log(
  `     ${path.join(process.env.USERPROFILE || "C:\\Users\\you", "dev", "ecommerce-platform-template")}`,
);
console.log("  2. Exclude that folder in Windows Security → Defender exclusions");
console.log("  3. Then optional: npm run dev:turbo");
console.log("");
console.log("Optional image resizing on Supabase Pro:");
console.log("  NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM=true");

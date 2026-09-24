/**
 * Ensures `.next` exists as a normal in-repo folder (not a cross-drive junction).
 *
 * Prefer `scripts/prepare-next-dev.mjs` (used by `npm run dev`) — it also
 * heals corrupt webpack vendor-chunks. This file remains for `clean:next`
 * / older scripts that only need the directory.
 *
 * Cross-drive junctions (F: repo → C: cache) break Next/webpack externals:
 *   Error: Cannot find module 'react/jsx-runtime'
 * because compiled pages on C: resolve node_modules from C:, not the project.
 *
 * Corrupt vendor-chunks on HDD are mitigated by:
 *   - default Turbopack `npm run dev` (no webpack vendor-chunks)
 *   - webpack memory cache + low parallelism in next.config.ts
 *   - prepare-next-dev heal + `npm run clean:next` when needed
 */
import "./prepare-next-dev.mjs";

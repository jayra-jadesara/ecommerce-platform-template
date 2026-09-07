import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), ".env.local");
if (!existsSync(path)) {
  console.error("Missing .env.local");
  process.exit(1);
}

let text = readFileSync(path, "utf8");
text = text.replace(/^(NEXT_PUBLIC_SUPABASE_URL)=([^\r\n]+)/m, (_m, key, raw) => {
  let value = raw.trim().replace(/^["']|["']$/g, "");
  if (!/^https?:\/\//i.test(value)) {
    if (/^[a-z0-9-]+$/i.test(value)) value = `https://${value}.supabase.co`;
    else if (/^[a-z0-9-]+\.supabase\.co$/i.test(value)) value = `https://${value}`;
  }
  return `${key}=${value}`;
});
writeFileSync(path, text);

const map = Object.fromEntries(
  [...text.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map((m) => [m[1], m[2].trim()]),
);
const url = map.NEXT_PUBLIC_SUPABASE_URL || "";
console.log(
  "url_ok=" + /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url),
);
console.log("anon_ok=" + Boolean(map.NEXT_PUBLIC_SUPABASE_ANON_KEY));
console.log("service_ok=" + Boolean(map.SUPABASE_SERVICE_ROLE_KEY));

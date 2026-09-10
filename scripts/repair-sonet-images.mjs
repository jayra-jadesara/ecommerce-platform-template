/**
 * Repair Sonet product images with strict filename mapping.
 * Usage: node scripts/repair-sonet-images.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { loadEnvFiles, normalizeSupabaseUrl } from "./lib/env.mjs";

const IMAGES_DIR =
  process.env.IMAGES_DIR ||
  "C:\\Users\\HP\\Downloads\\ITEMS JPG FILES\\ITEMS JPG FILES";

/** product slug → preferred image filenames (first = primary) */
const MAP = {
  "spicy-chilli-powder": [],
  "kashmiri-chilli-powder": ["kashmiri-PhotoRoom.png-PhotoRoom.png"],
  "turmeric-powder": [],
  "coriander-cumin-powder": [],
  "rock-salt-powder": ["ROCK SALT POWDER.png"],
  "black-pepper-powder": ["MARI POWDER.png"],
  "dry-mango-powder": ["Dry Mango Powder.png"],
  "dry-ginger-powder": ["SUNTH POWDER.png"],
  "black-salt-powder": ["sancher powder .jpg"],
  "garam-masala": [
    "001_Garam Masala_Box.png",
    "Garam Masala.png",
    "garam masala.jpg",
  ],
  "pavbhaji-masala": ["Pavbhaji Masala.png"],
  "shahi-biryani-masala": ["Shahi Biriyani Masala.png"],
  "chhole-masala": ["Chhole Masala.png"],
  "kitchen-king-masala": ["Kitchen King Masala.png"],
  "chat-masala": ["Chat Masala.png"],
  "pani-puri-masala": ["Panipuri Masala.png"],
  "masala-magic-masti": ["Masala Megic Masti.png"],
  "sabji-masala": ["Sabji Masala.png"],
  "sambhar-masala": ["Sambhar Masala.png"],
  "chicken-masala": ["Chicken Masala.png"],
  "meat-masala": ["Meat Masala.png"],
  "fennel-juice-powder": ["fennel juice.jpg", "fennel juice (3).jpg"],
  "buttermilk-masala": [],
  "tea-masala": ["003_TeaMasal_Box.png"],
  "shahi-paneer-masala": ["002_Shahi Paneer_Box.png"],
};

function mimeFor(file) {
  const ext = extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function main() {
  const env = loadEnvFiles();
  const url = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: store } = await admin
    .from("stores")
    .select("id, name, slug")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!store) throw new Error("No active store");

  const files = new Set(readdirSync(IMAGES_DIR));
  const { data: products } = await admin
    .from("products")
    .select("id, slug, name")
    .eq("store_id", store.id)
    .eq("brand", "Sonet Spices");

  let fixed = 0;
  for (const product of products || []) {
    const wanted = (MAP[product.slug] || []).filter((f) => files.has(f));
    const { data: existing } = await admin
      .from("product_images")
      .select("id, storage_path")
      .eq("product_id", product.id);

    // remove old images from storage + rows
    for (const img of existing || []) {
      if (img.storage_path) {
        await admin.storage.from("products").remove([img.storage_path]);
      }
      await admin.from("product_images").delete().eq("id", img.id);
    }

    if (!wanted.length) {
      console.log(`No mapped image for ${product.slug}`);
      continue;
    }

    for (let i = 0; i < wanted.length; i++) {
      const file = wanted[i];
      const abs = join(IMAGES_DIR, file);
      const fileId = randomUUID();
      const ext = extname(file).replace(".", "").toLowerCase() || "jpg";
      const storagePath = `products/${store.id}/${product.id}/${fileId}.${ext}`;
      const bytes = readFileSync(abs);
      const { error: upErr } = await admin.storage
        .from("products")
        .upload(storagePath, bytes, {
          contentType: mimeFor(file),
          upsert: false,
        });
      if (upErr) {
        console.error(`${product.slug}: ${upErr.message}`);
        continue;
      }
      const { data: pub } = admin.storage
        .from("products")
        .getPublicUrl(storagePath);
      await admin.from("product_images").insert({
        product_id: product.id,
        storage_path: storagePath,
        public_url: pub?.publicUrl ?? null,
        alt_text: product.name,
        sort_order: i,
        is_primary: i === 0,
      });
      console.log(`Fixed ${product.slug} ← ${file}`);
      fixed += 1;
    }
  }

  console.log(`\nDone. images_set=${fixed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Import Sonet catalog from local product images + parsed docx content.
 *
 * Usage (from repo root):
 *   node scripts/seed-sonet-catalog.mjs
 *
 * Optional:
 *   STORE_SLUG=your-slug node scripts/seed-sonet-catalog.mjs
 *   IMAGES_DIR="C:\\Users\\HP\\Downloads\\ITEMS JPG FILES\\ITEMS JPG FILES" node scripts/seed-sonet-catalog.mjs
 *   DRY_RUN=1 node scripts/seed-sonet-catalog.mjs
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { loadEnvFiles, normalizeSupabaseUrl } from "./lib/env.mjs";

const DEFAULT_IMAGES_DIR =
  "C:\\Users\\HP\\Downloads\\ITEMS JPG FILES\\ITEMS JPG FILES";
const CATALOG_PATH = resolve("scripts/data/sonet-products.json");

const SEASONING_NAMES = [
  "Seasoning for Namkeen",
  "Seasoning for Fryums",
  "Seasoning for Wafers",
  "Seasoning for Kurkure",
  "Seasoning for Corn Snacks",
  "Seasoning for Khakhra",
  "Seasoning for Soya Sticks",
  "Seasoning for Peanuts & Cashew Nuts",
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function titleCaseName(name) {
  return name
    .toLowerCase()
    .split(/([\s/-]+)/)
    .map((part) => {
      if (/^[\s/-]+$/.test(part)) return part;
      if (part.length <= 2) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function parsePackSizes(packaging) {
  const text = packaging || "";
  const found = new Set();
  const re =
    /(\d+(?:\.\d+)?)\s*(gm|g|kg|ml)\b|(\d+)\s*rs\.?\s*pack/gi;
  let m;
  while ((m = re.exec(text))) {
    if (m[3]) {
      found.add({ name: "₹10 pack", unit: "pack", weight: null, price: 10 });
      continue;
    }
    const amount = Number(m[1]);
    const unitRaw = (m[2] || "").toLowerCase();
    const unit = unitRaw === "g" ? "gm" : unitRaw;
    const label = `${amount}${unit}`;
    let price = 49;
    if (unit === "kg") price = amount >= 5 ? 899 : 249;
    else if (amount <= 30) price = 35;
    else if (amount <= 40) price = 45;
    else if (amount <= 50) price = 49;
    else if (amount <= 100) price = 89;
    else if (amount <= 200) price = 149;
    else if (amount <= 250) price = 169;
    else if (amount <= 500) price = 229;
    found.add(JSON.stringify({ name: label, unit, weight: amount, price }));
  }
  const variants = [...found].map((x) =>
    typeof x === "string" ? JSON.parse(x) : x,
  );
  if (!variants.length) {
    return [{ name: "50gm", unit: "gm", weight: 50, price: 49 }];
  }
  // Prefer retail packs first; keep at most 4 variants
  variants.sort((a, b) => (a.weight ?? 9999) - (b.weight ?? 9999));
  return variants.slice(0, 4);
}

function normalizeKey(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreImageMatch(productName, fileName) {
  const p = normalizeKey(productName);
  const f = normalizeKey(fileName.replace(extname(fileName), ""));
  if (!p || !f) return 0;
  if (f.includes(p) || p.includes(f)) return 100;
  const pTokens = p.split(" ").filter((t) => t.length > 2);
  const fTokens = new Set(f.split(" ").filter((t) => t.length > 2));
  let hit = 0;
  for (const t of pTokens) if (fTokens.has(t)) hit += 1;
  // aliases
  const aliases = [
    ["panipuri", "pani puri"],
    ["pavbhaji", "pav bhaji"],
    ["biriyani", "biryani"],
    ["megic", "magic"],
    ["sunth", "ginger"],
    ["sancher", "black salt"],
    ["sanchal", "black salt"],
    ["mari", "pepper"],
    ["teamasal", "tea masala"],
  ];
  for (const [a, b] of aliases) {
    if (f.includes(a) && p.includes(b)) hit += 2;
    if (f.includes(b) && p.includes(a)) hit += 2;
  }
  return hit;
}

function pickImages(productName, files) {
  const ranked = files
    .map((file) => ({ file, score: scoreImageMatch(productName, file) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const row of ranked) {
    if (chosen.length >= 2) break;
    // Prefer box/png product shots over pouch collages for primary
    chosen.push(row.file);
  }
  return chosen;
}

function mimeFor(file) {
  const ext = extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function ensureCategory(admin, storeId, name, sortOrder) {
  const slug = slugify(name);
  const { data: existing } = await admin
    .from("categories")
    .select("id, slug")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await admin
    .from("categories")
    .insert({
      store_id: storeId,
      name,
      slug,
      description: null,
      parent_id: null,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(`category ${name}: ${error.message}`);
  return data;
}

async function uploadProductImage(admin, storeId, productId, absPath, sortOrder) {
  const fileId = randomUUID();
  const ext = extname(absPath).replace(".", "").toLowerCase() || "jpg";
  const storagePath = `products/${storeId}/${productId}/${fileId}.${ext}`;
  const bytes = readFileSync(absPath);
  const { error: upErr } = await admin.storage
    .from("products")
    .upload(storagePath, bytes, {
      contentType: mimeFor(absPath),
      upsert: false,
      cacheControl: "3600",
    });
  if (upErr) throw new Error(`upload ${basename(absPath)}: ${upErr.message}`);

  const { data: pub } = admin.storage.from("products").getPublicUrl(storagePath);
  const publicUrl = pub?.publicUrl ?? null;

  const { error: rowErr } = await admin.from("product_images").insert({
    product_id: productId,
    variant_id: null,
    storage_path: storagePath,
    public_url: publicUrl,
    alt_text: basename(absPath),
    sort_order: sortOrder,
    is_primary: sortOrder === 0,
  });
  if (rowErr) throw new Error(`product_images: ${rowErr.message}`);
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const env = loadEnvFiles();
  const url = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const imagesDir = process.env.IMAGES_DIR || DEFAULT_IMAGES_DIR;
  if (!existsSync(imagesDir)) {
    console.error(`Images folder not found: ${imagesDir}`);
    process.exit(1);
  }
  if (!existsSync(CATALOG_PATH)) {
    console.error(`Catalog JSON not found: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const imageFiles = readdirSync(imagesDir).filter((f) =>
    /\.(png|jpe?g|webp)$/i.test(f),
  );

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storeSlug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";

  let storeQuery = admin.from("stores").select("id, name, slug, status");
  if (storeSlug) storeQuery = storeQuery.eq("slug", storeSlug);
  else storeQuery = storeQuery.eq("status", "active").limit(1);

  const { data: stores, error: storeErr } = await storeQuery;
  if (storeErr) throw storeErr;
  const store = Array.isArray(stores) ? stores[0] : stores;
  if (!store?.id) {
    console.error("No store found. Set STORE_SLUG or create a store first.");
    process.exit(1);
  }
  console.log(`Store: ${store.name} (${store.slug}) ${store.id}`);

  const categoryNames = [
    "Seasoning Spices",
    "Grinded Spices",
    "Blended Spices",
  ];
  const categoryIds = {};
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    if (dryRun) {
      categoryIds[name] = `dry-${slugify(name)}`;
      console.log(`[dry] category ${name}`);
      continue;
    }
    const cat = await ensureCategory(admin, store.id, name, i + 1);
    categoryIds[name] = cat.id;
    console.log(`Category ready: ${name}`);
  }

  const extraSeasonings = SEASONING_NAMES.map((name) => ({
    name,
    category: "Seasoning Spices",
    description: `${name} from Sonet Spices — manufactured for snack and savory applications.`,
    usage: "",
    packaging: "Packaging available in 1 Kg pack",
  }));

  const allProducts = [...catalog, ...extraSeasonings];
  let created = 0;
  let skipped = 0;
  let imaged = 0;

  for (const item of allProducts) {
    const displayName = titleCaseName(item.name);
    const slug = slugify(displayName);
    const { data: existing } = await admin
      .from("products")
      .select("id, slug")
      .eq("store_id", store.id)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      console.log(`Skip existing: ${displayName}`);
      skipped += 1;
      continue;
    }

    const packs = parsePackSizes(item.packaging);
    const shortDescription = (item.description || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    const description = [item.description, item.packaging]
      .filter(Boolean)
      .join("\n\n")
      .trim();
    const usageInstructions = (item.usage || "").trim();

    const variants = packs.map((pack, idx) => ({
      name: pack.name,
      sku: `${slug}-${pack.name}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 60),
      price: pack.price,
      compare_at_price: null,
      cost_price: null,
      weight: pack.weight,
      unit: pack.unit,
      track_inventory: true,
      is_active: true,
      _order: idx,
    }));

    // unique SKUs
    const used = new Set();
    for (const v of variants) {
      let sku = v.sku;
      let n = 2;
      while (used.has(sku)) {
        sku = `${v.sku}-${n++}`.slice(0, 60);
      }
      used.add(sku);
      v.sku = sku;
    }

    console.log(
      `${dryRun ? "[dry] " : ""}Create ${displayName} (${variants.map((v) => v.name).join(", ")})`,
    );

    if (dryRun) continue;

    const { data: product, error: pErr } = await admin
      .from("products")
      .insert({
        store_id: store.id,
        category_id: categoryIds[item.category] ?? null,
        name: displayName,
        slug,
        short_description: shortDescription || null,
        description: description || null,
        brand: "Sonet Spices",
        ingredients: null,
        usage_instructions: usageInstructions || null,
        status: "active",
        featured: [
          "Garam Masala",
          "Kitchen King Masala",
          "Tea Masala",
          "Kashmiri Chilli Powder",
        ].includes(displayName),
        seo_title: `${displayName} | Sonet Spices`,
        seo_description: shortDescription || `${displayName} from Sonet Spices`,
        model_path: null,
      })
      .select("id, slug")
      .single();

    if (pErr || !product) {
      console.error(`  product failed: ${pErr?.message}`);
      continue;
    }

    for (const v of variants) {
        const { data: variant, error: vErr } = await admin
          .from("product_variants")
          .insert({
            product_id: product.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            compare_at_price: v.compare_at_price,
            cost_price: v.cost_price,
            weight: v.weight,
            unit: v.unit,
            track_inventory: true,
            is_active: true,
          })
          .select("id")
          .single();
      if (vErr || !variant) {
        console.error(`  variant ${v.name}: ${vErr?.message}`);
        continue;
      }
      const { error: invErr } = await admin.from("inventory").upsert(
        {
          variant_id: variant.id,
          quantity: 100,
          reserved_quantity: 0,
          low_stock_threshold: 10,
        },
        { onConflict: "variant_id" },
      );
      if (invErr) {
        console.error(`  inventory ${v.name}: ${invErr.message}`);
      }
    }

    const matched = pickImages(displayName, imageFiles);
    // special-case mappings
    const extras = [];
    if (/garam/i.test(displayName)) {
      for (const f of imageFiles) if (/garam/i.test(f)) extras.push(f);
    }
    if (/tea/i.test(displayName)) {
      for (const f of imageFiles) if (/tea/i.test(f)) extras.push(f);
    }
    if (/paneer/i.test(displayName)) {
      for (const f of imageFiles) if (/paneer/i.test(f)) extras.push(f);
    }
    const images = [...new Set([...matched, ...extras])].slice(0, 3);
    for (let i = 0; i < images.length; i++) {
      const abs = join(imagesDir, images[i]);
      try {
        await uploadProductImage(admin, store.id, product.id, abs, i);
        imaged += 1;
        console.log(`  image: ${images[i]}`);
      } catch (err) {
        console.error(`  ${err.message}`);
      }
    }

    created += 1;
  }

  // Optional: Shahi Paneer from images if present and not in docx
  const paneerFile = imageFiles.find((f) => /paneer/i.test(f));
  if (paneerFile && !dryRun) {
    const slug = "shahi-paneer-masala";
    const { data: existing } = await admin
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) {
      const { data: product } = await admin
        .from("products")
        .insert({
          store_id: store.id,
          category_id: categoryIds["Blended Spices"] ?? null,
          name: "Shahi Paneer Masala",
          slug,
          short_description:
            "Sonet Shahi Paneer Masala — aromatic blend for rich paneer gravies.",
          description:
            "A blended spice mix crafted for shahi paneer and similar North Indian paneer curries.",
          brand: "Sonet Spices",
          usage_instructions:
            "Add 1–2 tbsp while cooking paneer gravy for 4 servings. Adjust to taste.",
          status: "active",
          featured: true,
          seo_title: "Shahi Paneer Masala | Sonet Spices",
          seo_description:
            "Buy Sonet Shahi Paneer Masala for rich, aromatic paneer dishes.",
        })
        .select("id")
        .single();
      if (product) {
        const { data: variant } = await admin
          .from("product_variants")
          .insert({
            product_id: product.id,
            name: "50gm",
            sku: "shahi-paneer-masala-50gm",
            price: 49,
            weight: 50,
            unit: "gm",
            track_inventory: true,
            is_active: true,
          })
          .select("id")
          .single();
        if (variant) {
          await admin.from("inventory").upsert(
            {
              variant_id: variant.id,
              quantity: 100,
              reserved_quantity: 0,
              low_stock_threshold: 10,
            },
            { onConflict: "variant_id" },
          );
        }
        await uploadProductImage(
          admin,
          store.id,
          product.id,
          join(imagesDir, paneerFile),
          0,
        );
        created += 1;
        imaged += 1;
        console.log("Created Shahi Paneer Masala");
      }
    }
  }

  console.log(
    `\nDone. created=${created} skipped=${skipped} images_uploaded=${imaged}${dryRun ? " (dry run)" : ""}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

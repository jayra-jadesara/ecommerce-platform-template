/**
 * Apply Sonet docx content to store settings, restock catalog, and publish homepage/about.
 *
 * Usage:
 *   node scripts/seed-sonet-storefront.mjs
 *   STORE_SLUG=abc node scripts/seed-sonet-storefront.mjs
 *   DRY_RUN=1 node scripts/seed-sonet-storefront.mjs
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles, normalizeSupabaseUrl } from "./lib/env.mjs";

const dryRun = process.env.DRY_RUN === "1";

const CONTACT = {
  contact_email: "sonet@sonetspices.com",
  contact_phone: "+91 81603 03871",
  contact_phone_secondary: "+91 94265 98665",
  address_line_1: "Plot no. 2628/6, GIDC Lodhika, Kranti gate, Metoda",
  address_line_2: null,
  city: "Rajkot",
  state: "Gujarat",
  postal_code: "360021",
  country: "India",
  footer_description:
    "Sonet Spices manufactures and exports seasoning, grinded and blended spices since 1999 — better quality, greater taste & aroma.",
  copyright_text: "© Sonet Spices. All rights reserved.",
  footer_show_contact: true,
  announcement_enabled: true,
  announcement_text:
    "Manufacturer & exporter of grinded & blended spices since 1999",
  announcement_url: "/products",
  announcement_open_in_new_tab: false,
};

const BRANDING = {
  brand_name: "Sonet",
  tagline: "We enhance food, with quality spices.",
};

const SEO = {
  site_title: "Sonet Spices",
  meta_description:
    "Leading manufacturer and exporter of seasoning, grinded and blended spices since 1999. Better quality, greater taste & aroma.",
  og_title: "Sonet Spices — Quality spices from India",
  og_description:
    "Seasoning spices, grinded spices and blended masalas for kitchens and food industries worldwide.",
};

const ABOUT_CONTENT = `Being one of the leading spices manufacturing companies in India, Sonet Spices believes in value creation with innovative, best quality, taste and aroma across our range.

Founded in 1999, we are a dependable manufacturer of cooking spice powders and seasonings for potato chips, fryums, namkeen, farsan, khakhra, corn snacks and more. We supply in bulk and process spices to food-industry standards from our infrastructural unit in Rajkot, Gujarat.

Mission: deliver the best quality spices across applications by balancing quality, service and price.

Vision: play a role in better-quality spices for taste, hygiene and aroma.

We are certified with FSSAI, AGMARK, ISO 9001:2015, ISO 22000:2005, Spice Board of India, APEDA and USFDA.`;

const common = {
  backgroundStyle: "default",
  spacingPreset: "normal",
  animationPreset: "fade-up",
  animationEnabled: true,
};

function homepageSections() {
  return [
    {
      section_type: "hero",
      title: "Hero",
      sort_order: 0,
      is_active: true,
      config: {
        ...common,
        title: "Better quality, greater taste & aroma",
        subtitle: "LEADING MANUFACTURER OF SEASONING SPICES",
        description:
          "Manufacturer and exporter of grinded & blended spices since 1999. We enhance food, with quality spices.",
        backgroundImagePath: null,
        foregroundImagePath: null,
        primaryButtonText: "Shop products",
        primaryButtonLink: "/products",
        secondaryButtonText: "About Sonet",
        secondaryButtonLink: "/about",
        alignment: "left",
        layoutPreset: "FULL_BLEED",
        enable3d: false,
        scene3dPreset: "NONE",
        scene3dRotationSpeed: 0.25,
        scene3dCameraDistance: 4.5,
      },
    },
    {
      section_type: "categories",
      title: "Categories",
      sort_order: 1,
      is_active: true,
      config: {
        ...common,
        title: "Our product range",
        description:
          "Seasoning spices, grinded spices and blended spices for kitchens and food industries.",
        categoryIds: [],
        columns: 3,
      },
    },
    {
      section_type: "products",
      title: "Featured products",
      sort_order: 2,
      is_active: true,
      config: {
        ...common,
        title: "Featured masalas",
        description: "Popular blends and powders from Sonet Spices.",
        source: "FEATURED_PRODUCTS",
        productIds: [],
        categoryId: null,
        limit: 8,
      },
    },
    {
      section_type: "features",
      title: "Why choose us",
      sort_order: 3,
      is_active: true,
      config: {
        ...common,
        backgroundStyle: "surface",
        title: "Why choose Sonet?",
        description:
          "Premium spices in safe packaging, delivered with reliability and genuine rates.",
        items: [
          {
            icon: "package",
            title: "Product range",
            description:
              "Qualitative spice blends that satisfy kitchens and vast food industries.",
          },
          {
            icon: "globe",
            title: "Worldwide presence",
            description:
              "Markets across the Gulf, Middle East, Africa, South-East Asia and beyond.",
          },
          {
            icon: "leaf",
            title: "Research & development",
            description:
              "Continuous R&D for unique taste in seasoning and blended spices.",
          },
          {
            icon: "shield",
            title: "Quality",
            description:
              "Strict checks across manufacturing with automatic and manual controls.",
          },
        ],
      },
    },
    {
      section_type: "statistics",
      title: "By the numbers",
      sort_order: 4,
      is_active: true,
      config: {
        ...common,
        title: "Delivering values since 1999",
        items: [
          { value: "24+", label: "Years of experience" },
          { value: "55+", label: "Employees" },
          { value: "11+", label: "Countries worldwide" },
          { value: "1999", label: "Founded" },
        ],
      },
    },
    {
      section_type: "about",
      title: "About",
      sort_order: 5,
      is_active: true,
      config: {
        ...common,
        heading: "About Sonet Spices",
        description:
          "Founded in 1999, Sonet Spices is a dependable manufacturer of cooking spices and seasonings. We follow international standards including ISO 9001:2015 and ISO 22000:2005, and serve food industries and households with better quality, greater taste and aroma.",
        imagePath: null,
        buttonText: "Contact us",
        buttonLink: "/contact",
      },
    },
    {
      section_type: "cta",
      title: "CTA",
      sort_order: 6,
      is_active: true,
      config: {
        ...common,
        backgroundStyle: "primary-soft",
        heading: "Need more info?",
        description:
          "Post your inquiries and get to know more about Sonet Spices — one of the best spices manufacturers in India.",
        buttonText: "Contact us",
        buttonLink: "/contact",
      },
    },
  ];
}

async function main() {
  const env = loadEnvFiles();
  const url = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const slug =
    process.env.STORE_SLUG?.trim() ||
    env.STORE_SLUG?.trim() ||
    env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";

  let storeQuery = admin
    .from("stores")
    .select("id, slug, name, status")
    .eq("status", "active")
    .limit(1);
  if (slug) {
    storeQuery = admin
      .from("stores")
      .select("id, slug, name, status")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }
  const { data: stores, error: storeErr } = await storeQuery;
  if (storeErr || !stores?.[0]) {
    console.error("No active store found", storeErr?.message);
    process.exit(1);
  }
  const store = stores[0];
  console.log(`Store: ${store.name} (${store.slug}) ${store.id}`);

  // 1) Contact + footer + announcement
  console.log(dryRun ? "[dry] Update store_settings" : "Update store_settings");
  if (!dryRun) {
    const { error } = await admin
      .from("store_settings")
      .upsert({ store_id: store.id, ...CONTACT }, { onConflict: "store_id" });
    if (error) console.error("store_settings:", error.message);
    else console.log("  contact + footer OK");
  }

  // 2) Branding
  console.log(dryRun ? "[dry] Update branding" : "Update branding");
  if (!dryRun) {
    const { error } = await admin
      .from("store_branding")
      .upsert({ store_id: store.id, ...BRANDING }, { onConflict: "store_id" });
    if (error) console.error("store_branding:", error.message);
    else console.log("  branding OK");
  }

  // 3) SEO
  console.log(dryRun ? "[dry] Update SEO" : "Update SEO");
  if (!dryRun) {
    const { error } = await admin
      .from("store_seo_settings")
      .upsert({ store_id: store.id, ...SEO }, { onConflict: "store_id" });
    if (error) console.error("store_seo_settings:", error.message);
    else console.log("  seo OK");
  }

  // 4) Restock inventory (qty was 0 for nearly all variants)
  const { data: variants, error: vErr } = await admin
    .from("product_variants")
    .select("id, products!inner(store_id)")
    .eq("products.store_id", store.id);
  if (vErr) {
    console.error("variants:", vErr.message);
  } else {
    console.log(
      dryRun
        ? `[dry] Restock ${variants.length} variants to qty 100`
        : `Restock ${variants.length} variants to qty 100`,
    );
    if (!dryRun) {
      let ok = 0;
      let fail = 0;
      for (const v of variants) {
        const { error } = await admin.from("inventory").upsert(
          {
            variant_id: v.id,
            quantity: 100,
            reserved_quantity: 0,
            low_stock_threshold: 10,
          },
          { onConflict: "variant_id" },
        );
        if (error) {
          fail += 1;
          console.error(`  inventory ${v.id}: ${error.message}`);
        } else ok += 1;
      }
      console.log(`  restocked=${ok} failed=${fail}`);
    }
  }

  // 5) Feature products that have images
  if (!dryRun) {
    const { data: imaged } = await admin
      .from("products")
      .select("id, name, product_images(id)")
      .eq("store_id", store.id)
      .eq("status", "active");
    const withImages = (imaged || []).filter(
      (p) => Array.isArray(p.product_images) && p.product_images.length > 0,
    );
    const featureIds = withImages.slice(0, 12).map((p) => p.id);
    if (featureIds.length) {
      await admin
        .from("products")
        .update({ featured: true })
        .in("id", featureIds);
      console.log(`Featured ${featureIds.length} products with images`);
    }
  }

  // 6) Publish homepage with Sonet sections
  console.log(dryRun ? "[dry] Publish homepage" : "Publish homepage");
  if (!dryRun) {
    const now = new Date().toISOString();
    const { data: existingHome } = await admin
      .from("pages")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", "home")
      .maybeSingle();

    let homeId = existingHome?.id;
    if (!homeId) {
      const { data: created, error } = await admin
        .from("pages")
        .insert({
          store_id: store.id,
          title: "Homepage",
          slug: "home",
          content: null,
          status: "published",
          seo_title: SEO.site_title,
          seo_description: SEO.meta_description,
          published_at: now,
        })
        .select("id")
        .single();
      if (error || !created) {
        console.error("homepage create:", error?.message);
      } else {
        homeId = created.id;
        console.log("  created homepage page");
      }
    } else {
      await admin
        .from("pages")
        .update({
          status: "published",
          seo_title: SEO.site_title,
          seo_description: SEO.meta_description,
          published_at: now,
          updated_at: now,
        })
        .eq("id", homeId);
      console.log("  updated homepage page");
    }

    if (homeId) {
      await admin.from("page_sections").delete().eq("page_id", homeId);
      const sections = homepageSections().map((s) => ({
        page_id: homeId,
        ...s,
      }));
      const { error: secErr } = await admin.from("page_sections").insert(sections);
      if (secErr) console.error("sections:", secErr.message);
      else console.log(`  inserted ${sections.length} homepage sections`);
    }
  }

  // 7) About page (CMS) + keep /about route usable via published page if used
  console.log(dryRun ? "[dry] Publish about page" : "Publish about page");
  if (!dryRun) {
    const now = new Date().toISOString();
    const { data: existingAbout } = await admin
      .from("pages")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", "about")
      .maybeSingle();

    if (!existingAbout) {
      const { error } = await admin.from("pages").insert({
        store_id: store.id,
        title: "About Sonet Spices",
        slug: "about",
        content: ABOUT_CONTENT,
        status: "published",
        seo_title: "About Sonet Spices",
        seo_description:
          "Sonet Spices — manufacturer and exporter of quality spices since 1999.",
        published_at: now,
      });
      if (error) console.error("about create:", error.message);
      else console.log("  created about CMS page");
    } else {
      const { error } = await admin
        .from("pages")
        .update({
          title: "About Sonet Spices",
          content: ABOUT_CONTENT,
          status: "published",
          seo_title: "About Sonet Spices",
          seo_description:
            "Sonet Spices — manufacturer and exporter of quality spices since 1999.",
          published_at: now,
          updated_at: now,
        })
        .eq("id", existingAbout.id);
      if (error) console.error("about update:", error.message);
      else console.log("  updated about CMS page");
    }
  }

  // Also rename store display name for consistency
  if (!dryRun) {
    await admin.from("stores").update({ name: "Sonet", legal_name: "Sonet Spices" }).eq("id", store.id);
  }

  console.log("\nDone. Soft-refresh the storefront (config cache ~60s) or restart next dev.");
  console.log("Check: /contact, /, /products, Admin → Store Settings, Content → Homepage.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

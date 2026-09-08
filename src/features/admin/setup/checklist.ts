import "server-only";

import { getAdminPath } from "@/config/admin-route";
import {
  DEFAULT_FRESH_STORE_NAME,
  DEFAULT_FRESH_STORE_TAGLINE,
} from "@/features/admin/settings/store-defaults";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SetupChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

/**
 * Lightweight first-run checklist — not a forced wizard.
 */
export async function getStoreSetupChecklist(): Promise<{
  show: boolean;
  items: SetupChecklistItem[];
  completedCount: number;
}> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) {
    return {
      show: true,
      completedCount: 0,
      items: [
        {
          id: "store",
          label: "Add store information",
          description: "Name, currency, and contact details",
          href: getAdminPath("/settings/general"),
          done: false,
        },
      ],
    };
  }

  const supabase = await createSupabaseServerClient();

  const [
    { data: branding },
    { data: shipping },
    { data: payment },
    { count: productCount },
  ] = await Promise.all([
    supabase
      .from("store_branding")
      .select("brand_name, tagline, logo_path")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("shipping_settings")
      .select("enabled, default_shipping_fee")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("payment_settings")
      .select("provider")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
  ]);

  const brandName = branding?.brand_name?.trim() || "";
  const storeInfoDone =
    Boolean(brandName) &&
    brandName !== DEFAULT_FRESH_STORE_NAME &&
    brandName !== "Brand Name";

  const logoDone = Boolean(branding?.logo_path?.trim());
  const productsDone = (productCount ?? 0) > 0;
  const shippingDone = Boolean(shipping);
  const paymentsDone =
    Boolean(payment?.provider) && payment?.provider !== "none";

  const items: SetupChecklistItem[] = [
    {
      id: "store",
      label: "Add store information",
      description: "Replace the default store name and contact details",
      href: getAdminPath("/settings/general"),
      done: storeInfoDone,
    },
    {
      id: "logo",
      label: "Add logo",
      description: "Upload your brand logo for the storefront and PWA",
      href: getAdminPath("/settings/branding"),
      done: logoDone,
    },
    {
      id: "appearance",
      label: "Review appearance",
      description: "Theme colors and fonts (optional but recommended)",
      href: getAdminPath("/settings/theme"),
      done:
        storeInfoDone &&
        branding?.tagline !== DEFAULT_FRESH_STORE_TAGLINE &&
        Boolean(branding?.tagline),
    },
    {
      id: "products",
      label: "Add first product",
      description: "Create at least one product customers can buy",
      href: getAdminPath("/catalog/products?panel=new"),
      done: productsDone,
    },
    {
      id: "shipping",
      label: "Configure shipping",
      description: "Set shipping method and fees",
      href: getAdminPath("/settings/shipping"),
      done: shippingDone,
    },
    {
      id: "payments",
      label: "Configure payments",
      description: "Enable Razorpay (or keep disabled until ready)",
      href: getAdminPath("/settings/payments"),
      done: paymentsDone,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const show = completedCount < items.length;

  return { show, items, completedCount };
}

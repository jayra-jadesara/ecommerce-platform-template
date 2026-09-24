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
      .select("razorpay_enabled, cod_enabled, provider")
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
    Boolean(payment?.razorpay_enabled) ||
    Boolean(payment?.cod_enabled) ||
    (Boolean(payment?.provider) && payment?.provider !== "none");

  const items: SetupChecklistItem[] = [
    {
      id: "store",
      label: "Name your store",
      description: "Customers see this name on the website",
      href: getAdminPath("/settings/general"),
      done: storeInfoDone,
    },
    {
      id: "logo",
      label: "Add your logo",
      description: "Appears in the header and when people save your app",
      href: getAdminPath("/settings/branding"),
      done: logoDone,
    },
    {
      id: "appearance",
      label: "Pick your look",
      description: "Colors and fonts for the shop (optional)",
      href: getAdminPath("/settings/theme"),
      done:
        storeInfoDone &&
        branding?.tagline !== DEFAULT_FRESH_STORE_TAGLINE &&
        Boolean(branding?.tagline),
    },
    {
      id: "products",
      label: "Add something to sell",
      description: "At least one product so shoppers can check out",
      href: getAdminPath("/catalog/products?panel=new"),
      done: productsDone,
    },
    {
      id: "shipping",
      label: "Set delivery fees",
      description: "How orders get to the customer",
      href: getAdminPath("/settings/shipping"),
      done: shippingDone,
    },
    {
      id: "payments",
      label: "Turn on payments",
      description: "Online payment and/or cash on delivery",
      href: getAdminPath("/settings/payments"),
      done: paymentsDone,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const show = completedCount < items.length;

  return { show, items, completedCount };
}

import "server-only";

import { revalidateTag } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  resolveActiveStore,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { diffChangedKeys } from "@/features/admin/settings/validation";
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SHIPPING_SETTINGS,
  paymentSettingsSchema,
  shippingSettingsSchema,
  type PaymentSettingsFormValues,
  type ShippingSettingsFormValues,
} from "@/features/admin/settings/shipping-payment-schemas";
import { PRICING_SETTINGS_CACHE_TAG } from "@/features/pricing/config";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";

const SHIPPING_ROUTE = getAdminPath("/settings/shipping");
const PAYMENTS_ROUTE = getAdminPath("/settings/payments");

export async function loadShippingSettingsForm(): Promise<{
  values: ShippingSettingsFormValues;
  currency: string;
  storeId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) {
    return {
      values: DEFAULT_SHIPPING_SETTINGS,
      currency: "INR",
      storeId: null,
    };
  }

  const [{ data: shipping }, { data: settings }] = await Promise.all([
    supabase
      .from("shipping_settings")
      .select("*")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_settings")
      .select("currency")
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);

  return {
    storeId: store.id,
    currency: settings?.currency || "INR",
    values: shipping
      ? {
          enabled: Boolean(shipping.enabled),
          method:
            shipping.method === "flat_rate" ||
            shipping.method === "free" ||
            shipping.method === "percentage" ||
            shipping.method === "zone"
              ? shipping.method
              : DEFAULT_SHIPPING_SETTINGS.method,
          freeShippingThreshold: shipping.free_shipping_threshold,
          defaultShippingFee: Number(shipping.default_shipping_fee) || 0,
          percentageRate: shipping.percentage_rate,
          estimatedDeliveryMinDays: shipping.estimated_delivery_min_days,
          estimatedDeliveryMaxDays: shipping.estimated_delivery_max_days,
          estimatedDeliveryLabel: shipping.estimated_delivery_label,
        }
      : DEFAULT_SHIPPING_SETTINGS,
  };
}

export async function loadPaymentSettingsForm(): Promise<{
  values: PaymentSettingsFormValues;
  currency: string;
  storeId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) {
    return {
      values: DEFAULT_PAYMENT_SETTINGS,
      currency: "INR",
      storeId: null,
    };
  }

  const [{ data: payment }, { data: settings }] = await Promise.all([
    supabase
      .from("payment_settings")
      .select("*")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_settings")
      .select("currency")
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);

  return {
    storeId: store.id,
    currency: settings?.currency || "INR",
    values: payment
      ? {
          provider:
            payment.provider === "none" ||
            payment.provider === "razorpay" ||
            payment.provider === "other"
              ? payment.provider
              : DEFAULT_PAYMENT_SETTINGS.provider,
          feeEnabled: Boolean(payment.fee_enabled),
          feeType:
            payment.fee_type === "PERCENTAGE" || payment.fee_type === "FIXED"
              ? payment.fee_type
              : DEFAULT_PAYMENT_SETTINGS.feeType,
          feeValue: Number(payment.fee_value) || 0,
          feeBasis:
            payment.fee_basis === "SUBTOTAL" ||
            payment.fee_basis === "SUBTOTAL_PLUS_SHIPPING" ||
            payment.fee_basis === "ORDER_TOTAL_BEFORE_PAYMENT_FEE"
              ? payment.fee_basis
              : DEFAULT_PAYMENT_SETTINGS.feeBasis,
          taxEnabled: Boolean(payment.tax_enabled),
          taxType:
            payment.tax_type === "PERCENTAGE" || payment.tax_type === "FIXED"
              ? payment.tax_type
              : DEFAULT_PAYMENT_SETTINGS.taxType,
          taxValue: Number(payment.tax_value) || 0,
        }
      : DEFAULT_PAYMENT_SETTINGS,
  };
}

export async function updateShippingSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "shipping.update")) {
    return {
      ok: false,
      error: "You do not have permission to update shipping settings.",
    };
  }

  const parsed = shippingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid shipping settings.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) return { ok: false, error: "No active store found." };

  const { data: existing } = await supabase
    .from("shipping_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const payload = {
    store_id: store.id,
    enabled: values.enabled,
    method: values.method,
    free_shipping_threshold: values.freeShippingThreshold,
    default_shipping_fee: values.defaultShippingFee,
    percentage_rate: values.percentageRate,
    estimated_delivery_min_days: values.estimatedDeliveryMinDays,
    estimated_delivery_max_days: values.estimatedDeliveryMaxDays,
    estimated_delivery_label: values.estimatedDeliveryLabel,
  };

  const { error } = await supabase
    .from("shipping_settings")
    .upsert(payload, { onConflict: "store_id" });

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "SHIPPING_SETTINGS_UPDATE",
      feature: "SHIPPING",
      message: "Could not save shipping settings",
      error,
      databaseCode: error.code,
      storeId: store.id,
      entityType: "shipping_settings",
      entityId: store.id,
      route: SHIPPING_ROUTE,
    });
  }

  const changed = diffChangedKeys(
    existing
      ? {
          enabled: existing.enabled,
          method: existing.method,
          freeShippingThreshold: existing.free_shipping_threshold,
          defaultShippingFee: Number(existing.default_shipping_fee),
          percentageRate: existing.percentage_rate,
        }
      : {},
    {
      enabled: values.enabled,
      method: values.method,
      freeShippingThreshold: values.freeShippingThreshold,
      defaultShippingFee: values.defaultShippingFee,
      percentageRate: values.percentageRate,
    },
  );

  await supabase.from("audit_logs").insert({
    store_id: store.id,
    user_id: admin.user.id,
    action: "SHIPPING_SETTINGS_UPDATED",
    entity_type: "shipping_settings",
    entity_id: store.id,
    metadata: { changed },
  });

  revalidateTag(PRICING_SETTINGS_CACHE_TAG, "max");
  return { ok: true, message: "Shipping settings saved." };
}

export async function updatePaymentSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "payments.update")) {
    return {
      ok: false,
      error: "You do not have permission to update payment settings.",
    };
  }

  const parsed = paymentSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid payment settings.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) return { ok: false, error: "No active store found." };

  const { data: existing } = await supabase
    .from("payment_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const payload = {
    store_id: store.id,
    provider: values.provider,
    fee_enabled: values.feeEnabled,
    fee_type: values.feeType,
    fee_value: values.feeValue,
    fee_basis: values.feeBasis,
    tax_enabled: values.taxEnabled,
    tax_type: values.taxType,
    tax_value: values.taxValue,
  };

  const { error } = await supabase
    .from("payment_settings")
    .upsert(payload, { onConflict: "store_id" });

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "PAYMENT_SETTINGS_UPDATE",
      feature: "SETTINGS",
      message: "Could not save payment settings",
      error,
      databaseCode: error.code,
      storeId: store.id,
      entityType: "payment_settings",
      entityId: store.id,
      route: PAYMENTS_ROUTE,
    });
  }

  const changed = diffChangedKeys(
    existing
      ? {
          provider: existing.provider,
          feeEnabled: existing.fee_enabled,
          feeType: existing.fee_type,
          feeValue: Number(existing.fee_value),
          feeBasis: existing.fee_basis,
          taxEnabled: existing.tax_enabled,
          taxType: existing.tax_type,
          taxValue: Number(existing.tax_value),
        }
      : {},
    {
      provider: values.provider,
      feeEnabled: values.feeEnabled,
      feeType: values.feeType,
      feeValue: values.feeValue,
      feeBasis: values.feeBasis,
      taxEnabled: values.taxEnabled,
      taxType: values.taxType,
      taxValue: values.taxValue,
    },
  );

  await supabase.from("audit_logs").insert({
    store_id: store.id,
    user_id: admin.user.id,
    action: "PAYMENT_SETTINGS_UPDATED",
    entity_type: "payment_settings",
    entity_id: store.id,
    metadata: { changed },
  });

  revalidateTag(PRICING_SETTINGS_CACHE_TAG, "max");
  return { ok: true, message: "Payment settings saved." };
}

import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { majorToMinor } from "@/features/pricing/money";
import type {
  PaymentFeeBasis,
  PaymentFeeConfigInput,
  PaymentFeeType,
  ShippingConfigInput,
  ShippingMethodCode,
  TaxConfigInput,
  TaxType,
} from "@/features/pricing/types";

export const PRICING_SETTINGS_CACHE_TAG = "pricing-settings";

const DEFAULT_SHIPPING: ShippingConfigInput = {
  enabled: false,
  method: "flat_rate",
  freeShippingThresholdMinor: null,
  defaultShippingFeeMinor: 0,
  percentageRate: null,
};

const DEFAULT_PAYMENT_FEE: PaymentFeeConfigInput = {
  enabled: false,
  feeType: "PERCENTAGE",
  feeValue: 0,
  feeBasis: "SUBTOTAL_PLUS_SHIPPING",
};

const DEFAULT_TAX: TaxConfigInput = {
  enabled: false,
  taxType: "PERCENTAGE",
  taxValue: 0,
};

export async function loadStoreCurrency(storeId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_settings")
    .select("currency")
    .eq("store_id", storeId)
    .maybeSingle();
  return data?.currency || "INR";
}

export async function loadShippingConfig(
  storeId: string,
  currency: string,
): Promise<ShippingConfigInput> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("shipping_settings")
    .select(
      "enabled, method, free_shipping_threshold, default_shipping_fee, percentage_rate",
    )
    .eq("store_id", storeId)
    .maybeSingle();

  if (!data) return { ...DEFAULT_SHIPPING };

  return {
    enabled: Boolean(data.enabled),
    method: (data.method as ShippingMethodCode) || "flat_rate",
    freeShippingThresholdMinor:
      data.free_shipping_threshold == null
        ? null
        : majorToMinor(Number(data.free_shipping_threshold), currency),
    defaultShippingFeeMinor: majorToMinor(
      Number(data.default_shipping_fee ?? 0),
      currency,
    ),
    percentageRate:
      data.percentage_rate == null ? null : Number(data.percentage_rate),
  };
}

export async function loadPaymentFeeConfig(
  storeId: string,
  currency: string,
): Promise<{ paymentFee: PaymentFeeConfigInput; tax: TaxConfigInput }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payment_settings")
    .select(
      "fee_enabled, fee_type, fee_value, fee_basis, tax_enabled, tax_type, tax_value",
    )
    .eq("store_id", storeId)
    .maybeSingle();

  if (!data) {
    return { paymentFee: { ...DEFAULT_PAYMENT_FEE }, tax: { ...DEFAULT_TAX } };
  }

  const feeType = (data.fee_type as PaymentFeeType) || "PERCENTAGE";
  const feeValueRaw = Number(data.fee_value ?? 0);
  const feeValue =
    feeType === "FIXED" ? majorToMinor(feeValueRaw, currency) : feeValueRaw;

  const taxType = (data.tax_type as TaxType) || "PERCENTAGE";
  const taxValueRaw = Number(data.tax_value ?? 0);
  const taxValue =
    taxType === "FIXED" ? majorToMinor(taxValueRaw, currency) : taxValueRaw;

  return {
    paymentFee: {
      enabled: Boolean(data.fee_enabled),
      feeType,
      feeValue,
      feeBasis:
        (data.fee_basis as PaymentFeeBasis) || "SUBTOTAL_PLUS_SHIPPING",
    },
    tax: {
      enabled: Boolean(data.tax_enabled),
      taxType,
      taxValue,
    },
  };
}

export async function loadPricingContext(storeId?: string | null): Promise<{
  storeId: string | null;
  currency: string;
  shipping: ShippingConfigInput;
  paymentFee: PaymentFeeConfigInput;
  tax: TaxConfigInput;
}> {
  const resolved = storeId ?? (await resolveActiveStoreId());
  if (!resolved) {
    return {
      storeId: null,
      currency: "INR",
      shipping: { ...DEFAULT_SHIPPING },
      paymentFee: { ...DEFAULT_PAYMENT_FEE },
      tax: { ...DEFAULT_TAX },
    };
  }

  const currency = await loadStoreCurrency(resolved);
  const [shipping, fees] = await Promise.all([
    loadShippingConfig(resolved, currency),
    loadPaymentFeeConfig(resolved, currency),
  ]);

  return {
    storeId: resolved,
    currency,
    shipping,
    paymentFee: fees.paymentFee,
    tax: fees.tax,
  };
}

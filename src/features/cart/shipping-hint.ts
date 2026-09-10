"use server";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  loadShippingConfig,
  loadStoreCurrency,
} from "@/features/pricing/config";
import { minorToMajor } from "@/features/pricing/money";

export type FreeShippingHint = {
  enabled: boolean;
  thresholdMajor: number | null;
  currency: string;
};

/** Client-safe shipping hint for cart free-delivery progress. */
export async function getFreeShippingHintAction(): Promise<FreeShippingHint> {
  try {
    const storeId = await resolveActiveStoreId();
    if (!storeId) {
      return { enabled: false, thresholdMajor: null, currency: "INR" };
    }
    const currency = await loadStoreCurrency(storeId);
    const shipping = await loadShippingConfig(storeId, currency);
    return {
      enabled: shipping.enabled,
      thresholdMajor:
        shipping.freeShippingThresholdMinor == null
          ? null
          : minorToMajor(shipping.freeShippingThresholdMinor, currency),
      currency,
    };
  } catch {
    return { enabled: false, thresholdMajor: null, currency: "INR" };
  }
}

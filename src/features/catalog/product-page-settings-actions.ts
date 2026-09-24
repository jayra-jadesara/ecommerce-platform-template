"use server";

import { updateProductPageSettings } from "@/features/catalog/product-page-settings-service";

export async function updateProductPageSettingsAction(input: unknown) {
  return updateProductPageSettings(input);
}

"use server";

import { updateStoreThemeSettings } from "@/features/admin/theme/update-service";

export async function saveThemeSettingsAction(input: unknown) {
  return updateStoreThemeSettings(input);
}

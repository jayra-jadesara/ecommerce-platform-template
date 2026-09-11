"use server";

import { getAdminPath } from "@/config/admin-route";
import { updateStoreThemeSettings } from "@/features/admin/theme/update-service";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

export async function saveThemeSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "THEME_UPDATE",
      feature: "THEME",
      route: getAdminPath("/settings/theme"),
    },
    () => updateStoreThemeSettings(input),
  );
}

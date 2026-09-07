"use server";

import { updateGeneralStoreSettings } from "@/features/admin/settings/update-general";
import {
  updateBrandingSettings,
  uploadBrandingImage,
  type BrandingUploadKind,
} from "@/features/admin/settings/update-branding";
import {
  updateFooterSettings,
  updateHeaderSettings,
} from "@/features/admin/settings/update-header-footer";
import { updateSeoSettings } from "@/features/admin/settings/update-seo";
import { updateNavigationSettings } from "@/features/admin/settings/update-navigation";

export async function saveGeneralSettingsAction(input: unknown) {
  return updateGeneralStoreSettings(input);
}

export async function saveBrandingSettingsAction(input: unknown) {
  return updateBrandingSettings(input);
}

export async function uploadBrandingImageAction(
  kind: BrandingUploadKind,
  formData: FormData,
) {
  return uploadBrandingImage(kind, formData);
}

export async function saveHeaderSettingsAction(input: unknown) {
  return updateHeaderSettings(input);
}

export async function saveFooterSettingsAction(input: unknown) {
  return updateFooterSettings(input);
}

export async function saveSeoSettingsAction(input: unknown) {
  return updateSeoSettings(input);
}

export async function saveNavigationSettingsAction(input: unknown) {
  return updateNavigationSettings(input);
}

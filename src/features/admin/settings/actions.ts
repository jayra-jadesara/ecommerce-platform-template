"use server";

import { getAdminPath } from "@/config/admin-route";
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
import {
  updatePaymentSettings,
  updateShippingSettings,
} from "@/features/admin/settings/update-shipping-payment";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

export async function saveGeneralSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "STORE_SETTINGS_UPDATE",
      feature: "SETTINGS",
      route: getAdminPath("/settings/general"),
    },
    () => updateGeneralStoreSettings(input),
  );
}

export async function saveBrandingSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "BRANDING_UPDATE",
      feature: "BRANDING",
      route: getAdminPath("/settings/branding"),
    },
    () => updateBrandingSettings(input),
  );
}

export async function uploadBrandingImageAction(
  kind: BrandingUploadKind,
  formData: FormData,
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "BRANDING_UPLOAD",
      feature: "BRANDING",
      route: getAdminPath("/settings/branding"),
    },
    () => uploadBrandingImage(kind, formData),
  );
}

export async function saveHeaderSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "HEADER_SETTINGS_UPDATE",
      feature: "SETTINGS",
      route: getAdminPath("/settings/header"),
    },
    () => updateHeaderSettings(input),
  );
}

export async function saveFooterSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "FOOTER_SETTINGS_UPDATE",
      feature: "SETTINGS",
      route: getAdminPath("/settings/footer"),
    },
    () => updateFooterSettings(input),
  );
}

export async function saveSeoSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "SEO_UPDATE",
      feature: "SEO",
      route: getAdminPath("/settings/seo"),
    },
    () => updateSeoSettings(input),
  );
}

export async function saveNavigationSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "NAVIGATION_UPDATE",
      feature: "NAVIGATION",
      route: getAdminPath("/settings/navigation"),
    },
    () => updateNavigationSettings(input),
  );
}

export async function saveShippingSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "SHIPPING_SETTINGS_UPDATE",
      feature: "SHIPPING",
      route: getAdminPath("/settings/shipping"),
    },
    () => updateShippingSettings(input),
  );
}

export async function savePaymentSettingsAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "PAYMENT_SETTINGS_UPDATE",
      feature: "SETTINGS",
      route: getAdminPath("/settings/payments"),
    },
    () => updatePaymentSettings(input),
  );
}

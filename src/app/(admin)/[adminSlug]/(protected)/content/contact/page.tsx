import { requireAnyPermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { loadGeneralSettingsForm } from "@/features/admin/settings/load-forms";
import {
  DEFAULT_CONTACT_CONTENT,
  type ContactContentFormValues,
} from "@/features/admin/settings/contact-content-schema";
import { ContactContentForm } from "@/features/cms/components/ContactContentForm";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
} from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function AdminContentContactPage() {
  const admin = await requireAnyPermission([
    "content.view",
    "cms.view",
    "settings.view",
  ]);
  const { values } = await loadGeneralSettingsForm();

  const initialValues: ContactContentFormValues = {
    contactPageHeading:
      values.contactPageHeading || DEFAULT_CONTACT_CONTENT.contactPageHeading,
    contactPageSupport:
      values.contactPageSupport || DEFAULT_CONTACT_CONTENT.contactPageSupport,
    contactBannerEnabled: values.contactBannerEnabled,
    contactBannerImagePath: values.contactBannerImagePath,
    contactSpotlightEnabled: values.contactSpotlightEnabled,
    contactSpotlightImagePath: values.contactSpotlightImagePath,
    contactMapEnabled: values.contactMapEnabled ?? true,
    contactMapEmbedUrl: values.contactMapEmbedUrl ?? null,
    contactEmail: values.contactEmail,
    contactPhone: values.contactPhone,
    contactPhoneSecondary: values.contactPhoneSecondary,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    city: values.city,
    state: values.state,
    postalCode: values.postalCode,
    country: values.country,
  };

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Contact"
        description="Storefront /contact — heading, brand panel, map, and message form."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Contact" },
        ]}
      />
      <ContactContentForm
        initialValues={initialValues}
        phoneCountryCode={
          values.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE
        }
        storeCountry={values.country || DEFAULT_STORE_COUNTRY}
        canUpdate={
          hasPermission(admin, "content.update") ||
          hasPermission(admin, "settings.update")
        }
      />
    </div>
  );
}

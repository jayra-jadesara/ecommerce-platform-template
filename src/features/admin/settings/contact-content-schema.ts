import { z } from "zod";
import {
  optionalEmail,
  optionalPhone,
} from "@/features/admin/settings/validation";
import {
  extractGoogleMapsEmbedSrc,
  isAllowedGoogleMapsEmbed,
} from "@/lib/google-maps-embed";
import { DEFAULT_STORE_COUNTRY } from "@/lib/phone";

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v.trim());

/** Content → Contact page editor (store_settings fields). */
export const contactContentSchema = z.object({
  contactPageHeading: optionalLine(80),
  contactPageSupport: optionalLine(160),
  contactBannerEnabled: z.boolean(),
  contactBannerImagePath: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const trimmed = typeof v === "string" ? v.trim() : "";
      return trimmed ? trimmed : null;
    }),
  contactSpotlightEnabled: z.boolean(),
  contactSpotlightImagePath: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const trimmed = typeof v === "string" ? v.trim() : "";
      return trimmed ? trimmed : null;
    }),
  contactMapEnabled: z.boolean(),
  contactMapEmbedUrl: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) return null;
      const extracted = extractGoogleMapsEmbedSrc(String(v));
      return extracted || null;
    })
    .refine((v) => !v || isAllowedGoogleMapsEmbed(v), {
      message:
        "Paste a Google Maps embed URL (Share → Embed a map → copy the src).",
    }),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  contactPhoneSecondary: optionalPhone,
  addressLine1: optionalLine(160),
  addressLine2: optionalLine(160),
  city: optionalLine(80),
  state: optionalLine(80),
  postalCode: optionalLine(32),
  country: optionalLine(80),
});

export type ContactContentFormValues = z.infer<typeof contactContentSchema>;

export const DEFAULT_CONTACT_CONTENT: ContactContentFormValues = {
  contactPageHeading: "Let’s connect",
  contactPageSupport: "Our representative will get back to you shortly",
  contactBannerEnabled: false,
  contactBannerImagePath: null,
  contactSpotlightEnabled: false,
  contactSpotlightImagePath: null,
  contactMapEnabled: true,
  contactMapEmbedUrl: null,
  contactEmail: "",
  contactPhone: "",
  contactPhoneSecondary: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_STORE_COUNTRY,
};

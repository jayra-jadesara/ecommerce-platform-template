/** Admin dropdown options for store location, locale, currency, and timezone. */

export const STORE_COUNTRIES = [
  { value: "India", label: "India" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Singapore", label: "Singapore" },
  { value: "Other", label: "Other" },
] as const;

export const STORE_CURRENCIES = [
  { value: "INR", label: "Indian Rupee (₹) — INR" },
  { value: "USD", label: "US Dollar ($) — USD" },
  { value: "AED", label: "UAE Dirham — AED" },
  { value: "GBP", label: "British Pound (£) — GBP" },
  { value: "EUR", label: "Euro (€) — EUR" },
  { value: "SGD", label: "Singapore Dollar — SGD" },
] as const;

export const STORE_LOCALES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "gu-IN", label: "Gujarati (India)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "ar-AE", label: "Arabic (UAE)" },
] as const;

export const STORE_TIMEZONES = [
  { value: "Asia/Kolkata", label: "India (Asia/Kolkata) — IST" },
  { value: "Asia/Dubai", label: "UAE (Asia/Dubai) — GST" },
  { value: "Asia/Singapore", label: "Singapore (Asia/Singapore)" },
  { value: "Europe/London", label: "United Kingdom (Europe/London)" },
  { value: "America/New_York", label: "US Eastern (America/New_York)" },
  { value: "UTC", label: "UTC" },
] as const;

/** Indian states / union territories (common store list). */
export const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** Major cities by Indian state — focused coverage for merchant forms. */
export const INDIA_CITIES_BY_STATE: Record<string, readonly string[]> = {
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Bhavnagar",
    "Jamnagar",
    "Gandhinagar",
    "Junagadh",
    "Morbi",
    "Anand",
    "Mehsana",
    "Metoda",
  ],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"],
  Delhi: ["New Delhi", "Delhi"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Warangal"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi"],
  Punjab: ["Chandigarh", "Ludhiana", "Amritsar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur"],
  Goa: ["Panaji", "Margao", "Vasco da Gama"],
};

export function citiesForState(state: string): readonly string[] {
  return INDIA_CITIES_BY_STATE[state] ?? [];
}

/** Sensible defaults when country/timezone change. */
export function defaultsForCountry(country: string): {
  timezone: string;
  defaultLocale: string;
  currency: string;
} {
  switch (country) {
    case "India":
      return {
        timezone: "Asia/Kolkata",
        defaultLocale: "en-IN",
        currency: "INR",
      };
    case "United Arab Emirates":
      return {
        timezone: "Asia/Dubai",
        defaultLocale: "ar-AE",
        currency: "AED",
      };
    case "United States":
      return {
        timezone: "America/New_York",
        defaultLocale: "en-US",
        currency: "USD",
      };
    case "United Kingdom":
      return {
        timezone: "Europe/London",
        defaultLocale: "en-GB",
        currency: "GBP",
      };
    case "Singapore":
      return {
        timezone: "Asia/Singapore",
        defaultLocale: "en-US",
        currency: "SGD",
      };
    default:
      return {
        timezone: "UTC",
        defaultLocale: "en-IN",
        currency: "INR",
      };
  }
}

export function normalizeSelectValue(
  value: string | null | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  const trimmed = String(value ?? "").trim();
  if (allowed.includes(trimmed)) return trimmed;
  return fallback;
}

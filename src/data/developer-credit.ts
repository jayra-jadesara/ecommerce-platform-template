import creditJson from "@/data/developer-credit.json";

/**
 * Single source for store + admin developer / studio credit.
 * Edit `src/data/developer-credit.json` only.
 */
export type DeveloperCreditInfo = {
  enabled: boolean;
  label: string;
  company: string;
  tagline: string;
  email: string;
  phone: string;
  phoneHref: string;
  website: string | null;
  ctaLabel: string;
};

export const developerCredit = creditJson as DeveloperCreditInfo;

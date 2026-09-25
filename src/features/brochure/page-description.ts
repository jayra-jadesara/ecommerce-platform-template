/** Max length matches store_settings.brochure_page_description constraint. */
export const BROCHURE_PAGE_DESCRIPTION_MAX = 320;

export function normalizeBrochurePageDescription(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BROCHURE_PAGE_DESCRIPTION_MAX);
}

export function defaultBrochurePageDescription(brandName: string): string {
  const name = brandName.trim() || "our store";
  return `Download catalogues and product sheets from ${name}.`;
}

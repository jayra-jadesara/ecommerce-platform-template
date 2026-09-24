/** Stable seeded PDP section ids — also map to legacy product columns. */
export const PRODUCT_SECTION_DESCRIPTION = "description";
export const PRODUCT_SECTION_HOW_TO_USE = "how_to_use";
export const PRODUCT_SECTION_INGREDIENTS = "ingredients";

export type ProductDetailSectionDef = {
  id: string;
  heading: string;
  sortOrder: number;
  active: boolean;
};

export type ProductFaqQuestionDef = {
  id: string;
  question: string;
  sortOrder: number;
  active: boolean;
};

export type ProductPageSettings = {
  sections: ProductDetailSectionDef[];
  faqHeading: string;
  faqQuestions: ProductFaqQuestionDef[];
  /** Hero banner on /products (listing), not on individual PDPs. */
  listingBannerEnabled: boolean;
  listingBannerImagePath: string | null;
};

export const DEFAULT_PRODUCT_DETAIL_SECTIONS: ProductDetailSectionDef[] = [
  {
    id: PRODUCT_SECTION_DESCRIPTION,
    heading: "Description",
    sortOrder: 0,
    active: true,
  },
  {
    id: PRODUCT_SECTION_HOW_TO_USE,
    heading: "How to use",
    sortOrder: 1,
    active: true,
  },
  {
    id: PRODUCT_SECTION_INGREDIENTS,
    heading: "Ingredients",
    sortOrder: 2,
    active: true,
  },
];

export const DEFAULT_PRODUCT_FAQ_HEADING = "FAQs";

export type ReelProductLink = {
  id: string;
  name: string;
  slug: string;
  minPrice: number | null;
  imageUrl?: string;
};

export type StoreReel = {
  id: string;
  storeId: string;
  title: string;
  instagramUrl: string | null;
  videoPath: string | null;
  sortOrder: number;
  isActive: boolean;
  showOnHome: boolean;
  showOnProductPage: boolean;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** Storefront payload — hosted MP4 + product footers. */
export type StorefrontReel = {
  id: string;
  title: string;
  instagramUrl: string | null;
  videoUrl: string;
  productCtaLabel: string;
  sortOrder: number;
  products: ReelProductLink[];
};

export type ReelsShowcaseSettings = {
  productCtaLabel: import("@/features/reels/schemas").ReelProductCtaLabel;
  showcaseLimit: number;
  autoplayMuted: boolean;
  productPageHeading: string;
  visibleSlides: number;
};

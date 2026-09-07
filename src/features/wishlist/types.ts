import type { StockStatus } from "@/features/catalog/stock";

export type WishlistLineView = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSlug: string;
  variantName: string | null;
  unitPrice: number | null;
  imageUrl: string | null;
  imageAlt: string;
  stockStatus: StockStatus | "UNAVAILABLE";
  canAddToCart: boolean;
};

export type WishlistView = {
  id: string | null;
  storeId: string | null;
  items: WishlistLineView[];
  currency: string;
};

export type WishlistMutationResult =
  | { ok: true; wishlist: WishlistView; message?: string; inWishlist?: boolean }
  | { ok: false; error: string };

export function emptyWishlistView(currency = "INR"): WishlistView {
  return {
    id: null,
    storeId: null,
    items: [],
    currency,
  };
}

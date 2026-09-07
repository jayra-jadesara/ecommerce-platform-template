import { WishlistPageClient } from "@/features/wishlist/components/WishlistPageClient";
import { getWishlist } from "@/features/wishlist/service";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const wishlist = await getWishlist();

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Wishlist
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Saved products for this store. Availability is checked when you add to
        cart.
      </p>
      <div className="mt-6">
        <WishlistPageClient initialWishlist={wishlist} />
      </div>
    </div>
  );
}

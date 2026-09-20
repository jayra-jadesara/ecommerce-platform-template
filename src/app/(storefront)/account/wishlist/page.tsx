import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { WishlistPageClient } from "@/features/wishlist/components/WishlistPageClient";
import { getWishlist } from "@/features/wishlist/service";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const wishlist = await getWishlist();

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]">
          <FavoriteBorderRoundedIcon className="!text-lg" aria-hidden />
        </span>
        <div className="min-w-0">
          <StorefrontHeading
            title="Wishlist"
            as="h2"
            align="left"
            className="!text-xl"
          />
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Saved products · availability checked when you add to cart
          </p>
        </div>
      </div>
      <div className="mt-4">
        <WishlistPageClient initialWishlist={wishlist} />
      </div>
    </div>
  );
}

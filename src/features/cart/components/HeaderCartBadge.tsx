import { HeaderCartControl } from "@/features/cart/components/HeaderCartControl";
import { getCartItemCount } from "@/features/cart/service";

/**
 * Streams cart badge count after the storefront shell paints.
 * Keeps slow Supabase Auth/DB off the critical layout path.
 */
export async function HeaderCartBadge() {
  const initialCartCount = await getCartItemCount().catch(() => 0);
  return <HeaderCartControl initialCartCount={initialCartCount} />;
}

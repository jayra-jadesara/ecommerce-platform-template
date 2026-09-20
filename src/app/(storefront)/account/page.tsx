import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Link from "next/link";
import type { ReactNode } from "react";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getCustomerAddresses } from "@/features/addresses/service";
import { getCurrentUser } from "@/features/auth/session";
import { listCustomerOrders } from "@/features/orders/queries";
import { listCustomerPayments } from "@/features/payments/list-customer-payments";
import { getWishlist } from "@/features/wishlist/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

type QuickLink = {
  href: string;
  label: string;
  hint: string;
  meta: string;
  icon: ReactNode;
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  const [profileResult, addresses, wishlist, orders, payments] =
    await Promise.all([
      user
        ? supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getCustomerAddresses(),
      getWishlist(),
      user
        ? listCustomerOrders({ userId: user.id, page: 1, pageSize: 1 })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 1 }),
      user
        ? listCustomerPayments({ userId: user.id, page: 1, pageSize: 1 })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 1 }),
    ]);

  const profile = profileResult.data;
  const name = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const welcome = name ? `Welcome, ${name}` : "Welcome";

  const links: QuickLink[] = [
    {
      href: "/account/profile",
      label: "Profile",
      hint: "Name, mobile & recovery",
      meta: name || "Complete your profile",
      icon: <PersonOutlineRoundedIcon className="!text-[1.15rem]" aria-hidden />,
    },
    {
      href: "/account/wishlist",
      label: "Wishlist",
      hint: "Saved products",
      meta:
        wishlist.items.length === 0
          ? "No saved items"
          : `${wishlist.items.length} saved`,
      icon: (
        <FavoriteBorderRoundedIcon className="!text-[1.15rem]" aria-hidden />
      ),
    },
    {
      href: "/account/addresses",
      label: "Addresses",
      hint: "Delivery locations",
      meta:
        addresses.length === 0
          ? "Add a delivery address"
          : `${addresses.length} saved`,
      icon: (
        <LocalShippingOutlinedIcon className="!text-[1.15rem]" aria-hidden />
      ),
    },
    {
      href: "/account/orders",
      label: "Orders",
      hint: "Track & history",
      meta: orders.total === 0 ? "No orders yet" : `${orders.total} orders`,
      icon: <ReceiptLongOutlinedIcon className="!text-[1.15rem]" aria-hidden />,
    },
    {
      href: "/account/payments",
      label: "Payments",
      hint: "Receipts & status",
      meta:
        payments.total === 0 ? "No payments yet" : `${payments.total} payments`,
      icon: <PaymentsOutlinedIcon className="!text-[1.15rem]" aria-hidden />,
    },
  ];

  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-3.5 shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-sm font-bold tracking-wide text-[var(--color-primary)]">
          {(name || user?.email || "A")
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("") || "A"}
        </span>
        <div className="min-w-0">
          <StorefrontHeading
            title={welcome}
            as="h2"
            align="left"
            className="!text-xl"
          />
          <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
            {user?.email}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          Quick links
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 transition-colors",
                  "hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-card))]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                )}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)] transition-colors group-hover:bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--color-foreground)]">
                      {item.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--color-muted)]">
                    {item.meta} · {item.hint}
                  </span>
                </span>
                <ChevronRightRoundedIcon
                  className="!text-lg shrink-0 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { BackLink } from "@/components/layout/BackLink";
import { Container } from "@/components/layout/Container";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { requireUser } from "@/features/auth/session";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { cn } from "@/lib/cn";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Account");

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/payments", label: "Payments" },
];

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();

  return (
    <Container className="flex flex-1 flex-col gap-8 py-8 md:flex-row md:py-12">
      <aside className="w-full shrink-0 md:w-56">
        <div className="mb-3">
          <BackLink href="/" label="Back to store" />
        </div>
        <StorefrontHeading
          title="My account"
          as="h1"
          align="left"
          className="!text-xl"
        />
        <nav className="mt-4 flex flex-row gap-1 overflow-x-auto md:flex-col" aria-label="Account">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 px-1">
            <LogoutButton variant="outlined" />
          </div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}

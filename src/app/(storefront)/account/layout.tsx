import type { ReactNode } from "react";
import type { Metadata } from "next";
import { BackLink } from "@/components/layout/BackLink";
import { Container } from "@/components/layout/Container";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { AccountSidebarNav } from "@/features/account/components/AccountSidebarNav";
import { requireUser } from "@/features/auth/session";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Account");

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
        <AccountSidebarNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}

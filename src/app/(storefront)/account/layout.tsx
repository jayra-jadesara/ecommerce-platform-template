import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Container, StorefrontBreadcrumb } from "@/components/layout";
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
    <Container className="flex flex-1 flex-col gap-6 py-6 md:flex-row md:gap-8 md:py-8">
      <aside className="w-full shrink-0 md:w-[13.5rem]">
        <StorefrontBreadcrumb
          className="!mb-3"
          items={[
            { label: "Home", href: "/" },
            { label: "Account" },
          ]}
        />
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)] md:p-3.5">
          <StorefrontHeading
            title="My account"
            as="h1"
            align="left"
            className="!text-lg"
          />
          <AccountSidebarNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}

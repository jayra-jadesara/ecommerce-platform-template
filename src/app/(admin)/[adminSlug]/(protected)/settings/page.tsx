import Link from "next/link";
import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

const MODULES: Array<{
  href: string;
  title: string;
  description: string;
  permission: Permission;
}> = [
  {
    href: "/settings/general",
    title: "Store Information",
    description: "Store name, contact details, currency and social links.",
    permission: "settings.view",
  },
  {
    href: "/settings/branding",
    title: "Logo & Branding",
    description: "Manage your logo, favicon and brand identity.",
    permission: "branding.view",
  },
  {
    href: "/settings/theme",
    title: "Appearance",
    description: "Change your store colors, light/dark mode and visual style.",
    permission: "theme.view",
  },
  {
    href: "/settings/navigation",
    title: "Menu & Navigation",
    description: "Choose which pages appear in your store menu.",
    permission: "navigation.view",
  },
  {
    href: "/settings/shipping",
    title: "Shipping",
    description: "Set delivery charges and free-shipping rules.",
    permission: "shipping.view",
  },
  {
    href: "/settings/payments",
    title: "Payments",
    description: "Configure how customers pay and any checkout fees.",
    permission: "payments.view",
  },
  {
    href: "/settings/seo",
    title: "Google & SEO",
    description: "Control how your store appears in Google and when shared online.",
    permission: "seo.view",
  },
  {
    href: "/settings/header",
    title: "Header layout",
    description: "Announcement bar, sticky header and logo size.",
    permission: "settings.view",
  },
  {
    href: "/settings/footer",
    title: "Footer layout",
    description: "Footer text and which contact details to show.",
    permission: "settings.view",
  },
];

const HUB_PERMISSIONS: Permission[] = [
  "settings.view",
  "branding.view",
  "navigation.view",
  "seo.view",
  "theme.view",
  "shipping.view",
  "payments.view",
];

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const canOpenHub = HUB_PERMISSIONS.some((permission) =>
    hasPermission(admin, permission),
  );
  if (!canOpenHub) {
    redirect(getAdminPath("/unauthorized"));
  }

  const visible = MODULES.filter((mod) => hasPermission(admin, mod.permission));

  return (
    <div>
      <AdminPageHeader
        title="Store Settings"
        description="Manage your store information, appearance, delivery and payment options."
        breadcrumbs={[
          { label: "Store Settings" },
        ]}
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.map((mod) => (
          <li key={mod.href}>
            <Link
              href={getAdminPath(mod.href)}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5 transition-colors hover:border-[var(--color-primary)]"
            >
              <p className="font-medium">{mod.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {mod.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

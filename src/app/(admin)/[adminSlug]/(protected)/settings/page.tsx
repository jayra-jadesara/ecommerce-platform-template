import Link from "next/link";
import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MODULES: Array<{
  href: string;
  title: string;
  description: string;
  permission: Permission;
}> = [
  {
    href: "/settings/general",
    title: "General",
    description: "Store identity, contact, currency, social links",
    permission: "settings.view",
  },
  {
    href: "/settings/branding",
    title: "Branding",
    description: "Brand name, logos, favicon, social image",
    permission: "branding.view",
  },
  {
    href: "/settings/header",
    title: "Header",
    description: "Sticky header, announcement bar, logo size",
    permission: "settings.view",
  },
  {
    href: "/settings/footer",
    title: "Footer",
    description: "Footer content, contact and social visibility",
    permission: "settings.view",
  },
  {
    href: "/settings/navigation",
    title: "Navigation",
    description: "Header and footer menus",
    permission: "navigation.view",
  },
  {
    href: "/settings/seo",
    title: "SEO",
    description: "Titles, descriptions, robots, Open Graph",
    permission: "seo.view",
  },
  {
    href: "/settings/theme",
    title: "Theme",
    description: "Colors, appearance modes, typography, animation",
    permission: "theme.view",
  },
  {
    href: "/settings/shipping",
    title: "Shipping",
    description: "Flat fees, free-shipping threshold, delivery estimates",
    permission: "shipping.view",
  },
  {
    href: "/settings/payments",
    title: "Payments",
    description: "Gateway fee and tax business settings (no secrets)",
    permission: "payments.view",
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
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Settings
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Configure store identity, chrome, navigation, SEO, and theme without
        code changes.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {visible.map((mod) => (
          <li key={mod.href}>
            <Link
              href={getAdminPath(mod.href)}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5 hover:border-[var(--color-primary)]"
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

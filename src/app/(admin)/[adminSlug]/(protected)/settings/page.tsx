import Link from "next/link";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import TravelExploreOutlinedIcon from "@mui/icons-material/TravelExploreOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import VerticalAlignBottomOutlinedIcon from "@mui/icons-material/VerticalAlignBottomOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminCard } from "@/features/admin/ui/AdminCard";
import { adminPageStack } from "@/features/admin/ui/admin-classes";

export const dynamic = "force-dynamic";

const MODULES: Array<{
  href: string;
  title: string;
  description: string;
  permission: Permission;
  icon: SvgIconComponent;
}> = [
  {
    href: "/settings/general",
    title: "Store Information",
    description: "Name, contact details, currency, and social links.",
    permission: "settings.view",
    icon: StorefrontOutlinedIcon,
  },
  {
    href: "/settings/branding",
    title: "Logo & Branding",
    description: "Logo, favicon, and brand identity assets.",
    permission: "branding.view",
    icon: BrushOutlinedIcon,
  },
  {
    href: "/settings/theme",
    title: "Appearance",
    description: "Customize colors, typography, dark mode and visual style.",
    permission: "theme.view",
    icon: PaletteOutlinedIcon,
  },
  {
    href: "/settings/navigation",
    title: "Menu & Navigation",
    description: "Choose which pages appear in your store menu.",
    permission: "navigation.view",
    icon: MenuOutlinedIcon,
  },
  {
    href: "/settings/shipping",
    title: "Shipping",
    description: "Delivery charges and free-shipping rules.",
    permission: "shipping.view",
    icon: LocalShippingOutlinedIcon,
  },
  {
    href: "/settings/payments",
    title: "Payments",
    description: "How customers pay and any checkout fees.",
    permission: "payments.view",
    icon: PaymentsOutlinedIcon,
  },
  {
    href: "/settings/coupons",
    title: "Coupons",
    description: "Discount codes for checkout.",
    permission: "coupons.view",
    icon: LocalOfferOutlinedIcon,
  },
  {
    href: "/settings/seo",
    title: "Google & SEO",
    description: "How your store appears in search and social sharing.",
    permission: "seo.view",
    icon: TravelExploreOutlinedIcon,
  },
  {
    href: "/settings/header",
    title: "Header layout",
    description: "Announcement bar, sticky header, and logo size.",
    permission: "settings.view",
    icon: ViewAgendaOutlinedIcon,
  },
  {
    href: "/settings/footer",
    title: "Footer layout",
    description: "Footer text and which contact details to show.",
    permission: "settings.view",
    icon: VerticalAlignBottomOutlinedIcon,
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
  "coupons.view",
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
    <div className={adminPageStack()}>
      <AdminPageHeader
        title="Store Settings"
        description="Manage how your store looks, works and appears to customers."
        breadcrumbs={[{ label: "Store Settings" }]}
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((mod) => {
          const Icon = mod.icon;
          return (
            <li key={mod.href}>
              <Link href={getAdminPath(mod.href)} className="group block h-full">
                <AdminCard interactive className="h-full">
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                    <Icon fontSize="small" />
                  </span>
                  <p className="font-semibold tracking-tight group-hover:text-[var(--color-primary)]">
                    {mod.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                    {mod.description}
                  </p>
                </AdminCard>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

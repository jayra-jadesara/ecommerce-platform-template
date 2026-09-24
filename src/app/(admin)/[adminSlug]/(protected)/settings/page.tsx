import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
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
import { adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type SettingsModule = {
  href: string;
  title: string;
  description: string;
  /** Any of these grants the hub card (aligned with page route rules). */
  permissions: Permission[];
  icon: SvgIconComponent;
};

type SettingsGroup = {
  id: string;
  label: string;
  modules: SettingsModule[];
};

const GROUPS: SettingsGroup[] = [
  {
    id: "identity",
    label: "Identity & brand",
    modules: [
      {
        href: "/settings/general",
        title: "Store Information",
        description: "Name, contact, currency, social",
        permissions: ["settings.view"],
        icon: StorefrontOutlinedIcon,
      },
      {
        href: "/settings/branding",
        title: "Logo & Branding",
        description: "Logo, favicon, brand assets",
        permissions: ["branding.view"],
        icon: BrushOutlinedIcon,
      },
      {
        href: "/settings/theme",
        title: "Appearance",
        description: "Colors, type, dark mode",
        permissions: ["theme.view"],
        icon: PaletteOutlinedIcon,
      },
    ],
  },
  {
    id: "commerce",
    label: "Selling & checkout",
    modules: [
      {
        href: "/settings/shipping",
        title: "Shipping",
        description: "Delivery, courier, returns",
        permissions: ["shipping.view"],
        icon: LocalShippingOutlinedIcon,
      },
      {
        href: "/settings/payments",
        title: "Payments",
        description: "Pay method, fee & tax",
        permissions: ["payments.view"],
        icon: PaymentsOutlinedIcon,
      },
      {
        href: "/settings/coupons",
        title: "Coupons",
        description: "Discount codes",
        permissions: ["coupons.view"],
        icon: LocalOfferOutlinedIcon,
      },
    ],
  },
  {
    id: "storefront",
    label: "Storefront & discovery",
    modules: [
      {
        href: "/settings/navigation",
        title: "Menu & Navigation",
        description: "Store menu pages",
        permissions: ["navigation.view"],
        icon: MenuOutlinedIcon,
      },
      {
        href: "/settings/seo",
        title: "Google & SEO",
        description: "Search & social sharing",
        permissions: ["seo.view"],
        icon: TravelExploreOutlinedIcon,
      },
      {
        href: "/settings/header",
        title: "Header layout",
        description: "Bar, sticky, logo size",
        permissions: ["settings_header.view", "settings.view"],
        icon: ViewAgendaOutlinedIcon,
      },
      {
        href: "/settings/footer",
        title: "Footer layout",
        description: "Footer text & contacts",
        permissions: ["settings_footer.view", "settings.view"],
        icon: VerticalAlignBottomOutlinedIcon,
      },
    ],
  },
];

const HUB_PERMISSIONS: Permission[] = [
  "settings.view",
  "settings_header.view",
  "settings_footer.view",
  "platform.view",
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

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    modules: group.modules.filter((mod) =>
      mod.permissions.some((permission) => hasPermission(admin, permission)),
    ),
  })).filter((group) => group.modules.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="[&>header]:mb-2 [&>header]:space-y-1.5">
        <AdminPageHeader
          title="Store Settings"
          description="Identity, checkout, and storefront — in one place."
          breadcrumbs={[{ label: "Store Settings" }]}
        />
      </div>

      <div className="flex flex-col gap-4">
        {visibleGroups.map((group) => (
          <section key={group.id} className="space-y-2">
            <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {group.label}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {group.modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <li key={mod.href}>
                    <Link
                      href={getAdminPath(mod.href)}
                      className="group block h-full focus-visible:outline-none"
                    >
                      <div
                        className={cn(
                          adminCard(),
                          "flex h-full items-start gap-3 px-3.5 py-3 transition-[border-color,box-shadow] duration-150",
                          "hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                          "hover:shadow-[0_6px_16px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]",
                          "group-focus-visible:border-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-border))]",
                          "group-focus-visible:ring-2 group-focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_28%,transparent)]",
                        )}
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                          <Icon sx={{ fontSize: 18 }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary)]">
                              {mod.title}
                            </p>
                            <ArrowForwardRoundedIcon
                              className="shrink-0 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[var(--color-primary)]"
                              sx={{ fontSize: 16 }}
                            />
                          </div>
                          <p className="mt-0.5 truncate text-xs leading-snug text-[var(--color-muted)]">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminCard } from "@/features/admin/ui/AdminCard";
import { adminBtn, adminPageStack } from "@/features/admin/ui/admin-classes";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStoreSetupChecklist } from "@/features/admin/setup/checklist";
import { AdminSetupChecklist } from "@/features/admin/setup/AdminSetupChecklist";
import { getAdminDashboardStats } from "@/features/admin/dashboard-stats";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { countStoreCustomers } from "@/features/customers/service";
import { formatMoney } from "@/features/catalog/money";
import { orderStatusLabel } from "@/features/orders/state-machine";
import { APP_VERSION } from "@/config/version";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function displayName(email: string | null | undefined) {
  if (!email) return "Admin";
  const local = email.split("@")[0] ?? "Admin";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default async function AdminDashboardPage() {
  const admin = await requirePermission("dashboard.view");
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const setup = await getStoreSetupChecklist();
  const name = displayName(admin.user.email);

  const canProducts = hasPermission(admin, "products.create");
  const canOrders = hasPermission(admin, "orders.view");
  const canCms = hasPermission(admin, "cms.view");
  const canTheme = hasPermission(admin, "theme.view");
  const storeId = await resolveActiveStoreId();

  const [customerCount, overview] = await Promise.all([
    hasPermission(admin, "customers.view")
      ? countStoreCustomers(storeId)
      : Promise.resolve(0),
    getAdminDashboardStats(storeId),
  ]);

  const stats = [
    {
      label: "Revenue",
      value: formatMoney(overview.revenueMajor, overview.currency),
      hint: "Captured payments only",
    },
    {
      label: "Orders",
      value: String(overview.orderCount),
      hint: "Captured payments only",
      href: canOrders ? getAdminPath("/orders") : null,
    },
    {
      label: "Products",
      value: String(overview.productCount),
      hint: "In your catalog",
      href: hasPermission(admin, "products.view")
        ? getAdminPath("/catalog/products")
        : null,
    },
    {
      label: "Customers",
      value: hasPermission(admin, "customers.view")
        ? String(customerCount)
        : "—",
      hint: "People who placed a paid order",
      href: hasPermission(admin, "customers.view")
        ? getAdminPath("/customers")
        : null,
    },
  ];

  const quickActions = [
    canProducts
      ? {
          title: "Add Product",
          body: "Create a new item for your catalog.",
          href: getAdminPath("/catalog/products?panel=new"),
        }
      : null,
    canOrders
      ? {
          title: "Manage Orders",
          body: "Review and fulfill customer purchases.",
          href: getAdminPath("/orders"),
        }
      : null,
    canCms
      ? {
          title: "Edit Homepage",
          body: "Update the sections shoppers see first.",
          href: getAdminPath("/content/homepage"),
        }
      : null,
    canTheme
      ? {
          title: "Customize Store",
          body: "Colors, typography, and visual style.",
          href: getAdminPath("/settings/theme"),
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; body: string; href: string }>;

  return (
    <div className={adminPageStack()}>
      <AdminPageHeader
        title={`${greeting}, ${name}`}
        description="Here's what's happening in your store."
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      {quickActions.length > 0 ? (
        <section aria-label="Quick actions">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group block">
                <AdminCard interactive className="h-full">
                  <p className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {action.body}
                  </p>
                </AdminCard>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Store overview">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const inner = (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {stat.hint}
                </p>
              </>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="block">
                <AdminCard interactive className="h-full">
                  {inner}
                </AdminCard>
              </Link>
            ) : (
              <AdminCard key={stat.label}>{inner}</AdminCard>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <AdminCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                Recent Orders
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Latest purchases from your storefront.
              </p>
            </div>
            {canOrders ? (
              <Link
                href={getAdminPath("/orders")}
                className={cn(adminBtn("ghost"), "!min-h-8 !px-2 !text-xs")}
              >
                View all
              </Link>
            ) : null}
          </div>
          {overview.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="When customers place orders, they will show up here."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {overview.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={getAdminPath(`/orders/${order.id}`)}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition-colors hover:text-[var(--color-primary)]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {formatDateTime(order.createdAt)} ·{" "}
                        {orderStatusLabel(order.status)}
                        {order.customerName || order.customerEmail
                          ? ` · ${order.customerName || order.customerEmail}`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatMoney(order.grandTotal, order.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {hasPermission(admin, "settings.view") ? (
          <AdminSetupChecklist
            items={setup.items}
            completedCount={setup.completedCount}
            alwaysShow
          />
        ) : (
          <AdminCard>
            <h2 className="text-[15px] font-semibold tracking-tight">
              Store Setup
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Setup progress is available when you can manage store settings.
            </p>
          </AdminCard>
        )}
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Platform template v{APP_VERSION}
      </p>
    </div>
  );
}

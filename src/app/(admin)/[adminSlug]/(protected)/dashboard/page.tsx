import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import Link from "next/link";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminSection } from "@/features/admin/ui/AdminCard";
import { AdminMetricTile } from "@/features/admin/ui/AdminMetricTile";
import { AdminMetricGrid } from "@/features/admin/ui/AdminMetricGrid";
import {
  AdminAttentionList,
  type AdminAttentionItem,
} from "@/features/admin/ui/AdminAttentionList";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn, adminPageStack } from "@/features/admin/ui/admin-classes";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStoreSetupChecklist } from "@/features/admin/setup/checklist";
import { AdminSetupChecklist } from "@/features/admin/setup/AdminSetupChecklist";
import { getAdminDashboardStats } from "@/features/admin/dashboard-stats";
import { getAdminDashboardOps } from "@/features/admin/dashboard-ops";
import { getAdminDashboardAnalytics } from "@/features/admin/dashboard-analytics";
import { AdminDashboardCharts } from "@/features/admin/components/AdminDashboardCharts";
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

function statusTone(
  status: string,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "REFUNDED":
      return "error";
    case "CONFIRMED":
    case "PROCESSING":
      return "warning";
    case "SHIPPED":
      return "info";
    default:
      return "neutral";
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requirePermission("dashboard.view");
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const setup = await getStoreSetupChecklist();
  const name = displayName(admin.user.email);
  const sp = await searchParams;

  const canOrders = hasPermission(admin, "orders.view");
  const canInventory = hasPermission(admin, "inventory.view");
  const canReviews = hasPermission(admin, "reviews.view");
  const canCustomers = hasPermission(admin, "customers.view");
  const canSettings = hasPermission(admin, "settings.view");
  const storeId = await resolveActiveStoreId();

  const rangeRaw = typeof sp.range === "string" ? sp.range : "14d";
  const range =
    rangeRaw === "7d" ||
    rangeRaw === "30d" ||
    rangeRaw === "90d" ||
    rangeRaw === "14d"
      ? rangeRaw
      : "14d";
  const from = typeof sp.from === "string" ? sp.from : null;
  const to = typeof sp.to === "string" ? sp.to : null;

  const [customerCount, overview, ops, analytics] = await Promise.all([
    canCustomers ? countStoreCustomers(storeId) : Promise.resolve(0),
    getAdminDashboardStats(storeId),
    getAdminDashboardOps(storeId),
    getAdminDashboardAnalytics(storeId, {
      days:
        range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 14,
      from,
      to,
    }),
  ]);

  const attentionItems: AdminAttentionItem[] = [
    canOrders
      ? {
          id: "confirmed",
          title: "Orders ready to pack",
          description: "Confirmed and waiting for processing.",
          count: ops.confirmedOrders,
          href: getAdminPath("/orders?status=CONFIRMED"),
          tone: "warning",
          icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 20 }} />,
        }
      : null,
    canOrders
      ? {
          id: "processing",
          title: "Orders ready to ship",
          description: "In processing — mark shipped when packed.",
          count: ops.processingOrders,
          href: getAdminPath("/orders?status=PROCESSING"),
          tone: "info",
          icon: <LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />,
        }
      : null,
    canOrders
      ? {
          id: "replaces",
          title: "Replace requests",
          description: "Customers waiting on a decision.",
          count: ops.openReplaceRequests,
          href: getAdminPath("/orders"),
          tone: "warning",
          icon: <AssignmentReturnOutlinedIcon sx={{ fontSize: 20 }} />,
        }
      : null,
    canReviews
      ? {
          id: "reviews",
          title: "Reviews to moderate",
          description: "Pending before they go live on the store.",
          count: ops.pendingReviews,
          href: getAdminPath("/catalog/reviews?status=pending"),
          tone: "info",
          icon: <RateReviewOutlinedIcon sx={{ fontSize: 20 }} />,
        }
      : null,
    canInventory
      ? {
          id: "out-of-stock",
          title: "Out of stock",
          description: "Variants with zero available quantity.",
          count: ops.outOfStockVariants,
          href: getAdminPath("/catalog/inventory?stock=OUT"),
          tone: "error",
          icon: <InventoryOutlinedIcon sx={{ fontSize: 20 }} />,
        }
      : null,
    canInventory
      ? {
          id: "low-stock",
          title: "Low stock",
          description: "At or below the store warn level.",
          count: ops.lowStockVariants,
          href: getAdminPath("/catalog/inventory?stock=LOW"),
          tone: "warning",
          icon: <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />,
        }
      : null,
  ].filter(Boolean) as AdminAttentionItem[];

  const setupIncomplete =
    canSettings && setup.completedCount < setup.items.length;

  return (
    <div className={adminPageStack()}>
      <AdminPageHeader
        title={`${greeting}, ${name}`}
        description="Your daily store brief — clear the queue, then skim performance."
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <AdminMetricGrid columns={5} aria-label="Store overview">
          <AdminMetricTile
            compact
            label="Revenue"
            value={formatMoney(overview.revenueMajor, overview.currency)}
            hint="Paid orders"
            tone="success"
            icon={<PaymentsOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Profit"
            value={
              overview.profitHasCostData
                ? formatMoney(overview.profitMajor, overview.currency)
                : "—"
            }
            hint={
              overview.profitHasCostData
                ? "Revenue − product cost"
                : "Set cost price on products"
            }
            tone="primary"
            icon={<TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Orders"
            value={String(overview.orderCount)}
            hint="Paid orders"
            tone="primary"
            icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Products"
            value={String(overview.productCount)}
            hint="In catalog"
            tone="neutral"
            icon={<Inventory2OutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Customers"
            value={canCustomers ? String(customerCount) : "—"}
            hint="Paid buyers"
            tone="neutral"
            icon={<PeopleOutlinedIcon sx={{ fontSize: 18 }} />}
          />
        </AdminMetricGrid>

      <div
        className={cn(
          "grid gap-6",
          setupIncomplete ? "lg:grid-cols-[1.15fr_0.85fr]" : "",
        )}
      >
        <AdminAttentionList items={attentionItems} />

        {setupIncomplete ? (
          <AdminSetupChecklist
            items={setup.items}
            completedCount={setup.completedCount}
            alwaysShow
          />
        ) : null}
      </div>

      <AdminSection
        title="Recent orders"
        description="Latest purchases — open one to fulfill or reply."
        actions={
          canOrders ? (
            <Link
              href={getAdminPath("/orders")}
              className={cn(adminBtn("ghost"), "!min-h-8 !px-2 !text-xs")}
            >
              View all
            </Link>
          ) : null
        }
      >
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
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-sm transition-colors hover:text-[var(--color-primary)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <AdminStatusBadge tone={statusTone(order.status)}>
                        {orderStatusLabel(order.status)}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {formatDateTime(order.createdAt)}
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
      </AdminSection>

      <AdminDashboardCharts analytics={analytics} range={range} />

      <p className="text-xs text-[var(--color-muted)]">
        Platform template v{APP_VERSION}
      </p>
    </div>
  );
}

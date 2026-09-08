import Link from "next/link";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminDashboardPage() {
  const admin = await requirePermission("dashboard.view");
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  const canProducts = hasPermission(admin, "products.create");
  const canOrders = hasPermission(admin, "orders.view");
  const canCms = hasPermission(admin, "cms.view");

  const summary = [
    {
      title: "Products",
      body: "Manage your catalog",
      href: hasPermission(admin, "products.view")
        ? getAdminPath("/catalog/products")
        : null,
    },
    {
      title: "Orders",
      body: "Track customer orders",
      href: canOrders ? getAdminPath("/orders") : null,
    },
    {
      title: "Customers",
      body: "View your buyers",
      href: hasPermission(admin, "customers.view")
        ? getAdminPath("/customers")
        : null,
    },
    {
      title: "Sales",
      body: "Coming soon",
      href: null,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title={greeting}
        description="Manage your store from one place."
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <div className="flex flex-wrap gap-2">
        {canProducts ? (
          <Link
            href={getAdminPath("/catalog/products?panel=new")}
            className="inline-flex items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)]"
          >
            + Add Product
          </Link>
        ) : null}
        {canOrders ? (
          <Link
            href={getAdminPath("/orders")}
            className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-medium"
          >
            View Orders
          </Link>
        ) : null}
        {canCms ? (
          <Link
            href={getAdminPath("/content/homepage")}
            className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-medium"
          >
            Edit Homepage
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => {
          const inner = (
            <>
              <h2 className="text-sm font-medium text-[var(--color-muted)]">
                {card.title}
              </h2>
              <p className="mt-2 text-base font-semibold">{card.body}</p>
            </>
          );
          return card.href ? (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-colors hover:border-[var(--color-primary)]"
            >
              {inner}
            </Link>
          ) : (
            <article
              key={card.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
            >
              {inner}
            </article>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <div className="mt-4">
          <EmptyState
            title="No orders yet"
            description="When customers place orders, they will show up here."
          />
        </div>
      </section>

      {(canProducts || canCms) && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Quick tasks</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {canProducts ? (
              <li>
                <Link
                  href={getAdminPath("/catalog/products")}
                  className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Review your products
                </Link>
              </li>
            ) : null}
            {hasPermission(admin, "settings.view") ? (
              <li>
                <Link
                  href={getAdminPath("/settings")}
                  className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Check store settings
                </Link>
              </li>
            ) : null}
            {hasPermission(admin, "media.view") ? (
              <li>
                <Link
                  href={getAdminPath("/media")}
                  className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Upload images & files
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      )}
    </div>
  );
}

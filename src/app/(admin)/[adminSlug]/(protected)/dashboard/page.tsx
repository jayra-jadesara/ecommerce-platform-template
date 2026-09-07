import { requirePermission } from "@/features/auth/session";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AdminDashboardPage() {
  const admin = await requirePermission("dashboard.view");

  const cards = [
    { title: "Products", body: "Not available yet" },
    { title: "Orders", body: "Not available yet" },
    { title: "Customers", body: "Not available yet" },
    { title: "Revenue", body: "Not available yet" },
  ];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold md:text-3xl">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Signed in as {admin.user.email}. Roles: {admin.roles.join(", ")}.
        Status: {admin.admin.is_active ? "Active" : "Inactive"}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
          >
            <h2 className="text-sm font-medium text-[var(--color-muted)]">
              {card.title}
            </h2>
            <p className="mt-3 text-lg font-semibold">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <EmptyState
          title="Analytics coming later"
          description="Live metrics will connect once catalog and orders are implemented."
        />
      </div>
    </div>
  );
}

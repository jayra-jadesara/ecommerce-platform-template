import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import {
  ACTIVITY_AREA_TABS,
  activityAreaForEntity,
  filterItemsByArea,
  isActivityAreaId,
  isActivityRangeId,
  isActivityViewId,
  type ActivityAreaId,
  type ActivityRangeId,
} from "@/features/admin/team/activity-areas";
import { StaffActivityDashboard } from "@/features/admin/team/components/StaffActivityDashboard";
import {
  getAdminTeamMember,
  listStaffActivity,
} from "@/features/admin/team/service";
import { getAdminPath } from "@/config/admin-route";
import { requirePermission } from "@/features/auth/session";

export const dynamic = "force-dynamic";

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(isoDay: string, delta: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function resolveDateRange(input: {
  range: string | undefined;
  from: string | undefined;
  to: string | undefined;
}): { range: ActivityRangeId; from: string; to: string } {
  const to = input.to && /^\d{4}-\d{2}-\d{2}$/.test(input.to) ? input.to : todayIso();
  const range: ActivityRangeId = isActivityRangeId(input.range ?? "")
    ? (input.range as ActivityRangeId)
    : "14d";

  if (input.from && /^\d{4}-\d{2}-\d{2}$/.test(input.from)) {
    return { range, from: input.from, to };
  }

  const days =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 14;
  return { range, from: addDaysIso(to, -(days - 1)), to };
}

export default async function AdminStaffActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("users.view");
  const { userId } = await params;
  const sp = await searchParams;

  const member = await getAdminTeamMember(userId);
  if (!member) notFound();

  const areaRaw = typeof sp.area === "string" ? sp.area : "all";
  const area: ActivityAreaId = isActivityAreaId(areaRaw) ? areaRaw : "all";
  const q = typeof sp.q === "string" ? sp.q : "";
  const viewRaw = typeof sp.view === "string" ? sp.view : "overview";
  const view = isActivityViewId(viewRaw) ? viewRaw : "overview";
  const dates = resolveDateRange({
    range: typeof sp.range === "string" ? sp.range : undefined,
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
  });

  const allInRange = await listStaffActivity(userId, {
    from: dates.from,
    to: dates.to,
    search: q || null,
    limit: 400,
  });

  const areaCounts = Object.fromEntries(
    ACTIVITY_AREA_TABS.map((tab) => [
      tab.id,
      tab.id === "all"
        ? allInRange.length
        : allInRange.filter((item) => activityAreaForEntity(item.entityType) === tab.id)
            .length,
    ]),
  ) as Record<ActivityAreaId, number>;

  const items = filterItemsByArea(allInRange, area);

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Staff activity"
        description="Charts or a day-grouped activity table — compact filters by page and date."
        breadcrumbs={[
          { label: "Store", href: getAdminPath("/settings") },
          { label: "Team & roles", href: getAdminPath("/team") },
          { label: member.name || member.email || "Staff" },
        ]}
      />
      <StaffActivityDashboard
        member={member}
        items={items}
        areaCounts={areaCounts}
        filters={{
          area,
          range: dates.range,
          from: dates.from,
          to: dates.to,
          q,
          view,
        }}
      />
    </div>
  );
}

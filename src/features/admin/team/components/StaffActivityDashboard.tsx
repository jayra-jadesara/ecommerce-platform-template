"use client";

import CloseIcon from "@mui/icons-material/Close";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { getAdminPath } from "@/config/admin-route";
import {
  ACTIVITY_AREA_TABS,
  ACTIVITY_RANGE_PRESETS,
  activityAreaForEntity,
  activityAreaLabel,
  isActivityAreaId,
  isActivityRangeId,
  type ActivityAreaId,
  type ActivityRangeId,
  type ActivityViewId,
} from "@/features/admin/team/activity-areas";
import { staffEntityTone } from "@/features/admin/team/activity-labels";
import type { StaffActivityItem, TeamMember } from "@/features/admin/team/types";
import { AdminDateField } from "@/features/admin/ui/AdminDateField";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  ADMIN_CHART_COLORS,
  AdminChartCard,
  AdminHorizontalBarChart,
  AdminVerticalBarChart,
} from "@/features/admin/ui/charts";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format-date";

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortDayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

function weekdayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(
    new Date(y, m - 1, d),
  );
}

function timeOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function memberInitials(member: TeamMember): string {
  const source = (member.name || member.email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function addDaysIso(isoDay: string, delta: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dayKey(date);
}

function todayIso(): string {
  return dayKey(startOfLocalDay(new Date()));
}

function rangeBounds(
  range: ActivityRangeId,
  from: string,
  to: string,
): { from: string; to: string } {
  const toDay = to || todayIso();
  const preset = ACTIVITY_RANGE_PRESETS.find((row) => row.id === range);
  if (!preset) {
    return { from: from || addDaysIso(toDay, -13), to: toDay };
  }
  return {
    from: addDaysIso(toDay, -(preset.days - 1)),
    to: toDay,
  };
}

type DayGroup = {
  day: string;
  label: string;
  weekday: string;
  rows: StaffActivityItem[];
};

function groupByDay(items: StaffActivityItem[]): DayGroup[] {
  const map = new Map<string, StaffActivityItem[]>();
  for (const item of items) {
    const created = new Date(item.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = dayKey(startOfLocalDay(created));
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, rows]) => ({
      day,
      label: formatDate(day),
      weekday: weekdayLabel(day),
      rows: rows.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }));
}

function buildDailyChart(
  items: StaffActivityItem[],
  from: string,
  to: string,
): Array<{ label: string; actions: number }> {
  const counts = new Map<string, number>();
  let cursor = from;
  while (cursor <= to) {
    counts.set(cursor, 0);
    cursor = addDaysIso(cursor, 1);
  }
  for (const item of items) {
    const created = new Date(item.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = dayKey(startOfLocalDay(created));
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([iso, actions]) => ({
    label: shortDayLabel(iso),
    actions,
  }));
}

function buildAreaChart(items: StaffActivityItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = activityAreaLabel(activityAreaForEntity(item.entityType));
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, actions]) => ({ name, actions }))
    .sort((a, b) => b.actions - a.actions);
}

function buildActionChart(items: StaffActivityItem[], limit = 6) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.actionLabel, (counts.get(item.actionLabel) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, actions]) => ({ name, actions }))
    .sort((a, b) => b.actions - a.actions)
    .slice(0, limit);
}

function buildTimeChart(items: StaffActivityItem[]) {
  const buckets = [
    { name: "Morning", hint: "6–12", actions: 0 },
    { name: "Afternoon", hint: "12–5", actions: 0 },
    { name: "Evening", hint: "5–9", actions: 0 },
    { name: "Night", hint: "9–6", actions: 0 },
  ];
  for (const item of items) {
    const created = new Date(item.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const h = created.getHours();
    if (h >= 6 && h < 12) buckets[0]!.actions += 1;
    else if (h >= 12 && h < 17) buckets[1]!.actions += 1;
    else if (h >= 17 && h < 21) buckets[2]!.actions += 1;
    else buckets[3]!.actions += 1;
  }
  return buckets;
}

export type StaffActivityFilters = {
  area: ActivityAreaId;
  range: ActivityRangeId;
  from: string;
  to: string;
  q: string;
  view: ActivityViewId;
};

/** One sticky day label — updated on scroll (avoids stacked sticky rows). */
function useStickyDayLabel(
  scrollRef: RefObject<HTMLDivElement | null>,
  groups: DayGroup[],
) {
  const [activeDay, setActiveDay] = useState(groups[0]?.day ?? "");

  useEffect(() => {
    setActiveDay(groups[0]?.day ?? "");
  }, [groups]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !groups.length) return;

    const markers = root.querySelectorAll<HTMLElement>("[data-day-marker]");
    if (!markers.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        const first = visible[0]?.target.getAttribute("data-day-marker");
        if (first) setActiveDay(first);
      },
      {
        root,
        // Prefer the day section near the top of the scrollport
        rootMargin: "-8% 0px -70% 0px",
        threshold: [0, 0.1, 0.5],
      },
    );

    markers.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [scrollRef, groups]);

  return groups.find((group) => group.day === activeDay) ?? groups[0] ?? null;
}

export function StaffActivityDashboard({
  member,
  items,
  filters,
  areaCounts,
}: {
  member: TeamMember;
  items: StaffActivityItem[];
  filters: StaffActivityFilters;
  areaCounts: Record<ActivityAreaId, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const bounds = useMemo(
    () => rangeBounds(filters.range, filters.from, filters.to),
    [filters.range, filters.from, filters.to],
  );

  const dayGroups = useMemo(() => groupByDay(items), [items]);
  const stickyDay = useStickyDayLabel(logScrollRef, dayGroups);

  const dailyChart = useMemo(
    () => buildDailyChart(items, bounds.from, bounds.to),
    [items, bounds.from, bounds.to],
  );
  const areaChart = useMemo(() => buildAreaChart(items), [items]);
  const actionChart = useMemo(() => buildActionChart(items), [items]);
  const timeChart = useMemo(() => buildTimeChart(items), [items]);

  const total = items.length;
  const peakDay = [...dailyChart].sort((a, b) => b.actions - a.actions)[0];
  const peakTime = [...timeChart].sort((a, b) => b.actions - a.actions)[0];
  const topArea = areaChart[0];

  function pushFilters(next: Partial<StaffActivityFilters>) {
    const merged: StaffActivityFilters = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.view !== "overview") params.set("view", merged.view);
    if (merged.area !== "all") params.set("area", merged.area);
    if (merged.range !== "14d") params.set("range", merged.range);
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    const qs = params.toString();
    const href = `${getAdminPath(`/team/${member.userId}`)}${qs ? `?${qs}` : ""}`;
    startTransition(() => router.push(href));
  }

  function applySearch() {
    if (searchDraft.trim() === filters.q.trim()) return;
    pushFilters({ q: searchDraft });
  }

  return (
    <div className="space-y-2.5">
      {/* Compact profile */}
      <div
        className={cn(
          adminCard(),
          "flex flex-wrap items-center justify-between gap-3 px-3 py-2.5",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[12px] font-bold text-[var(--color-primary)]"
            aria-hidden
          >
            {memberInitials(member)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[var(--color-foreground)]">
              {member.name || member.email || "Staff"}
            </p>
            <p className="truncate text-[11px] text-[var(--color-muted)]">
              {member.email || member.userId}
              <span className="mx-1.5 text-[var(--color-border)]">·</span>
              {total} actions
              {peakTime && peakTime.actions > 0
                ? ` · mostly ${peakTime.name.toLowerCase()}`
                : ""}
            </p>
          </div>
        </div>
        <Link
          href={getAdminPath("/team")}
          className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
        >
          Back to Team
        </Link>
      </div>

      {/* Compact filters */}
      <div className={cn(adminCard(), "px-2.5 py-2")}>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(6.5rem,0.45fr)_minmax(9rem,0.7fr)_minmax(9rem,0.7fr)]">
          <TextField
            size="small"
            fullWidth
            label="Search"
            placeholder="Action…"
            value={searchDraft}
            disabled={pending}
            onChange={(event) => setSearchDraft(event.target.value)}
            onBlur={applySearch}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applySearch();
              }
            }}
            slotProps={{
              input: {
                endAdornment: searchDraft ? (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      size="small"
                      edge="end"
                      aria-label="Clear"
                      onClick={() => {
                        setSearchDraft("");
                        pushFilters({ q: "" });
                      }}
                      sx={{ color: "var(--color-muted)" }}
                    >
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <AdminSelect
            label="Range"
            value={filters.range}
            disabled={pending}
            options={ACTIVITY_RANGE_PRESETS.map((row) => ({
              value: row.id,
              label: row.label,
            }))}
            onChange={(value) => {
              if (!isActivityRangeId(value)) return;
              const next = rangeBounds(value, "", todayIso());
              pushFilters({ range: value, from: next.from, to: next.to });
            }}
          />
          <AdminDateField
            label="From"
            value={bounds.from}
            disabled={pending}
            maxDate={dayjs(bounds.to)}
            onChange={(next) => {
              if (!next) return;
              pushFilters({ from: next });
            }}
          />
          <AdminDateField
            label="To"
            value={bounds.to}
            disabled={pending}
            minDate={dayjs(bounds.from)}
            maxDate={dayjs()}
            onChange={(next) => {
              if (!next) return;
              pushFilters({ to: next });
            }}
          />
        </div>
      </div>

      {/* View + area — one compact strip */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          className="inline-flex w-fit rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
        >
          {(
            [
              { id: "overview" as const, label: "Charts" },
              { id: "log" as const, label: `Log (${total})` },
            ] as const
          ).map((tab) => {
            const selected = filters.view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={pending}
                onClick={() => pushFilters({ view: tab.id })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold transition",
                  selected
                    ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {ACTIVITY_AREA_TABS.map((tab) => {
            const selected = filters.area === tab.id;
            const count = areaCounts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!isActivityAreaId(tab.id)) return;
                  pushFilters({ area: tab.id });
                }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition",
                  selected
                    ? "border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {tab.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filters.view === "overview" ? (
        <div className="grid gap-2.5 lg:grid-cols-2">
          <AdminChartCard
            title="Actions per day"
            tip={
              peakDay && peakDay.actions > 0
                ? `Peak: ${peakDay.label} with ${peakDay.actions} actions`
                : "How busy each day was"
            }
            className="lg:col-span-2"
            empty={
              dailyChart.some((row) => row.actions > 0)
                ? null
                : "No data for this filter"
            }
          >
            <AdminVerticalBarChart
              data={dailyChart.map((row) => ({
                label: row.label,
                value: row.actions,
              }))}
              height={200}
              valueLabel="Actions"
              formatValue={(n) => `${n} actions`}
              maxBarSize={28}
            />
          </AdminChartCard>

          <AdminChartCard
            title="By admin page"
            tip={
              topArea
                ? `Most time in ${topArea.name} (${topArea.actions})`
                : "Which section they used"
            }
            empty={areaChart.length ? null : "No data for this filter"}
          >
            <AdminHorizontalBarChart
              data={areaChart.map((row) => ({
                name: row.name,
                value: row.actions,
              }))}
              colorful
              valueLabel="Page"
              formatValue={(n) => `${n} actions`}
              labelMaxChars={14}
              yAxisWidth={88}
            />
          </AdminChartCard>

          <AdminChartCard
            title="Top actions"
            tip="What they clicked / saved most often"
            empty={actionChart.length ? null : "No data for this filter"}
          >
            <AdminHorizontalBarChart
              data={actionChart.map((row) => ({
                name: row.name,
                value: row.actions,
              }))}
              valueLabel="Action"
              formatValue={(n) => `${n} times`}
              labelMaxChars={18}
              yAxisWidth={120}
            />
          </AdminChartCard>

          <AdminChartCard
            title="Time of day"
            tip={
              peakTime && peakTime.actions > 0
                ? `Usually works in the ${peakTime.name.toLowerCase()}`
                : "Morning / afternoon / evening / night"
            }
            className="lg:col-span-2"
          >
            <AdminVerticalBarChart
              data={timeChart.map((row) => ({
                label: row.name,
                value: row.actions,
              }))}
              height={170}
              color={ADMIN_CHART_COLORS.teal}
              hoverColor={ADMIN_CHART_COLORS.tealHover}
              valueLabel="Period"
              formatValue={(n) => `${n} actions`}
              maxBarSize={48}
            />
          </AdminChartCard>
        </div>
      ) : (
        <section className={cn(adminCard(), "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
              Activity log
              <span className="ml-2 text-[11px] font-medium text-[var(--color-muted)]">
                {total} rows · newest first
              </span>
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {formatDate(bounds.from)} – {formatDate(bounds.to)}
            </p>
          </div>

          {!items.length ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-semibold">No recorded actions</p>
              <p className="mt-1 text-[12px] text-[var(--color-muted)]">
                Try another date range or page filter.
              </p>
            </div>
          ) : (
            <div
              ref={logScrollRef}
              className="relative max-h-[min(70vh,40rem)] overflow-auto"
            >
              {/* Single sticky day — never stacks */}
              {stickyDay ? (
                <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_1px_0_var(--color-border)]">
                  <p className="text-[12px] font-bold text-[var(--color-foreground)]">
                    {stickyDay.weekday}, {stickyDay.label}
                  </p>
                  <span className="rounded-md bg-[var(--color-card)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                    {stickyDay.rows.length}{" "}
                    {stickyDay.rows.length === 1 ? "action" : "actions"}
                  </span>
                </div>
              ) : null}

              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="sticky top-[37px] z-10">
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)] text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                    <th className="w-[32%] px-3 py-2 font-semibold">What happened</th>
                    <th className="px-3 py-2 font-semibold">Detail</th>
                    <th className="w-[7.5rem] px-3 py-2 text-right font-semibold">
                      Date & time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dayGroups.map((group) => (
                    <DayTableSection key={group.day} group={group} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DayTableSection({ group }: { group: DayGroup }) {
  return (
    <>
      {/* Marker for IntersectionObserver — not sticky, no visible duplicate day row */}
      <tr data-day-marker={group.day} className="h-0">
        <td colSpan={3} className="!p-0">
          <span className="sr-only">
            {group.weekday}, {group.label} · {group.rows.length} actions
          </span>
        </td>
      </tr>
      {group.rows.map((item) => {
        const tone = staffEntityTone(item.entityType);
        const area = activityAreaLabel(activityAreaForEntity(item.entityType));
        const detail = item.summary?.trim() || "No extra detail stored";
        const hoverDetail =
          item.detailFull?.trim() ||
          [
            item.actionLabel,
            `${item.entityLabel} · ${formatDateTime(item.createdAt)}`,
            item.entityId ? `Record ID: ${item.entityId}` : null,
            detail,
          ]
            .filter(Boolean)
            .join("\n");
        const hoverLines = hoverDetail.split("\n").filter(Boolean);
        const hoverTitle = hoverLines[0] ?? item.actionLabel;
        const hoverMeta = hoverLines[1] ?? "";
        const hoverRows = hoverLines.slice(2).map((line) => {
          const splitAt = line.indexOf(": ");
          if (splitAt === -1) return { label: null as string | null, value: line };
          return {
            label: line.slice(0, splitAt),
            value: line.slice(splitAt + 2),
          };
        });

        return (
          <tr
            key={item.id}
            className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)]"
          >
            <td className="px-3 py-2.5 align-top">
              <p className="font-semibold leading-snug text-[var(--color-foreground)]">
                {item.actionLabel}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                    tone.chip,
                  )}
                >
                  {item.entityLabel}
                </span>
                <span className="text-[10px] text-[var(--color-muted)]">
                  {area}
                </span>
              </div>
            </td>
            <td className="max-w-[22rem] px-3 py-2.5 align-top text-[12px] leading-snug text-[var(--color-muted)]">
              <Tooltip
                title={
                  <div className="min-w-[12rem] max-w-[18rem]">
                    <div className="border-b border-[var(--color-border)] pb-1.5">
                      <p className="text-[12px] font-semibold leading-tight text-[var(--color-foreground)]">
                        {hoverTitle}
                      </p>
                      {hoverMeta ? (
                        <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-muted)]">
                          {hoverMeta}
                        </p>
                      ) : null}
                    </div>
                    {hoverRows.length ? (
                      <dl className="mt-1.5 space-y-1">
                        {hoverRows.slice(0, 8).map((row, index) => (
                          <div
                            key={`${row.label ?? "row"}-${index}`}
                            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0"
                          >
                            {row.label ? (
                              <dt className="shrink-0 text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--color-muted)]">
                                {row.label}
                              </dt>
                            ) : null}
                            <dd
                              className={cn(
                                "min-w-0 break-all text-[11px] leading-snug text-[var(--color-foreground)]",
                                !row.label && "col-span-2",
                              )}
                            >
                              {row.value}
                            </dd>
                          </div>
                        ))}
                        {hoverRows.length > 8 ? (
                          <p className="pt-0.5 text-[10px] text-[var(--color-muted)]">
                            +{hoverRows.length - 8} more
                          </p>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                        {detail}
                      </p>
                    )}
                  </div>
                }
                arrow
                placement="top-start"
                enterDelay={200}
                slotProps={{
                  tooltip: {
                    sx: {
                      p: 0,
                      maxWidth: "none",
                      bgcolor: "var(--color-card)",
                      color: "var(--color-foreground)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "12px",
                      px: 1.25,
                      py: 1.1,
                      boxShadow:
                        "0 12px 32px color-mix(in srgb, var(--color-foreground) 10%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-primary) 8%, transparent)",
                    },
                  },
                  arrow: {
                    sx: {
                      color: "var(--color-card)",
                      "&::before": {
                        border: "1px solid var(--color-border)",
                        boxSizing: "border-box",
                      },
                    },
                  },
                }}
              >
                <span className="line-clamp-2 cursor-help rounded-sm underline decoration-dotted decoration-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] underline-offset-2 transition-colors hover:text-[var(--color-foreground)]">
                  {detail}
                </span>
              </Tooltip>
            </td>
            <td className="whitespace-nowrap px-3 py-2.5 align-top text-right text-[12px] tabular-nums text-[var(--color-muted)]">
              <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                <span className="block font-medium text-[var(--color-foreground)]">
                  {formatDate(item.createdAt)}
                </span>
                <span className="block text-[11px]">{timeOnly(item.createdAt)}</span>
              </time>
            </td>
          </tr>
        );
      })}
    </>
  );
}

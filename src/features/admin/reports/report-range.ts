import dayjs from "dayjs";
import type { ReportRange } from "@/features/admin/reports/types";

export const REPORT_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "Current month" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last 12 months" },
  { value: "year", label: "Current year" },
  { value: "last_year", label: "Last year" },
] as const;

export type ReportRangeKey = (typeof REPORT_RANGE_OPTIONS)[number]["value"];

export const DEFAULT_REPORT_RANGE: ReportRangeKey = "30d";

const VALID_KEYS = new Set<string>(REPORT_RANGE_OPTIONS.map((o) => o.value));

export function isReportRangeKey(value: string): value is ReportRangeKey {
  return VALID_KEYS.has(value);
}

function friendlyRangeLabel(from: string, to: string): string {
  const fmt = (iso: string) =>
    dayjs(iso).format("D MMM YYYY");
  return `${fmt(from)} – ${fmt(to)}`;
}

function dayCount(from: string, to: string): number {
  return dayjs(to).diff(dayjs(from), "day") + 1;
}

/** Resolve a report period key (or explicit from/to) into store-scoped dates. */
export function resolveReportRange(options?: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): ReportRange {
  const today = dayjs().format("YYYY-MM-DD");

  if (
    options?.from &&
    options?.to &&
    /^\d{4}-\d{2}-\d{2}$/.test(options.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(options.to)
  ) {
    const from = options.from <= options.to ? options.from : options.to;
    const to = options.to;
    const key = isReportRangeKey(options.range ?? "")
      ? options.range!
      : DEFAULT_REPORT_RANGE;
    return {
      key,
      days: dayCount(from, to),
      from,
      to,
      label: friendlyRangeLabel(from, to),
    };
  }

  const key = isReportRangeKey(options?.range ?? "")
    ? options!.range!
    : DEFAULT_REPORT_RANGE;
  const to = today;
  let from = today;

  switch (key) {
    case "7d":
      from = dayjs().subtract(6, "day").format("YYYY-MM-DD");
      break;
    case "14d":
      from = dayjs().subtract(13, "day").format("YYYY-MM-DD");
      break;
    case "30d":
      from = dayjs().subtract(29, "day").format("YYYY-MM-DD");
      break;
    case "90d":
      from = dayjs().subtract(89, "day").format("YYYY-MM-DD");
      break;
    case "month":
      from = dayjs().startOf("month").format("YYYY-MM-DD");
      break;
    case "6m":
      from = dayjs().subtract(6, "month").startOf("day").format("YYYY-MM-DD");
      break;
    case "1y":
      from = dayjs().subtract(12, "month").startOf("day").format("YYYY-MM-DD");
      break;
    case "year":
      from = dayjs().startOf("year").format("YYYY-MM-DD");
      break;
    case "last_year":
      from = dayjs().subtract(1, "year").startOf("year").format("YYYY-MM-DD");
      return {
        key,
        days: dayCount(from, dayjs().subtract(1, "year").endOf("year").format("YYYY-MM-DD")),
        from,
        to: dayjs().subtract(1, "year").endOf("year").format("YYYY-MM-DD"),
        label: friendlyRangeLabel(
          from,
          dayjs().subtract(1, "year").endOf("year").format("YYYY-MM-DD"),
        ),
      };
    default:
      from = dayjs().subtract(29, "day").format("YYYY-MM-DD");
      break;
  }

  return {
    key,
    days: dayCount(from, to),
    from,
    to,
    label: friendlyRangeLabel(from, to),
  };
}

/** Build URL search params for navigating to reports with a period (+ optional report). */
export function reportRangeSearchParams(
  rangeKey: ReportRangeKey,
  reportKey?: string,
): URLSearchParams {
  const resolved = resolveReportRange({ range: rangeKey });
  const params = new URLSearchParams();
  params.set("range", rangeKey);
  params.set("from", resolved.from);
  params.set("to", resolved.to);
  if (reportKey) params.set("report", reportKey);
  return params;
}

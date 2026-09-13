export const ACCOUNT_DATE_RANGE_VALUES = [
  "all",
  "today",
  "yesterday",
  "last_3_months",
  "last_6_months",
  "year",
  "last_year",
  "custom",
] as const;

export type AccountDateRange = (typeof ACCOUNT_DATE_RANGE_VALUES)[number];

export const ACCOUNT_DATE_RANGE_OPTIONS: Array<{
  value: AccountDateRange;
  label: string;
}> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

export function parseAccountDateRange(
  raw: string | undefined | null,
): AccountDateRange {
  const value = (raw ?? "all").trim().toLowerCase();
  return (ACCOUNT_DATE_RANGE_VALUES as readonly string[]).includes(value)
    ? (value as AccountDateRange)
    : "all";
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Accept YYYY-MM-DD or datetime-local / ISO strings. */
export function parseAccountDateParam(
  raw: string | undefined | null,
): Date | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toAccountDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive created_at bounds for account list filters (ISO strings). */
export function getAccountDateRangeBounds(
  range: AccountDateRange,
  options?: {
    now?: Date;
    customFrom?: string | null;
    customTo?: string | null;
  },
): { fromIso?: string; toIso?: string } {
  const now = options?.now ?? new Date();

  if (range === "custom") {
    const from = parseAccountDateParam(options?.customFrom ?? null);
    const to = parseAccountDateParam(options?.customTo ?? null);
    return {
      fromIso: from ? startOfLocalDay(from).toISOString() : undefined,
      toIso: to ? endOfLocalDay(to).toISOString() : undefined,
    };
  }

  if (range === "all") return {};

  if (range === "today") {
    return {
      fromIso: startOfLocalDay(now).toISOString(),
      toIso: endOfLocalDay(now).toISOString(),
    };
  }

  if (range === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return {
      fromIso: startOfLocalDay(y).toISOString(),
      toIso: endOfLocalDay(y).toISOString(),
    };
  }

  if (range === "last_3_months") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    return { fromIso: from.toISOString(), toIso: now.toISOString() };
  }

  if (range === "last_6_months") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return { fromIso: from.toISOString(), toIso: now.toISOString() };
  }

  if (range === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    return {
      fromIso: startOfLocalDay(from).toISOString(),
      toIso: endOfLocalDay(now).toISOString(),
    };
  }

  if (range === "last_year") {
    const year = now.getFullYear() - 1;
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31);
    return {
      fromIso: startOfLocalDay(from).toISOString(),
      toIso: endOfLocalDay(to).toISOString(),
    };
  }

  return {};
}

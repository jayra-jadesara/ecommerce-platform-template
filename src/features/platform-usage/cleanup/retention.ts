/**
 * Rolling retention windows (from today), not calendar years.
 * Safer in January: "12 months" still keeps the previous full year.
 */
export const RETENTION_MONTH_OPTIONS = [
  { months: 6, label: "Older than 6 months" },
  { months: 12, label: "Older than 1 year" },
  { months: 24, label: "Older than 2 years" },
  { months: 36, label: "Older than 3 years" },
  { months: 60, label: "Older than 5 years" },
  { months: 72, label: "Older than 6 years" },
] as const;

export type RetentionMonths = (typeof RETENTION_MONTH_OPTIONS)[number]["months"];

export const DEFAULT_RETENTION_MONTHS: RetentionMonths = 12;

export function isValidRetentionMonths(
  value: unknown,
): value is RetentionMonths {
  return RETENTION_MONTH_OPTIONS.some((o) => o.months === value);
}

export function retentionCutoffIso(
  months: RetentionMonths,
  now = new Date(),
): string {
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString();
}

export function retentionLabel(months: RetentionMonths): string {
  return (
    RETENTION_MONTH_OPTIONS.find((o) => o.months === months)?.label ??
    `Older than ${months} months`
  );
}

export function formatRetentionCutoff(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

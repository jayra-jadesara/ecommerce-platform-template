/**
 * Integer minor-unit money helpers.
 *
 * Authoritative pricing uses integer minor units (e.g. paise/cents) to avoid
 * IEEE-754 drift. Database numeric(12,2) major units convert via round-trip:
 *   minor = round(major × 10^fractionDigits)
 *   major = minor / 10^fractionDigits
 *
 * Percentage fees use half-up rounding on the minor-unit result:
 *   fee = round(baseMinor × percent / 100)
 */

export function currencyFractionDigits(currency: string): number {
  try {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
    return typeof digits === "number" ? digits : 2;
  } catch {
    return 2;
  }
}

export function majorToMinor(
  major: number,
  currencyOrDigits: string | number = 2,
): number {
  if (!Number.isFinite(major)) {
    throw new Error("Invalid monetary amount.");
  }
  const digits =
    typeof currencyOrDigits === "number"
      ? currencyOrDigits
      : currencyFractionDigits(currencyOrDigits);
  const factor = 10 ** digits;
  return Math.round(major * factor);
}

export function minorToMajor(
  minor: number,
  currencyOrDigits: string | number = 2,
): number {
  if (!Number.isFinite(minor) || !Number.isInteger(minor)) {
    throw new Error("Minor units must be a finite integer.");
  }
  const digits =
    typeof currencyOrDigits === "number"
      ? currencyOrDigits
      : currencyFractionDigits(currencyOrDigits);
  return minor / 10 ** digits;
}

/** Half-up percentage of a minor-unit base. `percent` is e.g. 2.5 for 2.5%. */
export function percentOfMinor(baseMinor: number, percent: number): number {
  if (!Number.isFinite(baseMinor) || !Number.isFinite(percent)) {
    throw new Error("Invalid percentage inputs.");
  }
  return Math.round((baseMinor * percent) / 100);
}

export function assertNonNegativeMinor(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer minor amount.`);
  }
}

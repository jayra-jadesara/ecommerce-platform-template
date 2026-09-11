import { cn } from "@/lib/cn";

type SectionAccentHeadingProps = {
  /** e.g. "Explore our Collections" — last word (or accentWord) gets primary color + underline */
  title: string;
  accentWord?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

/**
 * Centered section title like “Explore our Collections”
 * with a brush-stroke underline under the accent word.
 */
export function SectionAccentHeading({
  title,
  accentWord,
  className,
  as: Tag = "h2",
}: SectionAccentHeadingProps) {
  const trimmed = title.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const preferred = accentWord?.trim();
  const accentFromPreferred =
    preferred &&
    parts.find((w) => w.toLowerCase() === preferred.toLowerCase());
  const accent =
    accentFromPreferred ||
    parts.find((w) => /^collections?$/i.test(w)) ||
    parts[parts.length - 1] ||
    "";
  const accentIndex = parts.findIndex(
    (w) => w.toLowerCase() === accent.toLowerCase(),
  );
  const before =
    accentIndex > 0 ? `${parts.slice(0, accentIndex).join(" ")} ` : "";
  const after =
    accentIndex >= 0 && accentIndex < parts.length - 1
      ? ` ${parts.slice(accentIndex + 1).join(" ")}`
      : "";
  const accentLabel = accentIndex >= 0 ? parts[accentIndex]! : accent;

  return (
    <Tag
        className={cn(
        "text-center font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl md:text-[1.75rem]",
        className,
      )}
    >
      {before ? <span>{before}</span> : null}
      <span className="relative inline-block text-[var(--color-primary)]">
        {accentLabel}
        <svg
          className="pointer-events-none absolute -bottom-1 left-[-2%] w-[104%] text-[var(--color-primary)]"
          viewBox="0 0 120 8"
          fill="none"
          aria-hidden
          preserveAspectRatio="none"
        >
          <path
            d="M2 5.5C22 2.5 42 2 62 4.5C82 7 102 6.5 118 3.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {after ? <span>{after}</span> : null}
    </Tag>
  );
}

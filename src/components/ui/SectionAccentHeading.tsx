import { cn } from "@/lib/cn";
import {
  resolveHeadingAccent,
  type HeadingHighlightStyle,
} from "@/features/theme/heading-highlight";

type SectionAccentHeadingProps = {
  /** e.g. "Explore our Collections" — last word gets primary color + decoration */
  title: string;
  accentWord?: string;
  /** Store-wide design from Appearance → Typography. */
  highlightStyle?: HeadingHighlightStyle;
  className?: string;
  as?: "h1" | "h2" | "h3";
  align?: "center" | "left";
};

function AccentDecoration({ style }: { style: HeadingHighlightStyle }) {
  if (style === "wavy" || style === "double") {
    return (
      <svg
        className="sf-heading-highlight__deco absolute -bottom-1 left-[-2%] w-[104%] text-[var(--color-primary)]"
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
    );
  }
  if (style === "scribble") {
    return (
      <svg
        className="sf-heading-highlight__deco absolute -bottom-1.5 left-[-4%] w-[108%] text-[var(--color-primary)]"
        viewBox="0 0 120 12"
        fill="none"
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M2 7C18 3 34 9 50 5C66 2 82 10 98 4C108 2 114 6 118 5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M4 9C22 6 40 11 58 7C76 4 94 10 116 6"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  }
  if (style === "arc") {
    return (
      <svg
        className="sf-heading-highlight__deco absolute -bottom-2 left-[-2%] w-[104%] text-[var(--color-primary)]"
        viewBox="0 0 120 14"
        fill="none"
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M8 3C30 12 90 12 112 3"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (style === "circle") {
    return (
      <svg
        className="sf-heading-highlight__deco pointer-events-none absolute left-[-12%] top-[-18%] h-[136%] w-[124%] text-[var(--color-primary)]"
        viewBox="0 0 120 48"
        fill="none"
        aria-hidden
        preserveAspectRatio="none"
      >
        <ellipse
          cx="60"
          cy="24"
          rx="54"
          ry="18"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform="rotate(-4 60 24)"
        />
      </svg>
    );
  }
  if (style === "brush") {
    return (
      <svg
        className="sf-heading-highlight__deco absolute -bottom-1 left-[-4%] w-[108%] text-[var(--color-primary)]"
        viewBox="0 0 120 14"
        fill="none"
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M4 8C28 3 52 11 76 6C92 3 108 8 116 5L112 11C90 14 62 8 40 11C24 13 12 10 4 8Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }
  return null;
}

/**
 * Section / page title with an admin-managed accent decoration on the last word.
 */
export function SectionAccentHeading({
  title,
  accentWord,
  highlightStyle = "double",
  className,
  as: Tag = "h2",
  align = "center",
}: SectionAccentHeadingProps) {
  const { before, accent, after } = resolveHeadingAccent(title, accentWord);
  const style = highlightStyle;
  const showBox = style === "box" || style === "double";
  const showUnderline = style === "underline";
  const showMarker = style === "marker";
  const showStripe = style === "stripe";
  const showGlow = style === "glow";
  const showStamp = style === "stamp";
  const showBracket = style === "bracket";
  const showRibbon = style === "ribbon";
  const showCapsule = style === "capsule";
  const showEditorial = style === "editorial";
  const showGradient = style === "gradient";
  const showSpark = style === "spark";
  const showDeco =
    style === "wavy" ||
    style === "double" ||
    style === "scribble" ||
    style === "arc" ||
    style === "circle" ||
    style === "brush";

  return (
    <Tag
      className={cn(
        "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--color-foreground)]",
        className,
      )}
      style={{
        textAlign: align === "center" ? "center" : "left",
        fontSize: "clamp(1.5rem, 2.4vw, 1.75rem)",
        lineHeight: 1.25,
        margin: 0,
      }}
    >
      {before ? <span>{before}</span> : null}
      <span
        className={cn(
          "sf-heading-highlight relative inline-block text-[var(--color-primary)]",
          showBox && "sf-heading-highlight--box",
          showMarker && "sf-heading-highlight--marker",
          showUnderline && "sf-heading-highlight--underline",
          showStripe && "sf-heading-highlight--stripe",
          showGlow && "sf-heading-highlight--glow",
          showStamp && "sf-heading-highlight--stamp",
          showBracket && "sf-heading-highlight--bracket",
          showRibbon && "sf-heading-highlight--ribbon",
          showCapsule && "sf-heading-highlight--capsule",
          showEditorial && "sf-heading-highlight--editorial",
          showGradient && "sf-heading-highlight--gradient",
          showSpark && "sf-heading-highlight--spark",
        )}
        data-highlight-style={style}
      >
        {accent}
        {showDeco ? <AccentDecoration style={style} /> : null}
      </span>
      {after ? <span>{after}</span> : null}
    </Tag>
  );
}

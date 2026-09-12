/**
 * Store-wide heading highlighter designs (Appearance → Typography).
 * Allow-listed only — never arbitrary CSS from the database.
 */

export const HEADING_HIGHLIGHT_STYLES = [
  "wavy",
  "box",
  "underline",
  "marker",
  "double",
  "scribble",
  "arc",
  "bracket",
  "stripe",
  "glow",
  "stamp",
  "circle",
  "brush",
  "ribbon",
  "capsule",
  "editorial",
  "gradient",
  "spark",
  "none",
] as const;

export type HeadingHighlightStyle = (typeof HEADING_HIGHLIGHT_STYLES)[number];

export const HEADING_HIGHLIGHT_PREMIUM_IDS = [
  "circle",
  "brush",
  "ribbon",
  "capsule",
  "editorial",
  "gradient",
  "spark",
  "glow",
  "stamp",
  "double",
] as const;

export const HEADING_HIGHLIGHT_STYLE_LABELS: Record<
  HeadingHighlightStyle,
  { title: string; description: string; premium?: boolean }
> = {
  wavy: {
    title: "Wavy underline",
    description: "Soft brush stroke under the word",
  },
  box: {
    title: "Outline box",
    description: "Thin square frame around the word",
  },
  underline: {
    title: "Straight underline",
    description: "Clean line under the word",
  },
  marker: {
    title: "Marker",
    description: "Soft filled highlight behind the word",
  },
  double: {
    title: "Box + wavy",
    description: "Outline frame with wavy underline",
    premium: true,
  },
  scribble: {
    title: "Scribble",
    description: "Loose multi-stroke underline",
  },
  arc: {
    title: "Arc",
    description: "Curved smile stroke under the word",
  },
  bracket: {
    title: "Brackets",
    description: "Corner brackets around the word",
  },
  stripe: {
    title: "Stripe",
    description: "Diagonal soft stripe fill",
  },
  glow: {
    title: "Glow",
    description: "Soft primary glow ring",
    premium: true,
  },
  stamp: {
    title: "Stamp",
    description: "Thick offset outline badge feel",
    premium: true,
  },
  circle: {
    title: "Hand circle",
    description: "Drawn oval around the accent word",
    premium: true,
  },
  brush: {
    title: "Brush stroke",
    description: "Bold paint stroke under the word",
    premium: true,
  },
  ribbon: {
    title: "Ribbon",
    description: "Soft banner wrap behind the word",
    premium: true,
  },
  capsule: {
    title: "Capsule",
    description: "Rounded pill outline — boutique feel",
    premium: true,
  },
  editorial: {
    title: "Editorial bar",
    description: "Thick short underline like a magazine",
    premium: true,
  },
  gradient: {
    title: "Gradient ink",
    description: "Premium gradient fill on the word",
    premium: true,
  },
  spark: {
    title: "Spark accents",
    description: "Tiny corner sparks for highlight drama",
    premium: true,
  },
  none: {
    title: "Color only",
    description: "Accent color with no decoration",
  },
};

export function isHeadingHighlightStyle(
  value: unknown,
): value is HeadingHighlightStyle {
  return (
    typeof value === "string" &&
    (HEADING_HIGHLIGHT_STYLES as readonly string[]).includes(value)
  );
}

export function coerceHeadingHighlightStyle(
  value: unknown,
  fallback: HeadingHighlightStyle = "double",
): HeadingHighlightStyle {
  return isHeadingHighlightStyle(value) ? value : fallback;
}

/**
 * Split a title and locate an accent span (single word or consecutive phrase).
 * Falls back to the last word when no match.
 */
export function resolveHeadingAccent(
  title: string,
  accentWord?: string | null,
): {
  before: string;
  accent: string;
  after: string;
} {
  const trimmed = title.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { before: "", accent: "", after: "" };
  }

  const preferred = accentWord?.trim();
  if (preferred) {
    const needle = preferred.toLowerCase().split(/\s+/).filter(Boolean);
    if (needle.length > 0) {
      for (let i = 0; i <= parts.length - needle.length; i++) {
        const slice = parts.slice(i, i + needle.length);
        if (
          slice.every(
            (w, j) => w.toLowerCase() === needle[j]!.toLowerCase(),
          )
        ) {
          return {
            before: i > 0 ? `${parts.slice(0, i).join(" ")} ` : "",
            accent: slice.join(" "),
            after:
              i + needle.length < parts.length
                ? ` ${parts.slice(i + needle.length).join(" ")}`
                : "",
          };
        }
      }
    }
  }

  const last = parts[parts.length - 1]!;
  return {
    before:
      parts.length > 1 ? `${parts.slice(0, -1).join(" ")} ` : "",
    accent: last,
    after: "",
  };
}

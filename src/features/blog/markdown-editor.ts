/**
 * Lightweight markdown helpers for the admin blog editor.
 * Storefront rendering lives in markdown.tsx (MarkdownContent).
 */

export function markdownImageSnippet(alt: string, url: string): string {
  const safeAlt = (alt || "Image").replace(/[\[\]]/g, "");
  return `![${safeAlt}](${url})`;
}

export type MarkdownSnippetId =
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "ul"
  | "ol"
  | "link"
  | "quote";

export function markdownSnippet(id: MarkdownSnippetId): string {
  switch (id) {
    case "h2":
      return "\n## Heading\n";
    case "h3":
      return "\n### Heading\n";
    case "bold":
      return "**bold text**";
    case "italic":
      return "*italic text*";
    case "ul":
      return "\n- List item\n- List item\n";
    case "ol":
      return "\n1. First\n2. Second\n";
    case "link":
      return "[link text](https://)";
    case "quote":
      return "\n> Quote\n";
    default:
      return "";
  }
}

/** Insert text at a textarea caret position (or append). */
export function insertAtCursor(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
): { next: string; caret: number } {
  const start = Math.max(0, selectionStart);
  const end = Math.max(start, selectionEnd);
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  return { next, caret: start + insertion.length };
}

import type { ReactNode } from "react";

function isSafeHref(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeImageSrc(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isSafeHref(trimmed)) return true;
  // Storage-looking relative paths (no scheme, no //)
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith("//")) {
    return !trimmed.includes("<") && !trimmed.includes(">");
  }
  return false;
}

type InlinePart =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlinePart[] }
  | { type: "italic"; children: InlinePart[] }
  | { type: "link"; href: string; children: InlinePart[] }
  | { type: "image"; src: string; alt: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let i = 0;

  while (i < text.length) {
    // Image ![alt](url)
    if (text[i] === "!" && text[i + 1] === "[") {
      const altEnd = text.indexOf("]", i + 2);
      if (altEnd !== -1 && text[altEnd + 1] === "(") {
        const urlEnd = text.indexOf(")", altEnd + 2);
        if (urlEnd !== -1) {
          const alt = text.slice(i + 2, altEnd);
          const src = text.slice(altEnd + 2, urlEnd);
          if (isSafeImageSrc(src)) {
            parts.push({ type: "image", src: src.trim(), alt });
          } else {
            parts.push({ type: "text", value: text.slice(i, urlEnd + 1) });
          }
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // Link [text](url)
    if (text[i] === "[") {
      const labelEnd = text.indexOf("]", i + 1);
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const urlEnd = text.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const label = text.slice(i + 1, labelEnd);
          const href = text.slice(labelEnd + 2, urlEnd);
          if (isSafeHref(href)) {
            parts.push({
              type: "link",
              href: href.trim(),
              children: parseInline(label),
            });
          } else {
            parts.push({ type: "text", value: text.slice(i, urlEnd + 1) });
          }
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // Bold **text**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        parts.push({
          type: "bold",
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // Italic *text* (single asterisk, not part of **)
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && text[end + 1] !== "*") {
        parts.push({
          type: "italic",
          children: parseInline(text.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }

    // Plain text until next special marker
    const starIdx = (() => {
      let idx = text.indexOf("*", i);
      while (idx !== -1 && text[idx + 1] === "*") {
        idx = text.indexOf("*", idx + 2);
      }
      return idx;
    })();
    const candidates = [
      text.indexOf("![", i),
      text.indexOf("[", i),
      text.indexOf("**", i),
      starIdx,
    ].filter((idx) => idx >= i);
    const next = candidates.length ? Math.min(...candidates) : text.length;
    if (next === i) {
      parts.push({ type: "text", value: text[i]! });
      i += 1;
    } else {
      parts.push({ type: "text", value: text.slice(i, next) });
      i = next;
    }
  }

  return parts;
}

function renderInline(parts: InlinePart[], keyPrefix: string): ReactNode[] {
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (part.type) {
      case "text":
        return <span key={key}>{part.value}</span>;
      case "bold":
        return <strong key={key}>{renderInline(part.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderInline(part.children, key)}</em>;
      case "link":
        return (
          <a key={key} href={part.href} rel="noopener noreferrer">
            {renderInline(part.children, key)}
          </a>
        );
      case "image":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key} src={part.src} alt={part.alt} />
        );
      default:
        return null;
    }
  });
}

type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "blockquote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "hr" };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith(">")) {
        const q = (lines[i] ?? "").trim().replace(/^>\s?/, "");
        quoteLines.push(q);
        i += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (
        !next ||
        next.startsWith("#") ||
        next.startsWith(">") ||
        next === "---" ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }

  return blocks;
}

/**
 * Limited markdown renderer — no external deps, no dangerouslySetInnerHTML.
 * Text nodes are rendered as React children (auto-escaped).
 */
export function MarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content ?? "");

  return (
    <div className="blog-markdown">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case "h1":
            return <h1 key={key}>{renderInline(parseInline(block.text), key)}</h1>;
          case "h2":
            return <h2 key={key}>{renderInline(parseInline(block.text), key)}</h2>;
          case "h3":
            return <h3 key={key}>{renderInline(parseInline(block.text), key)}</h3>;
          case "p":
            return <p key={key}>{renderInline(parseInline(block.text), key)}</p>;
          case "blockquote":
            return (
              <blockquote key={key}>
                {renderInline(parseInline(block.text), key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} />;
          case "ul":
            return (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(parseInline(item), `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(parseInline(item), `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

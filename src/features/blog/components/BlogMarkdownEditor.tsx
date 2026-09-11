"use client";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import LinkIcon from "@mui/icons-material/Link";
import TitleIcon from "@mui/icons-material/Title";
import { useState, type ReactNode, type RefObject } from "react";
import {
  insertAtCursor,
  markdownImageSnippet,
  markdownSnippet,
  type MarkdownSnippetId,
} from "@/features/blog/markdown-editor";
import { MarkdownContent } from "@/features/blog/markdown";
import { cn } from "@/lib/cn";

type Tool = {
  id: MarkdownSnippetId | "image";
  label: string;
  icon: ReactNode;
};

const TOOLS: Tool[] = [
  { id: "h2", label: "Heading", icon: <TitleIcon fontSize="small" /> },
  {
    id: "h3",
    label: "Subheading",
    icon: <TitleIcon fontSize="small" className="!text-[1rem] opacity-80" />,
  },
  { id: "bold", label: "Bold", icon: <FormatBoldIcon fontSize="small" /> },
  { id: "italic", label: "Italic", icon: <FormatItalicIcon fontSize="small" /> },
  {
    id: "ul",
    label: "Bullet list",
    icon: <FormatListBulletedIcon fontSize="small" />,
  },
  {
    id: "ol",
    label: "Numbered list",
    icon: <FormatListNumberedIcon fontSize="small" />,
  },
  { id: "link", label: "Link", icon: <LinkIcon fontSize="small" /> },
  { id: "quote", label: "Quote", icon: <FormatQuoteIcon fontSize="small" /> },
  {
    id: "image",
    label: "Add image",
    icon: <ImageOutlinedIcon fontSize="small" />,
  },
];

type BlogMarkdownEditorProps = {
  value: string;
  onChange: (next: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  onRequestImage?: () => void;
};

export function BlogMarkdownEditor({
  value,
  onChange,
  textareaRef,
  disabled,
  error,
  helperText,
  onRequestImage,
}: BlogMarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  function applySnippet(id: MarkdownSnippetId) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    let insertion = markdownSnippet(id);

    if (selected && (id === "bold" || id === "italic" || id === "link")) {
      if (id === "bold") insertion = `**${selected}**`;
      if (id === "italic") insertion = `*${selected}*`;
      if (id === "link") insertion = `[${selected}](https://)`;
    }

    const { next, caret } = insertAtCursor(value, insertion, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      if (selected && (id === "bold" || id === "italic")) {
        node.setSelectionRange(start, start + insertion.length);
      } else {
        node.setSelectionRange(caret, caret);
      }
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-default,0.75rem)] border bg-[var(--color-card)]",
        error ? "border-[var(--color-error)]" : "border-[var(--color-border)]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] px-2 py-1.5">
        <div
          className="flex flex-wrap gap-0.5"
          role="toolbar"
          aria-label="Writing tools"
        >
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              disabled={disabled}
              title={tool.label}
              aria-label={tool.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] hover:text-[var(--color-primary)] disabled:opacity-40"
              onClick={() => {
                if (tool.id === "image") {
                  onRequestImage?.();
                  return;
                }
                applySnippet(tool.id);
              }}
            >
              {tool.icon}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-[var(--color-border)] p-0.5 text-xs font-semibold">
          <button
            type="button"
            className={cn(
              "rounded px-2.5 py-1.5",
              tab === "write"
                ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                : "text-[var(--color-muted)]",
            )}
            onClick={() => setTab("write")}
          >
            Write
          </button>
          <button
            type="button"
            className={cn(
              "rounded px-2.5 py-1.5",
              tab === "preview"
                ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                : "text-[var(--color-muted)]",
            )}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <label className="block">
          <span className="sr-only">Article text</span>
          <textarea
            ref={textareaRef}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            rows={18}
            placeholder={
              "Write your article here…\n\nTip: select text, then tap Bold or Link."
            }
            className="block w-full resize-y border-0 bg-transparent px-4 py-3 font-[family-name:var(--font-sans)] text-[0.95rem] leading-relaxed text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted)] disabled:opacity-60"
          />
        </label>
      ) : (
        <div className="min-h-[18rem] px-4 py-4">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Nothing to preview yet. Switch to Write and add your story.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
        <p>You can add headings, lists, links, and images.</p>
        {helperText ? (
          <p className="text-[var(--color-error)]">{helperText}</p>
        ) : null}
      </div>
    </div>
  );
}

export function insertMarkdownImageAtCaret(
  value: string,
  textarea: HTMLTextAreaElement | null,
  url: string,
  alt = "Image",
): { next: string; caret: number } {
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;
  return insertAtCursor(value, markdownImageSnippet(alt, url), start, end);
}

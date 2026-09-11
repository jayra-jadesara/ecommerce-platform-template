"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FacebookIcon from "@mui/icons-material/Facebook";
import IosShareIcon from "@mui/icons-material/IosShare";
import CheckIcon from "@mui/icons-material/Check";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type BlogShareButtonsProps = {
  url: string;
  title: string;
  className?: string;
};

function isSafeAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-1.24.241a1.54 1.54 0 01-.46.069c-.773 0-1.474-.297-2.01-.792A9.935 9.935 0 012.16 12.05C2.161 6.59 6.59 2.16 12.05 2.16c2.652 0 5.146 1.034 7.019 2.912a9.86 9.86 0 012.91 7.012c-.003 5.46-4.432 9.89-9.928 9.89" />
    </svg>
  );
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

const btnClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] text-[var(--color-foreground)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

function ShareChip({
  href,
  onClick,
  label,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <a
        className={btnClass}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={btnClass}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function BlogShareButtons({
  url,
  title,
  className,
}: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  /** Detect after mount — navigator.share differs between SSR and client. */
  const [canNativeShare, setCanNativeShare] = useState(false);
  const safeUrl = isSafeAbsoluteUrl(url) ? url : "";

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const shareNative = useCallback(async () => {
    if (!safeUrl || typeof navigator.share !== "function") return;
    try {
      await navigator.share({ title, url: safeUrl });
    } catch {
      /* cancelled */
    }
  }, [safeUrl, title]);

  const copyLink = useCallback(async () => {
    if (!safeUrl) return;
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [safeUrl]);

  if (!safeUrl) return null;

  const encodedUrl = encodeURIComponent(safeUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <p className="mr-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        Share
      </p>
      {canNativeShare ? (
        <ShareChip label="Share" onClick={shareNative}>
          <IosShareIcon fontSize="small" />
        </ShareChip>
      ) : null}
      <ShareChip
        label="WhatsApp"
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
      >
        <WhatsAppGlyph />
      </ShareChip>
      <ShareChip
        label="Facebook"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
      >
        <FacebookIcon fontSize="small" />
      </ShareChip>
      <ShareChip
        label="X"
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
      >
        <XGlyph />
      </ShareChip>
      <ShareChip label={copied ? "Copied" : "Copy link"} onClick={copyLink}>
        {copied ? (
          <CheckIcon fontSize="small" className="!text-[var(--color-success)]" />
        ) : (
          <ContentCopyIcon fontSize="small" />
        )}
      </ShareChip>
    </div>
  );
}

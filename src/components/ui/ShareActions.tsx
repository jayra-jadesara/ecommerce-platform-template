"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import CheckIcon from "@mui/icons-material/Check";
import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ShareProfileLinks = {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  x?: string;
};

type ShareActionsProps = {
  url: string;
  title: string;
  className?: string;
  /** Store profile URLs for Instagram / YouTube (and optional overrides). */
  profiles?: ShareProfileLinks;
  label?: string;
};

function isSafeAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="15"
      height="15"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

/** Quiet icon control — no solid brand tiles. */
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
  const className =
    "sf-share-chip inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

  if (href) {
    return (
      <a
        className={className}
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
      className={className}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function ShareActions({
  url,
  title,
  className,
  profiles,
  label = "Share",
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const safeUrl = isSafeAbsoluteUrl(url) ? url : "";

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

  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const xShare = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const igProfile = profiles?.instagram?.trim();
  const ytProfile = profiles?.youtube?.trim();
  const igHref =
    igProfile && isSafeAbsoluteUrl(igProfile) ? igProfile : undefined;
  const ytHref =
    ytProfile && isSafeAbsoluteUrl(ytProfile) ? ytProfile : undefined;

  return (
    <div className={cn("flex flex-wrap items-center gap-0.5", className)}>
      <p className="mr-1.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </p>
      <ShareChip label="Facebook" href={fbShare}>
        <FacebookIcon sx={{ fontSize: 17 }} />
      </ShareChip>
      <ShareChip
        label="YouTube"
        href={ytHref}
        onClick={ytHref ? undefined : copyLink}
      >
        <YouTubeIcon sx={{ fontSize: 17 }} />
      </ShareChip>
      <ShareChip
        label={
          igHref
            ? "Instagram"
            : "Copy link (add Instagram URL in Store settings)"
        }
        href={igHref}
        onClick={igHref ? undefined : copyLink}
      >
        <InstagramIcon sx={{ fontSize: 17 }} />
      </ShareChip>
      <ShareChip label="X" href={xShare}>
        <XGlyph />
      </ShareChip>
      <ShareChip label={copied ? "Copied" : "Copy link"} onClick={copyLink}>
        {copied ? (
          <CheckIcon sx={{ fontSize: 17 }} />
        ) : (
          <ContentCopyIcon sx={{ fontSize: 15 }} />
        )}
      </ShareChip>
    </div>
  );
}

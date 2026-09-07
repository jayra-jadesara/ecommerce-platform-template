"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type { AnnouncementConfig } from "@/types";

interface AnnouncementBarProps {
  announcement: AnnouncementConfig;
}

export function AnnouncementBar({ announcement }: AnnouncementBarProps) {
  if (!announcement.enabled || !announcement.text?.trim()) return null;

  const content = (
    <p className="text-center text-sm font-medium text-[var(--color-button-foreground)]">
      {announcement.text}
    </p>
  );

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-button-background)]">
      <Container className="py-2">
        {announcement.url ? (
          <Link
            href={announcement.url}
            target={announcement.openInNewTab ? "_blank" : undefined}
            rel={announcement.openInNewTab ? "noopener noreferrer" : undefined}
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </Container>
    </div>
  );
}

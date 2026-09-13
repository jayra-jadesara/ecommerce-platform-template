"use client";

import Link from "next/link";
import { HeaderAccountMenu } from "@/components/common/HeaderAccountMenu";

/** @deprecated Prefer HeaderAccountMenu — kept for existing imports. */
export function HeaderAuthLinks({ compact = false }: { compact?: boolean }) {
  return <HeaderAccountMenu compact={compact} />;
}

export function HeaderAuthFallbackLinks() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-md px-2 py-1 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      >
        Sign in
      </Link>
    </div>
  );
}

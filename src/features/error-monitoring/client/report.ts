"use client";

import type { ErrorSource, ErrorType } from "@/features/error-monitoring/types";

export type ClientErrorReportPayload = {
  message: string;
  stack?: string | null;
  route?: string | null;
  pageName?: string | null;
  source?: ErrorSource;
  type?: ErrorType;
  fileName?: string | null;
  lineNumber?: number | null;
  columnNumber?: number | null;
  operation?: string | null;
  feature?: string | null;
  errorCode?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  deviceType?: string | null;
  /** Client-side dedupe key (not trusted for identity). */
  clientFingerprint?: string | null;
};

const recent = new Map<string, number>();
const DEDUPE_MS = 15_000;

function dedupeKey(payload: ClientErrorReportPayload): string {
  return [
    payload.type ?? "BROWSER",
    payload.route ?? "",
    (payload.message ?? "").slice(0, 120),
    payload.fileName ?? "",
    payload.lineNumber ?? "",
    payload.clientFingerprint ?? "",
  ].join("|");
}

function shouldSkip(payload: ClientErrorReportPayload): boolean {
  const key = dedupeKey(payload);
  const now = Date.now();
  const prev = recent.get(key);
  if (prev && now - prev < DEDUPE_MS) return true;
  recent.set(key, now);
  if (recent.size > 200) {
    for (const [k, t] of recent) {
      if (now - t > DEDUPE_MS) recent.delete(k);
    }
  }
  return false;
}

/**
 * Fire-and-forget browser error report. Never throws. Never blocks UX.
 */
export function reportClientError(payload: ClientErrorReportPayload): void {
  void reportClientErrorAsync(payload);
}

/**
 * Same as reportClientError but resolves with the server referenceId when available.
 * Returns null when deduped, offline, or the request fails.
 */
export async function reportClientErrorAsync(
  payload: ClientErrorReportPayload,
): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!payload.message?.trim()) return null;
    if (shouldSkip(payload)) return null;

    const body = JSON.stringify({
      ...payload,
      route: payload.route ?? window.location.pathname,
      userAgent: navigator.userAgent?.slice(0, 500),
    });

    const res = await fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { referenceId?: string };
    return typeof data.referenceId === "string" ? data.referenceId : null;
  } catch {
    return null;
  }
}

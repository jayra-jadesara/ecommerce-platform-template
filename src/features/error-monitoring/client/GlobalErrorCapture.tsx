"use client";

import { useEffect, useRef } from "react";
import { reportClientError } from "@/features/error-monitoring/client/report";

function parseUserAgent(ua: string): {
  browserName: string;
  browserVersion: string;
  os: string;
  deviceType: string;
} {
  const deviceType = /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
  let browserName = "Unknown";
  let browserVersion = "";
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  const edge = ua.match(/Edg\/([\d.]+)/);
  if (edge) {
    browserName = "Edge";
    browserVersion = edge[1] ?? "";
  } else if (chrome && !/Edg\//.test(ua)) {
    browserName = "Chrome";
    browserVersion = chrome[1] ?? "";
  } else if (firefox) {
    browserName = "Firefox";
    browserVersion = firefox[1] ?? "";
  } else if (safari) {
    browserName = "Safari";
    browserVersion = safari[1] ?? "";
  }
  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  return { browserName, browserVersion, os, deviceType };
}

/**
 * Captures window.onerror and unhandledrejection once per app mount.
 * Dedupes with React boundaries via client report fingerprint window.
 */
export function GlobalErrorCapture() {
  const installed = useRef(false);

  useEffect(() => {
    if (installed.current) return;
    installed.current = true;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const env = parseUserAgent(ua);

    const onError = (event: ErrorEvent) => {
      const msg = event.message || event.error?.message || "Browser error";
      reportClientError({
        type: "BROWSER",
        source: "CLIENT",
        message: msg,
        stack: event.error?.stack ?? null,
        fileName: event.filename || null,
        lineNumber: event.lineno || null,
        columnNumber: event.colno || null,
        route: window.location.pathname,
        ...env,
        clientFingerprint: `win:${event.filename ?? ""}:${event.lineno ?? ""}:${msg.slice(0, 80)}`,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      const stack = reason instanceof Error ? reason.stack : null;
      reportClientError({
        type: "BROWSER",
        source: "CLIENT",
        message,
        stack: stack ?? null,
        route: window.location.pathname,
        operation: "UNHANDLED_REJECTION",
        ...env,
        clientFingerprint: `rej:${message.slice(0, 100)}`,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      installed.current = false;
    };
  }, []);

  return null;
}

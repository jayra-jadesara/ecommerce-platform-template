"use client";

import { useCallback, useRef } from "react";
import type {
  CheckoutPaymentSession,
  RazorpayCheckoutSuccessPayload,
} from "@/features/payments/types";

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const FALLBACK_THEME = "#9f1239";

function loadRazorpayScript(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay requires a browser."));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Razorpay) resolve(window.Razorpay);
        else reject(new Error("Razorpay failed to load."));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Razorpay failed to load.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay failed to load."));
    };
    script.onerror = () => reject(new Error("Razorpay failed to load."));
    document.body.appendChild(script);
  });
}

/** Resolve absolute logo URL Razorpay can load over HTTPS. */
function resolveBrandImage(logoUrl?: string): string | undefined {
  if (!logoUrl?.trim()) return undefined;
  try {
    return new URL(logoUrl, window.location.origin).href;
  } catch {
    return undefined;
  }
}

/**
 * Prefer server theme hex; fall back to live CSS primary so checkout
 * matches the storefront even if session color was missing/invalid.
 */
function resolveThemeColor(preferred?: string): string {
  if (preferred && /^#[0-9a-fA-F]{6}$/.test(preferred)) {
    return preferred.toLowerCase();
  }

  try {
    const probe = document.createElement("span");
    probe.style.color = "var(--color-primary)";
    probe.style.display = "none";
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const rgb = computed.match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
    );
    if (rgb) {
      const channel = (n: string) =>
        Math.max(0, Math.min(255, Math.round(Number(n))))
          .toString(16)
          .padStart(2, "0");
      return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
    }
  } catch {
    /* ignore */
  }

  return preferred && /^#[0-9a-fA-F]{3,8}$/.test(preferred)
    ? preferred
    : FALLBACK_THEME;
}

export function useRazorpayCheckout() {
  const openingRef = useRef(false);

  const openCheckout = useCallback(
    async (input: {
      session: CheckoutPaymentSession;
      onSuccess: (payload: RazorpayCheckoutSuccessPayload) => void;
      onDismiss?: () => void;
    }) => {
      if (openingRef.current) return;
      openingRef.current = true;
      try {
        const Razorpay = await loadRazorpayScript();
        const themeColor = resolveThemeColor(input.session.themeColor);
        const image = resolveBrandImage(input.session.brandLogoUrl);

        const instance = new Razorpay({
          key: input.session.keyId,
          amount: input.session.amountMinor,
          currency: input.session.currency,
          name: input.session.brandName,
          description: input.session.description,
          ...(image ? { image } : {}),
          order_id: input.session.razorpayOrderId,
          prefill: input.session.prefill ?? {},
          handler: (response: RazorpayCheckoutSuccessPayload) => {
            input.onSuccess(response);
          },
          modal: {
            ondismiss: () => {
              input.onDismiss?.();
            },
          },
          theme: {
            color: themeColor,
          },
        });
        instance.open();
      } finally {
        openingRef.current = false;
      }
    },
    [],
  );

  return { openCheckout };
}

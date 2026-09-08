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
        const instance = new Razorpay({
          key: input.session.keyId,
          amount: input.session.amountMinor,
          currency: input.session.currency,
          name: input.session.brandName,
          description: input.session.description,
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
            color: "var(--color-primary)",
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

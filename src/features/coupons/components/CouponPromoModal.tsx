"use client";

import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StorefrontFeaturedCoupon } from "@/features/coupons/types";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "featured-coupon-promo-dismissed";
const EXIT_MS = 280;

interface CouponPromoModalProps {
  promo: StorefrontFeaturedCoupon;
}

export function CouponPromoModal({ promo }: CouponPromoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [copied, setCopied] = useState(false);
  const closingRef = useRef(false);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === promo.code) return;
    } catch {
      /* ignore */
    }
    const openTimer = window.setTimeout(() => {
      setMounted(true);
      closingRef.current = false;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
    }, 600);
    return () => {
      window.clearTimeout(openTimer);
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    };
  }, [promo.code]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  function persistDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, promo.code);
    } catch {
      /* ignore */
    }
  }

  function dismiss() {
    if (closingRef.current || !mounted) return;
    closingRef.current = true;
    setEntered(false);
    persistDismiss();
    exitTimer.current = window.setTimeout(() => {
      setMounted(false);
      closingRef.current = false;
    }, EXIT_MS);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4 transition-[opacity,backdrop-filter] ease-out",
        entered
          ? "bg-[color-mix(in_srgb,var(--color-foreground)_48%,transparent)] opacity-100 backdrop-blur-md"
          : "bg-[color-mix(in_srgb,var(--color-foreground)_20%,transparent)] opacity-0 backdrop-blur-none",
      )}
      style={{ transitionDuration: `${EXIT_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-promo-title"
      onClick={dismiss}
    >
      <div
        className={cn(
          "relative grid w-full max-w-3xl overflow-hidden rounded-2xl border-0 bg-[var(--color-card)] outline-none shadow-[0_24px_80px_color-mix(in_srgb,var(--color-foreground)_28%,transparent)] transition-[opacity,transform] ease-out md:grid-cols-2",
          entered
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-[0.96] opacity-0",
        )}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close offer"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-card)] text-[var(--color-muted)] shadow-sm hover:text-[var(--color-foreground)] md:bg-transparent"
        >
          <CloseRoundedIcon className="!text-[1.25rem]" />
        </button>

        <div className="relative flex min-h-[220px] flex-col justify-between bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_88%,#1a1a1a),color-mix(in_srgb,var(--color-accent)_70%,var(--color-primary)))] p-6 text-[var(--color-button-foreground)] md:min-h-[360px]">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight tracking-tight md:text-3xl">
            {promo.offerLabel}
            <span className="mt-1 block text-base font-medium opacity-90">
              ON YOUR ORDER
            </span>
          </p>
          {promo.imageUrl ? (
            <div className="relative mx-auto mt-4 h-36 w-full max-w-[220px] md:h-44">
              <Image
                src={promo.imageUrl}
                alt=""
                fill
                unoptimized
                className="object-contain drop-shadow-lg"
                sizes="220px"
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-1 items-end">
              <p className="text-sm opacity-80">Exclusive store offer</p>
            </div>
          )}
          <p className="mt-4 inline-flex w-fit rounded-full bg-[var(--color-card)] px-3 py-1.5 text-xs font-bold tracking-wide text-[var(--color-primary)]">
            USE CODE {promo.code}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-5 p-6 md:p-8">
          <div>
            <h2
              id="coupon-promo-title"
              className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight text-[var(--color-foreground)] md:text-[1.75rem]"
            >
              {promo.headline}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {promo.subtext ||
                `Use code ${promo.code} at checkout to unlock this offer.`}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Use code
            </p>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-[var(--color-border)]">
              <p className="flex min-w-0 flex-1 items-center px-4 py-3 font-[family-name:var(--font-display)] text-xl font-bold tracking-wide">
                {promo.code}
              </p>
              <button
                type="button"
                onClick={copyCode}
                aria-label={copied ? "Copied" : "Copy coupon code"}
                className="inline-flex w-12 shrink-0 items-center justify-center bg-[var(--color-primary)] text-[var(--color-button-foreground)] transition hover:opacity-90"
              >
                <ContentCopyOutlinedIcon className="!text-[1.15rem]" />
              </button>
            </div>
            {copied ? (
              <p className="mt-1.5 text-xs font-medium text-[var(--color-success)]">
                Copied — paste at checkout
              </p>
            ) : null}
          </div>

          <Link
            href="/products"
            onClick={dismiss}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-button-background)] px-6 text-sm font-semibold text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Shop now
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  bannerStripSolid,
  bannerStripTextColor,
} from "@/features/cms/banner-strip-style";
import type { BannerRow } from "@/features/cms/types";
import { cn } from "@/lib/cn";

const ROTATE_MS = 4000;

/** Right-edge zig-zag for the ticket stub (clip-path). */
const STUB_ZIGZAG =
  "polygon(0 0, calc(100% - 7px) 0, 100% 3.5px, calc(100% - 7px) 7px, 100% 10.5px, calc(100% - 7px) 14px, 100% 17.5px, calc(100% - 7px) 21px, 100% 24.5px, calc(100% - 7px) 28px, 100% 31.5px, calc(100% - 7px) 35px, 100% 38.5px, calc(100% - 7px) 42px, 100% 45.5px, calc(100% - 7px) 49px, 100% 52.5px, calc(100% - 7px) 56px, 100% 59.5px, calc(100% - 7px) 63px, 100% 66.5px, calc(100% - 7px) 70px, 100% 73.5px, calc(100% - 7px) 77px, 100% 80.5px, calc(100% - 7px) 84px, 100% 87.5px, calc(100% - 7px) 91px, 100% 94.5px, calc(100% - 7px) 98px, 100% 100%, 0 100%)";

/**
 * Homepage coupon ticket strip for Content → Banners.
 * Auto-rotates when multiple banners are live.
 */
export function StorefrontPromoBanners({ banners }: { banners: BannerRow[] }) {
  const visible = banners.filter((b) => b.title.trim());
  if (!visible.length) return null;

  return (
    <section aria-label="Promotions" className="bg-[var(--color-background)]">
      <div className="px-1.5 py-2.5 sm:px-2.5 md:px-3 md:py-3">
        <PromoStripSlider banners={visible} />
      </div>
    </section>
  );
}

function PromoStripSlider({ banners }: { banners: BannerRow[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const multi = banners.length > 1;

  useEffect(() => {
    if (!multi || paused) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [banners.length, multi, paused]);

  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  const banner = banners[index] ?? banners[0];
  if (!banner) return null;

  const href = banner.linkUrl?.trim() || null;
  const ticket = (
    <TicketStrip
      title={banner.title}
      description={banner.description}
      buttonText={banner.buttonText}
      backgroundColor={banner.backgroundColor}
      multi={multi}
      activeIndex={index}
      bannerIds={banners.map((b) => b.id)}
    />
  );

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "transition-[transform,filter] duration-300",
        href && "hover:brightness-[1.03] motion-safe:hover:-translate-y-px",
      )}
    >
      {href ? (
        <Link
          href={href}
          className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          aria-label={banner.title}
        >
          {ticket}
        </Link>
      ) : (
        ticket
      )}
    </div>
  );
}

export function TicketStrip({
  title,
  description,
  buttonText,
  backgroundColor,
  multi,
  activeIndex = 0,
  bannerIds,
  compact,
  notchColor = "var(--color-background)",
}: {
  title: string;
  description?: string | null;
  buttonText?: string | null;
  backgroundColor?: string | null;
  multi?: boolean;
  activeIndex?: number;
  bannerIds?: string[];
  compact?: boolean;
  /** Color that punches the semicircle notches (page/card behind the ticket). */
  notchColor?: string;
}) {
  const textColor = bannerStripTextColor(backgroundColor);
  const muted =
    textColor === "#FFFFFF" ? "rgba(255,255,255,0.92)" : "rgba(17,17,17,0.78)";
  const dash =
    textColor === "#FFFFFF" ? "rgba(255,255,255,0.5)" : "rgba(17,17,17,0.3)";
  const chipBg =
    textColor === "#FFFFFF" ? "rgba(255,255,255,0.22)" : "rgba(17,17,17,0.1)";
  const fill = bannerStripSolid(backgroundColor);
  const offer = title.trim() || "Offer text";
  const support = description?.trim() || null;
  const cta = buttonText?.trim() || null;
  /** Stub holds the offer (+ chip). Main holds supporting copy when set. */
  const offerInStub = Boolean(support);
  const hasStub = offerInStub || Boolean(cta);
  const ids = bannerIds ?? [];
  const mainText = offerInStub ? support! : offer;
  const mainIsSupport = offerInStub;

  return (
    <div
      className={cn(
        "relative w-full",
        compact ? "min-h-11" : "min-h-[3.35rem] md:min-h-[3.75rem]",
      )}
      style={
        {
          filter:
            "drop-shadow(0 8px 18px color-mix(in srgb, var(--color-foreground) 14%, transparent))",
          "--ticket-notch": notchColor,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "relative flex w-full items-stretch overflow-visible",
          compact ? "min-h-11" : "min-h-[3.35rem] md:min-h-[3.75rem]",
        )}
      >
        {/* First section — supporting line (or offer if no supporting copy) */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-l-[10px] text-center",
            hasStub ? "px-4 sm:px-6 md:px-8" : "rounded-r-[10px] pr-[7px]",
            compact ? "py-2 sm:px-4" : "py-2.5 md:py-3",
          )}
          style={{ background: fill, color: textColor }}
        >
          <PatternOverlay />
          <p
            className={cn(
              "relative z-[1] mx-auto max-w-3xl leading-snug tracking-tight",
              mainIsSupport
                ? cn(
                    "font-medium",
                    compact
                      ? "text-[11px] sm:text-xs"
                      : "text-xs sm:text-sm md:text-[0.9375rem]",
                  )
                : cn(
                    "font-bold",
                    compact
                      ? "text-xs sm:text-sm"
                      : "text-sm sm:text-base md:text-[1.05rem]",
                  ),
            )}
            style={mainIsSupport ? { color: muted } : undefined}
          >
            {mainText}
          </p>
          {!hasStub && multi && ids.length > 1 ? (
            <Dots
              ids={ids}
              activeIndex={activeIndex}
              textColor={textColor}
            />
          ) : null}
        </div>

        {hasStub ? (
          <>
            <div
              className="relative z-[2] w-0 shrink-0 self-stretch"
              aria-hidden
            >
              <span
                className="absolute left-1/2 top-0 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor:
                    "var(--ticket-notch, var(--color-background))",
                }}
              />
              <span
                className="absolute bottom-0 left-1/2 size-[18px] -translate-x-1/2 translate-y-1/2 rounded-full"
                style={{
                  backgroundColor:
                    "var(--ticket-notch, var(--color-background))",
                }}
              />
              <span
                className="absolute left-1/2 top-[11px] bottom-[11px] w-px -translate-x-1/2"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, ${dash} 0 4px, transparent 4px 9px)`,
                }}
              />
            </div>

            {/* Stub — offer text + button chip */}
            <div
              className={cn(
                "relative flex w-[min(42%,15.5rem)] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden text-center sm:w-[min(34%,16.5rem)] md:w-[min(30%,17rem)]",
                compact ? "py-1.5 pl-3 pr-4" : "py-2 pl-3.5 pr-5 sm:pl-4",
              )}
              style={{
                background: fill,
                color: textColor,
                clipPath: STUB_ZIGZAG,
              }}
            >
              <PatternOverlay />
              {offerInStub ? (
                <p
                  className={cn(
                    "relative z-[1] font-bold leading-snug tracking-tight",
                    compact
                      ? "text-[11px] sm:text-xs"
                      : "text-xs sm:text-sm md:text-[0.9375rem]",
                  )}
                >
                  {offer}
                </p>
              ) : null}
              {cta ? (
                <span
                  className={cn(
                    "relative z-[1] inline-flex items-center rounded-full font-semibold tracking-wide",
                    compact
                      ? "min-h-5 px-2 text-[9px]"
                      : "min-h-6 px-2.5 text-[10px] sm:min-h-7 sm:text-[11px]",
                  )}
                  style={{ backgroundColor: chipBg, color: textColor }}
                >
                  {cta}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {hasStub && multi && ids.length > 1 ? (
        <Dots ids={ids} activeIndex={activeIndex} textColor={textColor} />
      ) : null}
    </div>
  );
}

function PatternOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.16]"
      aria-hidden
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 120% at 30% 50%, rgba(255,255,255,0.4) 0%, transparent 55%), repeating-linear-gradient(115deg, transparent 0 11px, rgba(255,255,255,0.07) 11px 12px)",
      }}
    />
  );
}

function Dots({
  ids,
  activeIndex,
  textColor,
}: {
  ids: string[];
  activeIndex: number;
  textColor: string;
}) {
  return (
    <div
      className="absolute bottom-1.5 left-1/2 z-[3] flex -translate-x-1/2 gap-1.5"
      aria-hidden
    >
      {ids.map((id, i) => (
        <span
          key={id}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i === activeIndex ? "w-3 opacity-100" : "w-1 opacity-40",
          )}
          style={{ backgroundColor: textColor }}
        />
      ))}
    </div>
  );
}

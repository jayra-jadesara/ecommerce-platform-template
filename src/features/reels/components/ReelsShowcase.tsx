"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontReel } from "@/features/reels/types";
import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";
import { sfBtn } from "@/components/ui/storefront-classes";
import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";
import { cn } from "@/lib/cn";

type ReelPopupProps = {
  reels: StorefrontReel[];
  index: number;
  currency: string;
  storeName?: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

function NavArrow({
  side,
  disabled,
  onClick,
  label,
}: {
  side: "left" | "right";
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/90 text-[var(--color-foreground)] shadow-lg backdrop-blur-md transition sm:inline-flex",
        "hover:bg-white disabled:pointer-events-none disabled:opacity-35",
        side === "left" ? "mr-2 lg:mr-4" : "ml-2 lg:ml-4",
      )}
    >
      {side === "left" ? (
        <ChevronLeftIcon fontSize="small" />
      ) : (
        <ChevronRightIcon fontSize="small" />
      )}
    </button>
  );
}

export function ReelPopup({
  reels,
  index,
  currency,
  storeName,
  onIndexChange,
  onClose,
}: ReelPopupProps) {
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const productRailRef = useRef<HTMLDivElement>(null);
  const reel = reels[index] ?? reels[0];
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [mounted, setMounted] = useState(false);

  const hasPrev = index > 0;
  const hasNext = index < reels.length - 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index < reels.length - 1) onIndexChange(index + 1);
  }, [index, onIndexChange, reels.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const rail = productRailRef.current;
    if (rail) rail.scrollLeft = 0;
  }, [reel?.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !reel) return;

    let cancelled = false;
    el.muted = muted;
    el.defaultMuted = muted;
    el.setAttribute("playsinline", "true");
    el.disablePictureInPicture = true;

    const tryPlay = () => {
      if (cancelled) return;
      void el
        .play()
        .then(() => {
          if (!cancelled) setPlaying(true);
        })
        .catch(() => {
          if (!cancelled) setPlaying(false);
        });
    };

    tryPlay();
    el.addEventListener("loadeddata", tryPlay);
    return () => {
      cancelled = true;
      el.removeEventListener("loadeddata", tryPlay);
      el.pause();
    };
  }, [reel?.id, muted, reel?.videoUrl]);

  if (!reel || !mounted) return null;

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function scrollProducts(dir: -1 | 1) {
    const rail = productRailRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: dir * Math.max(180, rail.clientWidth * 0.7),
      behavior: "smooth",
    });
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto px-3 py-6 sm:px-5 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      {/* Full-viewport frost — must portal to body so header/footer blur too */}
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-background)_42%,transparent)] backdrop-blur-2xl"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-foreground)_22%,transparent)]"
        aria-hidden
      />

      <div
        className="relative z-[1] flex w-full max-w-[min(100%,42rem)] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <NavArrow
          side="left"
          label="Previous reel"
          disabled={!hasPrev}
          onClick={goPrev}
        />

        <div
          className="flex w-full max-w-[min(100%,20.5rem)] flex-col overflow-hidden rounded-[1.35rem] bg-[var(--color-card)] shadow-[0_28px_80px_color-mix(in_srgb,var(--color-foreground)_28%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_55%,var(--color-border))]"
          style={{
            maxHeight: "min(86dvh, 720px)",
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_40%,var(--color-card))] px-3 py-2.5">
            <div className="min-w-0">
              {storeName ? (
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  {storeName}
                </p>
              ) : null}
              <h2
                id={titleId}
                className={cn(
                  "truncate text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]",
                  storeName && "mt-0.5",
                )}
              >
                {reel.title || "Reel"}
              </h2>
              <p className="text-[10px] text-[var(--color-muted)]">
                {index + 1} / {reels.length}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {reel.instagramUrl ? (
                <Tooltip title="Instagram link">
                  <a
                    href={reel.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] hover:text-[var(--color-primary)]"
                    aria-label="Instagram link"
                  >
                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                  </a>
                </Tooltip>
              ) : null}
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] hover:text-[var(--color-foreground)]"
                onClick={onClose}
                aria-label="Close"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>

          <div
            className="relative mx-auto w-full shrink-0 overflow-hidden bg-black"
            style={{
              aspectRatio: "9 / 16",
              maxHeight: "min(58dvh, 480px)",
            }}
          >
            <video
              key={reel.videoUrl}
              ref={videoRef}
              src={reel.videoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted={muted}
              loop
              autoPlay
              controls={false}
              preload="auto"
              disablePictureInPicture
              controlsList="nodownload noplaybackrate noremoteplayback"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />

            <div className="absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-between px-1.5 sm:hidden">
              <button
                type="button"
                aria-label="Previous reel"
                disabled={!hasPrev}
                onClick={goPrev}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md disabled:opacity-30"
              >
                <ChevronLeftIcon fontSize="small" />
              </button>
              <button
                type="button"
                aria-label="Next reel"
                disabled={!hasNext}
                onClick={goNext}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md disabled:opacity-30"
              >
                <ChevronRightIcon fontSize="small" />
              </button>
            </div>

            {!playing ? (
              <button
                type="button"
                className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-card)] text-[var(--color-foreground)] shadow-lg ring-1 ring-[var(--color-border)]"
                onClick={togglePlay}
                aria-label="Play"
              >
                <PlayArrowIcon />
              </button>
            ) : null}

            <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-card)] text-[var(--color-foreground)] shadow ring-1 ring-[var(--color-border)]"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <PauseIcon fontSize="small" />
                ) : (
                  <PlayArrowIcon fontSize="small" />
                )}
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-card)] text-[var(--color-foreground)] shadow ring-1 ring-[var(--color-border)]"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeOffIcon fontSize="small" />
                ) : (
                  <VolumeUpIcon fontSize="small" />
                )}
              </button>
            </div>
          </div>

          {reel.products.length > 0 ? (
            <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                <p className="text-[11px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Shop the look
                </p>
                {reel.products.length > 1 ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous products"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
                      onClick={() => scrollProducts(-1)}
                    >
                      <ChevronLeftIcon sx={{ fontSize: 16 }} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next products"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
                      onClick={() => scrollProducts(1)}
                    >
                      <ChevronRightIcon sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                ) : null}
              </div>
              <div
                ref={productRailRef}
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {reel.products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="flex w-[min(85%,14.5rem)] shrink-0 snap-start items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] p-2 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]"
                    onClick={onClose}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[var(--color-foreground)]">
                        {product.name}
                      </p>
                      {product.minPrice != null ? (
                        <p className="text-[11px] text-[var(--color-muted)]">
                          {formatMoney(product.minPrice, currency)}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        sfBtn("primary"),
                        "!min-h-0 shrink-0 !rounded-lg !px-2.5 !py-1.5 !text-[10px] !shadow-[0_6px_16px_color-mix(in_srgb,var(--color-primary)_32%,transparent)]",
                      )}
                    >
                      {reel.productCtaLabel || "Shop"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <NavArrow
          side="right"
          label="Next reel"
          disabled={!hasNext}
          onClick={goNext}
        />
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

type ReelsShowcaseProps = {
  reels: StorefrontReel[];
  currency: string;
  storeName?: string;
  heading?: string;
  visibleSlides?: number;
  autoplayMuted?: boolean;
  headingHighlightStyle?: HeadingHighlightStyle;
  className?: string;
};

export function ReelsShowcase({
  reels,
  currency,
  storeName,
  heading,
  visibleSlides = 3,
  autoplayMuted = true,
  headingHighlightStyle = "double",
  className,
}: ReelsShowcaseProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());

  const slides = Math.min(5, Math.max(1, visibleSlides));
  const popupOpen = popupIndex != null;

  const pauseAll = useCallback(() => {
    videoRefs.current.forEach((el) => {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
  }, []);

  const playAllMuted = useCallback(() => {
    videoRefs.current.forEach((el) => {
      el.muted = true;
      el.defaultMuted = true;
      el.disablePictureInPicture = true;
      void el.play().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (popupOpen) {
      pauseAll();
      return;
    }
    if (!autoplayMuted) {
      pauseAll();
      return;
    }
    playAllMuted();
  }, [autoplayMuted, popupOpen, pauseAll, playAllMuted, reels]);

  if (!reels.length) return null;

  const showCentered = reels.length <= slides;

  return (
    <div className={cn("mx-auto w-full max-w-6xl", className)}>
      {heading ? (
        <div className="mb-5 text-center sm:mb-6">
          <SectionAccentHeading
            title={heading}
            highlightStyle={headingHighlightStyle}
          />
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className={cn(
          "flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4",
          showCentered && "justify-center",
        )}
        style={{
          scrollPaddingInline: "max(1rem, calc(50% - 8.5rem))",
        }}
      >
        {reels.map((reel, reelIndex) => {
          const failed = failedIds.has(reel.id);
          const ctaLabel = reel.productCtaLabel || "Shop";
          const cardWidth = showCentered
            ? "min(17.5rem, 78vw)"
            : `min(16.5rem, calc((100% - ${(Math.min(slides, reels.length) - 1) * 1}rem) / ${Math.min(slides, reels.length)}))`;
          return (
            <div
              key={reel.id}
              role="button"
              tabIndex={0}
              data-reel-id={reel.id}
              className={cn(
                "group relative shrink-0 cursor-pointer snap-center rounded-[1.25rem] bg-transparent text-left transition duration-300 outline-none",
                "scale-100 opacity-100 ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]",
                "focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_80%,var(--color-foreground))]",
              )}
              style={{
                width: cardWidth,
                aspectRatio: "9 / 16",
              }}
              onClick={() => {
                pauseAll();
                setPopupIndex(reelIndex);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pauseAll();
                  setPopupIndex(reelIndex);
                }
              }}
              aria-label={`Play ${reel.title || "reel"}`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-[1.25rem] bg-black shadow-[0_12px_40px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)]">
                {reel.videoUrl && !popupOpen ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        el.disablePictureInPicture = true;
                        videoRefs.current.set(reel.id, el);
                      } else {
                        videoRefs.current.delete(reel.id);
                      }
                    }}
                    src={reel.videoUrl}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover",
                      failed && "opacity-0",
                    )}
                    muted
                    playsInline
                    loop
                    autoPlay={autoplayMuted && !failed}
                    preload="auto"
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    onLoadedData={(e) => {
                      setFailedIds((prev) => {
                        if (!prev.has(reel.id)) return prev;
                        const next = new Set(prev);
                        next.delete(reel.id);
                        return next;
                      });
                      if (autoplayMuted && !popupOpen) {
                        const el = e.currentTarget;
                        el.muted = true;
                        void el.play().catch(() => undefined);
                      }
                    }}
                    onError={() => {
                      setFailedIds((prev) => {
                        if (prev.has(reel.id)) return prev;
                        const next = new Set(prev);
                        next.add(reel.id);
                        return next;
                      });
                    }}
                  />
                ) : null}
                {failed ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black px-3 text-center text-xs text-white/65">
                    Video unavailable
                  </div>
                ) : null}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />

                <div className="absolute inset-x-0 bottom-0 p-3 pt-14">
                  {reel.title ? (
                    <p className="mb-2 truncate text-[13px] font-semibold tracking-tight text-white">
                      {reel.title}
                    </p>
                  ) : null}
                  {reel.products.length > 0 ? (
                    <div className="space-y-1.5">
                      {reel.products.slice(0, 2).map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.slug}`}
                          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1.5 backdrop-blur-md transition hover:bg-black/55"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/10">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white">
                              {product.name}
                            </p>
                            {product.minPrice != null ? (
                              <p className="text-[10px] text-white/70">
                                {formatMoney(product.minPrice, currency)}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              sfBtn("primary"),
                              "!min-h-0 shrink-0 !rounded-lg !px-2 !py-1 !text-[10px] !shadow-[0_6px_16px_color-mix(in_srgb,var(--color-primary)_32%,transparent)]",
                            )}
                          >
                            {ctaLabel}
                          </span>
                        </Link>
                      ))}
                      {reel.products.length > 2 ? (
                        <p className="text-[10px] text-white/65">
                          +{reel.products.length - 2} more
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {popupIndex != null ? (
        <ReelPopup
          reels={reels}
          index={popupIndex}
          currency={currency}
          storeName={storeName}
          onIndexChange={setPopupIndex}
          onClose={() => setPopupIndex(null)}
        />
      ) : null}
    </div>
  );
}

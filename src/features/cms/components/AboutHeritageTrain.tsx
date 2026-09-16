"use client";

import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

export type HeritageTrainItem = {
  year: string;
  label: string;
  description: string;
  wheelUrl: string | null;
};

type AboutHeritageTrainProps = {
  items: HeritageTrainItem[];
  engineWheelUrl?: string | null;
  className?: string;
};

function TrainWheel({
  src,
  size,
  spinning,
  fallback,
}: {
  src: string | null;
  size: "lg" | "sm";
  spinning?: boolean;
  fallback: string;
}) {
  return (
    <span
      className={cn(
        "sf-about-train__wheel",
        size === "lg" && "sf-about-train__wheel--lg",
        spinning && "sf-about-train__wheel--spin",
      )}
    >
      <span className="sf-about-train__wheel-rim" aria-hidden />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <span className="sf-about-train__wheel-fallback" aria-hidden>
          {fallback}
        </span>
      )}
      <span className="sf-about-train__wheel-shine" aria-hidden />
    </span>
  );
}

function LocomotiveSvg({ uid }: { uid: string }) {
  const gBody = `${uid}-body`;
  const gMetal = `${uid}-metal`;
  const gAccent = `${uid}-accent`;

  return (
    <svg
      className="sf-about-train__engine-svg"
      viewBox="0 -48 220 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gBody} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sf-train-body-hi)" />
          <stop offset="55%" stopColor="var(--sf-train-body)" />
          <stop offset="100%" stopColor="var(--sf-train-body-lo)" />
        </linearGradient>
        <linearGradient id={gMetal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sf-train-metal-hi)" />
          <stop offset="100%" stopColor="var(--sf-train-metal-lo)" />
        </linearGradient>
        <linearGradient id={gAccent} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--sf-train-accent-hi)" />
          <stop offset="100%" stopColor="var(--sf-train-accent)" />
        </linearGradient>
      </defs>

      {/* Face left: nose left, cab + rear coupler toward wagons on the right */}
      <g transform="translate(220 0) scale(-1 1)">
        {/* Underframe */}
        <rect
          x="28"
          y="78"
          width="168"
          height="8"
          rx="2"
          fill={`url(#${gMetal})`}
        />
        <path
          d="M22 86h182l-8 10H30l-8-10Z"
          fill="var(--sf-train-ink)"
          opacity="0.55"
        />

        {/* Cowcatcher */}
        <path d="M198 74l18 12v10H196V78l2-4Z" fill={`url(#${gMetal})`} />
        <path
          d="M200 78l14 10M204 78l10 10M208 78l6 10"
          stroke="var(--sf-train-ink)"
          strokeWidth="1.2"
          opacity="0.45"
        />

        {/* Boiler */}
        <ellipse cx="128" cy="58" rx="58" ry="22" fill={`url(#${gBody})`} />
        <rect
          x="70"
          y="36"
          width="116"
          height="44"
          rx="20"
          fill={`url(#${gBody})`}
        />
        <path
          d="M78 44h100"
          stroke="var(--sf-train-body-hi)"
          strokeWidth="2"
          opacity="0.55"
        />
        <path
          d="M82 68h92"
          stroke="var(--sf-train-body-lo)"
          strokeWidth="3"
          opacity="0.35"
        />

        {/* Domes */}
        <ellipse cx="118" cy="34" rx="11" ry="8" fill={`url(#${gAccent})`} />
        <ellipse cx="148" cy="36" rx="7" ry="5" fill={`url(#${gMetal})`} />

        {/* Chimney + classic smoke plume */}
        <rect
          x="168"
          y="12"
          width="14"
          height="28"
          rx="2"
          fill={`url(#${gMetal})`}
        />
        <rect
          x="164"
          y="8"
          width="22"
          height="8"
          rx="2"
          fill="var(--sf-train-ink)"
        />
        <g className="sf-about-train__smoke" aria-hidden>
          <ellipse
            className="sf-about-train__smoke-puff sf-about-train__smoke-puff--1"
            cx="175"
            cy="2"
            rx="9"
            ry="5"
            fill="var(--sf-train-smoke)"
          />
          <ellipse
            className="sf-about-train__smoke-puff sf-about-train__smoke-puff--2"
            cx="182"
            cy="-8"
            rx="12"
            ry="7"
            fill="var(--sf-train-smoke)"
          />
          <ellipse
            className="sf-about-train__smoke-puff sf-about-train__smoke-puff--3"
            cx="190"
            cy="-20"
            rx="15"
            ry="9"
            fill="var(--sf-train-smoke)"
          />
          <ellipse
            className="sf-about-train__smoke-puff sf-about-train__smoke-puff--4"
            cx="200"
            cy="-32"
            rx="18"
            ry="10"
            fill="var(--sf-train-smoke)"
          />
          <ellipse
            className="sf-about-train__smoke-puff sf-about-train__smoke-puff--5"
            cx="212"
            cy="-42"
            rx="14"
            ry="8"
            fill="var(--sf-train-smoke)"
          />
        </g>

        {/* Cab */}
        <path d="M28 28h48v50H28V28Z" fill={`url(#${gBody})`} />
        <path d="M24 28h56l-4-10H28l-4 10Z" fill={`url(#${gMetal})`} />
        <rect
          x="36"
          y="36"
          width="18"
          height="16"
          rx="2"
          fill="var(--sf-train-window)"
          stroke="var(--sf-train-ink)"
          strokeWidth="1.2"
          opacity="0.9"
        />
        <rect
          x="56"
          y="36"
          width="12"
          height="16"
          rx="2"
          fill="var(--sf-train-window)"
          stroke="var(--sf-train-ink)"
          strokeWidth="1.2"
          opacity="0.75"
        />
        <rect
          x="34"
          y="58"
          width="36"
          height="4"
          rx="1"
          fill={`url(#${gAccent})`}
        />

        {/* Front lamp */}
        <circle cx="190" cy="54" r="5" fill={`url(#${gAccent})`} />
        <circle cx="190" cy="54" r="2.5" fill="#fff8e7" opacity="0.85" />

        {/* Rear coupler → wagons (longer stub for link bar) */}
        <rect
          x="10"
          y="72"
          width="20"
          height="5"
          rx="1.5"
          fill={`url(#${gMetal})`}
        />
      </g>
    </svg>
  );
}

function WagonSvg({ uid }: { uid: string }) {
  const gSide = `${uid}-side`;
  const gRail = `${uid}-rail`;

  return (
    <svg
      className="sf-about-train__wagon-svg"
      viewBox="-4 0 148 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gSide} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sf-train-wagon-hi)" />
          <stop offset="100%" stopColor="var(--sf-train-wagon-lo)" />
        </linearGradient>
        <linearGradient id={gRail} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sf-train-metal-hi)" />
          <stop offset="100%" stopColor="var(--sf-train-metal-lo)" />
        </linearGradient>
      </defs>

      {/* Couplers — longer stubs so links meet the bodies */}
      <rect x="-2" y="42" width="16" height="4" rx="1" fill={`url(#${gRail})`} />
      <rect x="126" y="42" width="16" height="4" rx="1" fill={`url(#${gRail})`} />

      {/* Body */}
      <path
        d="M12 18h116v34H12V18Z"
        fill={`url(#${gSide})`}
        stroke="var(--sf-train-ink)"
        strokeWidth="1.25"
        opacity="0.95"
      />
      <rect x="12" y="14" width="116" height="6" rx="1" fill={`url(#${gRail})`} />
      <path
        d="M20 18v34M40 18v34M60 18v34M80 18v34M100 18v34M120 18v34"
        stroke="var(--sf-train-ink)"
        strokeWidth="1"
        opacity="0.18"
      />
      <rect x="18" y="24" width="104" height="3" rx="1" fill="var(--sf-train-body)" opacity="0.35" />

      {/* Axle boxes */}
      <rect x="28" y="50" width="14" height="8" rx="1.5" fill={`url(#${gRail})`} />
      <rect x="98" y="50" width="14" height="8" rx="1.5" fill={`url(#${gRail})`} />
    </svg>
  );
}

function CouplingLink() {
  return (
    <div className="sf-about-train__link" aria-hidden>
      <span className="sf-about-train__link-pin" />
      <span className="sf-about-train__link-bar" />
      <span className="sf-about-train__link-pin" />
    </div>
  );
}

function CarriageUnit({
  uid,
  wheel,
  spinning,
  initials,
}: {
  uid: string;
  wheel: string | null;
  spinning: boolean;
  initials: string;
}) {
  return (
    <div className="sf-about-train__carriage" aria-hidden>
      <WagonSvg uid={uid} />
      <div className="sf-about-train__carriage-wheels">
        <TrainWheel
          src={wheel}
          size="sm"
          spinning={spinning}
          fallback={initials}
        />
        <TrainWheel
          src={wheel}
          size="sm"
          spinning={spinning}
          fallback={initials}
        />
      </div>
    </div>
  );
}

export function AboutHeritageTrain({
  items,
  engineWheelUrl = null,
  className,
}: AboutHeritageTrainProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = viewportRef.current;
    if (!el) return;
    const step = Math.min(420, Math.max(280, el.clientWidth * 0.6));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  const tick = useEffectEvent(() => {
    const el = viewportRef.current;
    if (!el || paused || reduceMotion) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) return;
    if (el.scrollLeft >= max - 1) {
      el.scrollLeft = 0;
      return;
    }
    el.scrollLeft += 0.4;
  });

  useEffect(() => {
    if (reduceMotion || items.length === 0) return;
    let frame = 0;
    let raf = 0;
    const loop = () => {
      frame += 1;
      if (frame % 2 === 0) tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [items.length, reduceMotion, tick]);

  if (items.length === 0) return null;

  const engineWheel =
    engineWheelUrl || items.find((i) => i.wheelUrl)?.wheelUrl || null;
  // Wheels keep spinning; hover pauses auto-scroll and runs landscape parallax.
  const spinning = !reduceMotion;

  return (
    <div
      className={cn(
        "sf-about-train",
        paused && "sf-about-train--hover",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <button
        type="button"
        className="sf-about-train__nav sf-about-train__nav--prev"
        aria-label="Previous milestones"
        onClick={() => scrollByDir(-1)}
      >
        <ChevronLeftRoundedIcon fontSize="large" />
      </button>

      <div className="sf-about-train__sky" aria-hidden>
        <svg
          className="sf-about-train__clouds"
          viewBox="0 0 1200 120"
          preserveAspectRatio="xMidYMid slice"
        >
          <ellipse
            className="sf-about-train__cloud sf-about-train__cloud--a"
            cx="120"
            cy="42"
            rx="58"
            ry="18"
          />
          <ellipse
            className="sf-about-train__cloud sf-about-train__cloud--a"
            cx="170"
            cy="38"
            rx="42"
            ry="14"
          />
          <ellipse
            className="sf-about-train__cloud sf-about-train__cloud--b"
            cx="520"
            cy="28"
            rx="70"
            ry="20"
          />
          <ellipse
            className="sf-about-train__cloud sf-about-train__cloud--b"
            cx="580"
            cy="32"
            rx="48"
            ry="15"
          />
          <ellipse
            className="sf-about-train__cloud sf-about-train__cloud--c"
            cx="920"
            cy="48"
            rx="64"
            ry="17"
          />
          <ellipse
            className="sf-about-train__cloud sf-about-train__cloud--c"
            cx="970"
            cy="44"
            rx="40"
            ry="13"
          />
        </svg>
        <svg
          className="sf-about-train__birds"
          viewBox="0 0 1200 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            className="sf-about-train__bird"
            d="M180 36c8-6 16-6 22 0-8 2-14 2-22 0Z"
          />
          <path
            className="sf-about-train__bird"
            d="M240 28c6-5 12-5 17 0-6 2-11 2-17 0Z"
          />
          <path
            className="sf-about-train__bird"
            d="M640 22c9-7 18-7 24 0-9 2-16 2-24 0Z"
          />
          <path
            className="sf-about-train__bird"
            d="M700 34c7-5 13-5 18 0-6 2-12 2-18 0Z"
          />
          <path
            className="sf-about-train__bird"
            d="M980 30c8-6 15-6 21 0-7 2-14 2-21 0Z"
          />
        </svg>
      </div>

      <div className="sf-about-train__landscape" aria-hidden>
        <svg
          className="sf-about-train__hills-svg"
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
        >
          <path
            className="sf-about-train__hill sf-about-train__hill--back"
            d="M0 160V88C140 48 260 40 400 62c120 18 220 48 360 40 140-8 260-48 440-56v114H0Z"
          />
          <path
            className="sf-about-train__hill sf-about-train__hill--front"
            d="M0 160V108c160-36 300-44 460-28 150 16 260 44 420 36 140-8 220-28 320-40v84H0Z"
          />
        </svg>
        <div className="sf-about-train__track">
          <span className="sf-about-train__rail sf-about-train__rail--top" />
          <span className="sf-about-train__rail sf-about-train__rail--bot" />
          <span className="sf-about-train__sleepers" />
        </div>
      </div>

      <div className="sf-about-train__viewport" ref={viewportRef} tabIndex={0}>
        <div className="sf-about-train__consist">
          <div className="sf-about-train__engine" aria-hidden>
            <LocomotiveSvg uid={`${uid}-eng`} />
            <div className="sf-about-train__engine-wheels">
              <TrainWheel
                src={engineWheel}
                size="lg"
                spinning={spinning}
                fallback="◆"
              />
              <TrainWheel
                src={engineWheel}
                size="lg"
                spinning={spinning}
                fallback="◆"
              />
            </div>
          </div>

          {items.map((item, index) => {
            const wheel = item.wheelUrl || engineWheel;
            const initials = (item.label || item.year || "?")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Fragment key={`${item.year}-${item.label}-${index}`}>
                <CouplingLink />
                <article className="sf-about-train__stop">
                  <div className="sf-about-train__card">
                    {item.year ? (
                      <p className="sf-about-train__year">{item.year}</p>
                    ) : null}
                    {item.label ? (
                      <p className="sf-about-train__title">{item.label}</p>
                    ) : null}
                    {item.description ? (
                      <p className="sf-about-train__desc">{item.description}</p>
                    ) : null}
                  </div>
                  <div className="sf-about-train__pair" aria-hidden>
                    <CarriageUnit
                      uid={`${uid}-w${index}a`}
                      wheel={wheel}
                      spinning={spinning}
                      initials={initials}
                    />
                    <CouplingLink />
                    <CarriageUnit
                      uid={`${uid}-w${index}b`}
                      wheel={wheel}
                      spinning={spinning}
                      initials={initials}
                    />
                  </div>
                </article>
              </Fragment>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="sf-about-train__nav sf-about-train__nav--next"
        aria-label="Next milestones"
        onClick={() => scrollByDir(1)}
      >
        <ChevronRightRoundedIcon fontSize="large" />
      </button>
    </div>
  );
}

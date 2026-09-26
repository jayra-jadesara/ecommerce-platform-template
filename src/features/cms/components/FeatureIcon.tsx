import type { ReactNode } from "react";
import { FEATURE_ICON_IDS } from "@/features/cms/schemas";

type FeatureIconId = (typeof FEATURE_ICON_IDS)[number];

const FEATURE_ICON_IDS_SET = new Set<string>(FEATURE_ICON_IDS);

const paths: Record<FeatureIconId, ReactNode> = {
  star: (
    <path
      fill="currentColor"
      d="M12 2.5l2.6 5.6 6.1.6-4.6 4.1 1.4 5.9L12 15.8 6.5 18.7l1.4-5.9L3.3 8.7l6.1-.6L12 2.5z"
    />
  ),
  shield: (
    <path
      fill="currentColor"
      d="M12 2.5 19 5.5v6.2c0 4.4-2.9 7.6-7 9.3-4.1-1.7-7-4.9-7-9.3V5.5L12 2.5zm0 2.2L7 6.5v5.2c0 3.1 2 5.5 5 6.9 3-1.4 5-3.8 5-6.9V6.5l-5-1.8z"
    />
  ),
  truck: (
    <path
      fill="currentColor"
      d="M3 6.5h11.5V14H16l3.5-3.5H21v7h-1.6a2.4 2.4 0 0 1-4.7 0H9.8a2.4 2.4 0 0 1-4.7 0H3.5V6.5H3zm2.4 10.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zm10.5 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM14.5 8H3.5v4.5h11V8zm2 2.5 2.2 2.2H16.5V10.5z"
    />
  ),
  heart: (
    <path
      fill="currentColor"
      d="M12 20.2 10.4 18.7C5.4 14.2 2 11.1 2 7.4 2 4.4 4.4 2 7.4 2c1.7 0 3.3.8 4.6 2.1C13.3 2.8 14.9 2 16.6 2 19.6 2 22 4.4 22 7.4c0 3.7-3.4 6.8-8.4 11.3L12 20.2z"
    />
  ),
  leaf: (
    <path
      fill="currentColor"
      d="M17.8 4.2c-4.1-.3-8.1 1.4-10.4 4.6-1.7 2.3-2.1 5.1-1.3 7.6l-2.1 2.1 1.4 1.4 2.1-2.1c2.5.8 5.3.4 7.6-1.3 3.2-2.3 4.9-6.3 4.6-10.4l-1.9-1.9zm-2 2 1.1 1.1c.1 2.7-.9 5.2-2.9 6.7-1.6 1.2-3.5 1.6-5.3 1.3l7.1-7.1z"
    />
  ),
  check: (
    <path
      fill="currentColor"
      d="M9.6 16.6 4.9 11.9l1.4-1.4 3.3 3.3 7.5-7.5 1.4 1.4-8.9 8.9z"
    />
  ),
  globe: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.5 3.6 8.5S14.4 17.9 12 20.5C9.6 17.9 8.4 15 8.4 12S9.6 6.1 12 3.5z"
      />
    </>
  ),
  clock: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M12 7.5v5l3.2 2"
      />
    </>
  ),
  package: (
    <path
      fill="currentColor"
      d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2zm0 2.3L6.2 8 12 11.1 17.8 8 12 5.1zM5.5 9.5v6.6L11.2 19v-6.6L5.5 9.5zm13 0-5.7 2.9V19l5.7-2.9V9.5z"
    />
  ),
  support: (
    <path
      fill="currentColor"
      d="M12 3.5a7 7 0 0 0-7 7v2.2A2.3 2.3 0 0 0 7.3 15H8.5v-4.8H6.7a5.3 5.3 0 0 1 10.6 0H15.5V15h1.2a2.3 2.3 0 0 0 2.3-2.3V10.5a7 7 0 0 0-7-7zm-1.2 12.8h2.4V20h-2.4v-3.7z"
    />
  ),
};

export function FeatureIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const key = (
    FEATURE_ICON_IDS_SET.has(id) ? id : "star"
  ) as FeatureIconId;
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      className={className}
    >
      {paths[key]}
    </svg>
  );
}

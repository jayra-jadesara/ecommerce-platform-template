"use client";

import { sfDisplay, sfEyebrow } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

type AboutVisionMissionProps = {
  visionHeading: string;
  visionText: string;
  missionHeading: string;
  missionText: string;
  className?: string;
};

/**
 * Vision / Mission columns — surface comes from AboutSectionBand when wrapped.
 */
export function AboutVisionMission({
  visionHeading,
  visionText,
  missionHeading,
  missionText,
  className,
}: AboutVisionMissionProps) {
  const vision = visionText.trim();
  const mission = missionText.trim();
  if (!vision && !mission) return null;

  return (
    <div className={cn("sf-about-vm", className)}>
      <div className="sf-about-vm__grid">
        {vision ? (
          <div className="sf-about-vm__col">
            <p className={cn(sfEyebrow(), "sf-about-vm__eyebrow")}>Vision</p>
            {visionHeading.trim() ? (
              <h2 className={cn(sfDisplay(), "sf-about-vm__title")}>
                {visionHeading.trim()}
              </h2>
            ) : null}
            <p className="sf-about-vm__text">{vision}</p>
          </div>
        ) : null}
        {mission ? (
          <div className="sf-about-vm__col">
            <p className={cn(sfEyebrow(), "sf-about-vm__eyebrow")}>Mission</p>
            {missionHeading.trim() ? (
              <h2 className={cn(sfDisplay(), "sf-about-vm__title")}>
                {missionHeading.trim()}
              </h2>
            ) : null}
            <p className="sf-about-vm__text">{mission}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

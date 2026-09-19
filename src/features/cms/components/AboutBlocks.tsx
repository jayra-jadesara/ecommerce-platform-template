import Image from "next/image";
import type { ReactNode } from "react";
import { AboutHeritageTrain } from "@/features/cms/components/AboutHeritageTrain";
import {
  AboutCertificatesStrip,
  AboutFactoryGallery,
} from "@/features/cms/components/AboutGalleryCarousel";
import { AboutSectionBand } from "@/features/cms/components/AboutSectionBand";
import { AboutVisionMission } from "@/features/cms/components/AboutVisionMission";
import type { SectionConfigMap } from "@/features/cms/schemas";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";
import { sfBtn } from "@/components/ui/storefront-classes";
import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";
import { coerceHeadingHighlightStyle } from "@/features/theme/heading-highlight";
import Link from "next/link";

export type AboutBlockId =
  | "story"
  | "visionMission"
  | "factory"
  | "certificates"
  | "train";

type AboutConfig = SectionConfigMap["about"];

function filterFactorySlides(slides: AboutConfig["factorySlides"]) {
  return (slides ?? []).filter(
    (slide) =>
      Boolean(slide.imagePath?.trim()) ||
      Boolean(slide.title?.trim()) ||
      Boolean(slide.description?.trim()),
  );
}

function filterCertificateSlides(slides: AboutConfig["certificatesSlides"]) {
  return (slides ?? []).filter((slide) => Boolean(slide.imagePath?.trim()));
}

function SafeLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * Shared About block renderer for /about and homepage highlights.
 */
export function AboutBlocks({
  config,
  blocks,
  headingHighlightStyle,
  /** Above-the-fold portrait on /about (LCP) — not for homepage embeds. */
  priorityStoryImage = false,
}: {
  config: AboutConfig;
  blocks: ReadonlyArray<AboutBlockId>;
  headingHighlightStyle?: HeadingHighlightStyle | string | null;
  priorityStoryImage?: boolean;
}) {
  const highlight = coerceHeadingHighlightStyle(headingHighlightStyle);
  const nodes: ReactNode[] = [];

  for (const block of blocks) {
    if (block === "story") {
      const heading = config.heading?.trim() ?? "";
      const description = config.description?.trim() ?? "";
      const quote = config.quote?.trim() ?? "";
      const quoteAuthor = config.quoteAuthor?.trim() ?? "";
      const portraitUrl = resolveCmsImageUrl(config.imagePath);
      const captionName = config.imageCaptionName?.trim() ?? "";
      const captionRole = config.imageCaptionRole?.trim() ?? "";
      if (
        !heading &&
        !description &&
        !quote &&
        !portraitUrl &&
        !(config.buttonText && config.buttonLink)
      ) {
        continue;
      }
      nodes.push(
        <AboutSectionBand key="story">
          <div
            className={
              portraitUrl
                ? "sf-about-visionary sf-about-visionary--split"
                : "sf-about-visionary"
            }
          >
            <div className="sf-about-visionary__copy">
              {heading ? (
                <SectionAccentHeading
                  title={heading}
                  highlightStyle={highlight}
                  align={portraitUrl ? "left" : "center"}
                />
              ) : null}
              {description ? (
                <p className="sf-about-visionary__body">{description}</p>
              ) : null}
              {quote ? (
                <blockquote className="sf-about-visionary__quote">
                  <p className="sf-about-visionary__quote-text">“{quote}”</p>
                  {quoteAuthor ? (
                    <footer className="sf-about-visionary__quote-author">
                      — {quoteAuthor}
                    </footer>
                  ) : null}
                </blockquote>
              ) : null}
              {config.buttonText && config.buttonLink ? (
                <div className="sf-about-visionary__cta">
                  <SafeLink
                    href={config.buttonLink}
                    className={sfBtn("primary")}
                  >
                    {config.buttonText}
                  </SafeLink>
                </div>
              ) : null}
            </div>
            {portraitUrl ? (
              <div className="sf-about-visionary__portrait">
                <div className="sf-about-visionary__frame">
                  <Image
                    src={portraitUrl}
                    alt={captionName || heading || "About"}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 55vw, 216px"
                    priority={priorityStoryImage}
                    loading={priorityStoryImage ? "eager" : "lazy"}
                  />
                </div>
                {captionName || captionRole ? (
                  <div className="sf-about-visionary__caption">
                    {captionName ? (
                      <p className="sf-about-visionary__caption-name">
                        {captionName}
                      </p>
                    ) : null}
                    {captionRole ? (
                      <p className="sf-about-visionary__caption-role">
                        {captionRole}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </AboutSectionBand>,
      );
      continue;
    }

    if (block === "visionMission") {
      if (!config.visionMissionEnabled) continue;
      nodes.push(
        <AboutSectionBand key="vm" surface="band">
          <AboutVisionMission
            visionHeading={config.visionHeading ?? ""}
            visionText={config.visionText ?? ""}
            missionHeading={config.missionHeading ?? ""}
            missionText={config.missionText ?? ""}
          />
        </AboutSectionBand>,
      );
      continue;
    }

    if (block === "factory") {
      const slides = filterFactorySlides(config.factorySlides);
      if (!config.factoryEnabled || slides.length === 0) continue;
      nodes.push(
        <AboutSectionBand key="factory">
          <AboutFactoryGallery
            slides={slides}
            heading={config.factoryHeading?.trim() || "Factory"}
            highlightStyle={highlight}
          />
        </AboutSectionBand>,
      );
      continue;
    }

    if (block === "certificates") {
      const slides = filterCertificateSlides(config.certificatesSlides);
      if (!config.certificatesEnabled || slides.length === 0) continue;
      nodes.push(
        <AboutSectionBand key="certificates">
          <AboutCertificatesStrip
            slides={slides}
            heading={config.certificatesHeading?.trim() || "Certificates"}
            highlightStyle={highlight}
          />
        </AboutSectionBand>,
      );
      continue;
    }

    if (block === "train") {
      const timeline = (config.timelineItems ?? []).filter(
        (item) =>
          item.label?.trim() ||
          item.year?.trim() ||
          item.description?.trim(),
      );
      if (timeline.length === 0) continue;
      const engineWheelUrl = resolveCmsImageUrl(config.engineWheelImagePath);
      const trainItems = timeline.map((item) => ({
        year: item.year?.trim() ?? "",
        label: item.label?.trim() ?? "",
        description: item.description?.trim() ?? "",
        wheelUrl: engineWheelUrl,
      }));
      nodes.push(
        <AboutSectionBand key="train" fullBleed>
          <AboutHeritageTrain
            items={trainItems}
            engineWheelUrl={engineWheelUrl}
          />
        </AboutSectionBand>,
      );
    }
  }

  if (nodes.length === 0) return null;
  return <div className="sf-about-blocks">{nodes}</div>;
}

export function aboutBlocksForFullPage(): AboutBlockId[] {
  return ["story", "visionMission", "factory", "certificates", "train"];
}

/** Pick About blocks from Homepage → Other information toggles. */
export function aboutBlocksFromFlags(flags: {
  showStory?: boolean;
  showVisionMission?: boolean;
  showFactory?: boolean;
  showCertificates?: boolean;
  showTrain?: boolean;
}): AboutBlockId[] {
  const blocks: AboutBlockId[] = [];
  if (flags.showStory) blocks.push("story");
  if (flags.showVisionMission) blocks.push("visionMission");
  if (flags.showFactory) blocks.push("factory");
  if (flags.showCertificates) blocks.push("certificates");
  if (flags.showTrain) blocks.push("train");
  return blocks;
}

/** @deprecated Use aboutBlocksFromFlags with Homepage other_information config. */
export function aboutBlocksForHomepage(config: AboutConfig): AboutBlockId[] {
  return aboutBlocksFromFlags({
    showStory: config.homeShowStory,
    showVisionMission: config.homeShowVisionMission,
    showFactory: config.homeShowFactory,
    showCertificates: config.homeShowCertificates,
    showTrain: config.homeShowTrain,
  });
}

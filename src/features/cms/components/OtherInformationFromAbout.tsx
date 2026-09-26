import {
  AboutBlocks,
  aboutBlocksFromFlags,
} from "@/features/cms/components/AboutBlocks";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";
import type {
  OtherInformationSectionConfig,
  SectionConfigMap,
} from "@/features/cms/schemas";
import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";
import { Container } from "@/components/layout";
import {
  sectionShellClassName,
  sectionShellStyle,
} from "@/features/cms/section-styles";

/**
 * Homepage “Other information” — renders selected blocks from published Content → About.
 */
export async function OtherInformationFromAbout({
  flags,
  headingHighlightStyle,
}: {
  flags: Pick<
    OtherInformationSectionConfig,
    | "showStory"
    | "showVisionMission"
    | "showFactory"
    | "showCertificates"
    | "showTrain"
    | "backgroundStyle"
    | "spacingPreset"
  >;
  headingHighlightStyle?: HeadingHighlightStyle | string | null;
}) {
  const aboutPage = await getPublishedStorefrontPage("about");
  if (!aboutPage) return null;

  const aboutSection = aboutPage.sections.find(
    (s) => s.sectionType === "about",
  );
  if (!aboutSection) return null;

  const config = aboutSection.config as SectionConfigMap["about"];
  const blocks = aboutBlocksFromFlags(flags);
  if (blocks.length === 0) return null;

  const shell = sectionShellClassName({
    backgroundStyle: flags.backgroundStyle,
    spacingPreset: flags.spacingPreset,
  });
  const shellStyle = sectionShellStyle({
    backgroundStyle: flags.backgroundStyle,
  });

  return (
    <section
      className={`sf-about-home-highlights ${shell}`}
      style={shellStyle}
      aria-label="Other information"
    >
      <Container>
        <AboutBlocks
          config={config}
          blocks={blocks}
          headingHighlightStyle={headingHighlightStyle}
        />
      </Container>
    </section>
  );
}

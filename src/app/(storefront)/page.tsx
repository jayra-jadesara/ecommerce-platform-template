import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { getPublishedHomepage } from "@/features/cms/storefront";
import { HomeView } from "./home-view";

export default async function HomePage() {
  const [config, homepage] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedHomepage(),
  ]);

  const hasSections = (homepage?.sections.length ?? 0) > 0;

  return (
    <PageShell>
      {hasSections && homepage ? (
        <HomepageSections
          sections={homepage.sections}
          animation={config.animation}
          visualEffects={config.visualEffects}
        />
      ) : (
        <HomeView config={config} />
      )}
    </PageShell>
  );
}

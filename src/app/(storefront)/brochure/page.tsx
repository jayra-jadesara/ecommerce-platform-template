import type { Metadata } from "next";
import {
  PageShell,
  StorefrontBreadcrumb,
} from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { BrochureDownloadList } from "@/features/brochure/components/BrochureDownloadList";
import {
  getBrochurePageDescription,
  listStorefrontBrochures,
} from "@/features/brochure/service";
import { defaultBrochurePageDescription } from "@/features/brochure/page-description";
import { getPlatformConfigAsync } from "@/config/site.server";
import { metadataForManagedStorePage } from "@/features/seo/managed-page-metadata";
import { resolveManagedPageSeo } from "@/features/seo/resolve";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfigAsync();
  return metadataForManagedStorePage({
    pageKey: "brochure",
    path: "/brochure",
    fallbackTitle: `Brochure | ${config.brand.name}`,
    fallbackDescription: `Download product and brand brochures from ${config.brand.name}.`,
  });
}

export default async function BrochurePage() {
  const [config, brochures, pageDescription] = await Promise.all([
    getPlatformConfigAsync(),
    listStorefrontBrochures(),
    getBrochurePageDescription(),
  ]);

  const heading = resolveManagedPageSeo({
    seo: config.seo,
    pageKey: "brochure",
    path: "/brochure",
    fallbackTitle: "Brochure",
  }).title;

  const intro =
    pageDescription.trim() ||
    defaultBrochurePageDescription(config.brand.name);

  return (
    <PageShell showBack={false}>
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: heading },
        ]}
      />
      <div className="mx-auto max-w-3xl pt-2 text-center md:pt-4">
        <StorefrontHeading
          title={heading}
          as="h1"
          align="center"
          className="!text-3xl md:!text-4xl"
        />
        {intro ? (
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] md:text-base">
            {intro}
          </p>
        ) : null}
      </div>
      <BrochureDownloadList brochures={brochures} />
    </PageShell>
  );
}

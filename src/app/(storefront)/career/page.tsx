import type { Metadata } from "next";
import { PageShell, StorefrontBreadcrumb } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getPlatformConfigAsync } from "@/config/site.server";
import { CareerPageClient } from "@/features/career/components/CareerPageClient";
import { listPublishedJobPosts } from "@/features/career/service";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";
import type { CareerSectionConfig } from "@/features/cms/schemas";
import { sfEyebrow } from "@/components/ui/storefront-classes";

export const dynamic = "force-dynamic";

async function loadCareerPayload() {
  const [config, cmsCareer] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedStorefrontPage("career"),
  ]);
  const careerSection = cmsCareer?.sections.find(
    (s) => s.sectionType === "career",
  );
  const sectionConfig = (careerSection?.config ??
    {}) as Partial<CareerSectionConfig>;
  const heading =
    sectionConfig.heading?.trim() ||
    cmsCareer?.page.title?.trim() ||
    `Careers at ${config.brand.name}`;
  return { config, cmsCareer, sectionConfig, heading };
}

export async function generateMetadata(): Promise<Metadata> {
  const { heading, cmsCareer } = await loadCareerPayload();
  if (!cmsCareer) {
    return { title: "Career", robots: { index: false, follow: false } };
  }
  return {
    title: heading,
    description: cmsCareer.page.seoDescription?.trim() || undefined,
  };
}

/**
 * Storefront Career page — centered hero + inset roles / apply layout.
 */
export default async function CareerPage() {
  const [{ config, cmsCareer, sectionConfig, heading }, jobs] =
    await Promise.all([loadCareerPayload(), listPublishedJobPosts()]);

  const { brand, contact, store } = config;
  const published = Boolean(cmsCareer);

  const paragraphs = (sectionConfig.introParagraphs ?? []).filter((p) =>
    Boolean(p?.trim()),
  );
  const inviteLine = sectionConfig.ctaText?.trim() || "";
  const formEnabled = sectionConfig.formEnabled !== false;
  const formTitle = sectionConfig.formTitle?.trim() || "Apply now";
  const careersEmail =
    sectionConfig.careersEmail?.trim() ||
    contact.email ||
    store.supportEmail ||
    null;

  const heroSupport =
    cmsCareer?.page.seoDescription?.trim() ||
    paragraphs[0]?.trim() ||
    "Browse open roles and send your details below.";

  return (
    <PageShell showBack={false} className="!pt-3 md:!pt-5">
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: heading },
        ]}
      />

      <div className="sf-career-hero sf-career-hero--center">
        <p className={sfEyebrow()}>{brand.name}</p>
        <StorefrontHeading
          title={heading}
          as="h1"
          align="center"
          className="mt-2 !text-3xl md:!text-4xl"
        />
        <p className="sf-career-hero__support">{heroSupport}</p>
        {inviteLine ? (
          <p className="sf-career-hero__invite">{inviteLine}</p>
        ) : null}
      </div>

      {!published ? (
        <p className="sf-career-closed text-center">
          We are not accepting applications right now. Please check back later.
        </p>
      ) : (
        <div className="sf-career-body">
          <CareerPageClient
            jobs={jobs}
            formEnabled={formEnabled}
            formTitle={formTitle}
            careersEmail={careersEmail}
          />
        </div>
      )}
    </PageShell>
  );
}

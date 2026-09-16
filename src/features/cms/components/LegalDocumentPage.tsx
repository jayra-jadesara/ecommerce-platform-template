import { PageShell, StorefrontBreadcrumb } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getLegalStorefrontPage } from "@/features/cms/storefront";
import type { LegalPageSlug } from "@/features/cms/schemas";
import { MarkdownContent } from "@/features/editor";

export async function LegalDocumentPage({ slug }: { slug: LegalPageSlug }) {
  const page = await getLegalStorefrontPage(slug);
  const title = page.title;

  return (
    <PageShell showBack={false} className="!pt-3 md:!pt-5">
      <StorefrontBreadcrumb
        items={[{ label: "Home", href: "/" }, { label: title }]}
      />

      <article className="mx-auto max-w-3xl pb-6 pt-4 md:pb-10 md:pt-6">
        <header className="border-b border-[var(--color-border)] pb-6">
          <StorefrontHeading
            title={title}
            as="h1"
            align="left"
            className="!text-3xl md:!text-4xl"
          />
        </header>

        {page.published && page.content ? (
          <div className="pt-8">
            <MarkdownContent content={page.content} className="legal-document" />
          </div>
        ) : (
          <p className="mt-8 rounded-[var(--radius-default,0.75rem)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center text-sm leading-relaxed text-[var(--color-muted)]">
            This page is not published yet. In admin go to{" "}
            <strong className="text-[var(--color-foreground)]">
              Content → Legal pages
            </strong>
            , edit <strong className="text-[var(--color-foreground)]">{title}</strong>
            , then set status to{" "}
            <strong className="text-[var(--color-foreground)]">Published</strong>
            .
          </p>
        )}
      </article>
    </PageShell>
  );
}

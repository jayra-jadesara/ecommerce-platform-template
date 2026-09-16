import { LegalDocumentPage } from "@/features/cms/components/LegalDocumentPage";
import { TERMS_PAGE_SLUG } from "@/features/cms/schemas";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalDocumentPage slug={TERMS_PAGE_SLUG} />;
}

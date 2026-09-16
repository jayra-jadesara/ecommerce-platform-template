import { LegalDocumentPage } from "@/features/cms/components/LegalDocumentPage";
import { DISCLAIMER_PAGE_SLUG } from "@/features/cms/schemas";

export const dynamic = "force-dynamic";

export default function DisclaimerPage() {
  return <LegalDocumentPage slug={DISCLAIMER_PAGE_SLUG} />;
}

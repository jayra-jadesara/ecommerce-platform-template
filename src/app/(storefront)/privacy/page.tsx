import { LegalDocumentPage } from "@/features/cms/components/LegalDocumentPage";
import { PRIVACY_PAGE_SLUG } from "@/features/cms/schemas";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return <LegalDocumentPage slug={PRIVACY_PAGE_SLUG} />;
}

import { NextResponse } from "next/server";
import { getStorefrontBrochureForDownload } from "@/features/brochure/service";
import { recordBrochureDownload } from "@/features/brochure/record-download";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Increment download count, then send the user to the PDF. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const brochure = await getStorefrontBrochureForDownload(id);
  if (!brochure) {
    return NextResponse.json({ error: "Brochure not found." }, { status: 404 });
  }

  void recordBrochureDownload(brochure.id);

  return NextResponse.redirect(brochure.pdfUrl, 302);
}

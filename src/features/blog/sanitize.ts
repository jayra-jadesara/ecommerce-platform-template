/**
 * Remove common HTML/script injection vectors from markdown-ish content.
 * Does not parse markdown — string-level cleanup only.
 */
export function stripUnsafeContent(markdown: string): string {
  let out = markdown;
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\/?>/gi, "");
  out = out.replace(/javascript\s*:/gi, "");
  out = out.replace(/data\s*:\s*text\/html[^,\s]*,?/gi, "");
  out = out.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return out;
}

/** Approximate reading time: words / 200, ceil; min 1 if non-empty, else 0. */
export function estimateReadingMinutes(content: string): number {
  const text = content.trim();
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Published and either unscheduled or already past published_at. */
export function isPubliclyVisiblePost(
  status: string,
  publishedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (status !== "published") return false;
  if (!publishedAt) return true;
  const at = new Date(publishedAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() <= now.getTime();
}

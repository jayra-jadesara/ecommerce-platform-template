import Link from "next/link";

type BlogArticleCtaProps = {
  title: string | null;
  description: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
};

export function BlogArticleCta({
  title,
  description,
  buttonLabel,
  buttonHref,
}: BlogArticleCtaProps) {
  const href = buttonHref?.trim() || null;
  const label = buttonLabel?.trim() || null;
  const heading = title?.trim() || null;
  const body = description?.trim() || null;

  if (!href || !label) return null;

  return (
    <aside
      className="mt-12 rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] px-5 py-6 md:px-7 md:py-7"
      aria-label="Article call to action"
    >
      {heading ? (
        <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {heading}
        </p>
      ) : null}
      {body ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)] md:text-[0.95rem]">
          {body}
        </p>
      ) : null}
      {href && label ? (
        <p className="mt-4">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {label}
          </Link>
        </p>
      ) : null}
    </aside>
  );
}

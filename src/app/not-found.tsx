import { PageShell } from "@/components/layout";
import { LinkButton } from "@/components/common/LinkButton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <PageShell>
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <LinkButton href="/" variant="contained" color="primary">
            Back to home
          </LinkButton>
        }
      />
    </PageShell>
  );
}

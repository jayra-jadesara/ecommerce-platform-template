import { PageShell } from "@/components/layout";
import { getPlatformConfig } from "@/config/site";
import { HomeView } from "./home-view";

export default function HomePage() {
  const config = getPlatformConfig();

  return (
    <PageShell>
      <HomeView config={config} />
    </PageShell>
  );
}

import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site";
import { HomeView } from "./home-view";

export default async function HomePage() {
  const config = await getPlatformConfigAsync();

  return (
    <PageShell>
      <HomeView config={config} />
    </PageShell>
  );
}

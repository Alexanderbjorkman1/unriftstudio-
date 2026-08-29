import { Suspense } from "react";
import { SettingsPanels } from "@/components/admin/settings-panels";
import { getSettings } from "@/lib/repo/settings";
import { listServices } from "@/lib/repo/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string }>;
}) {
  const { tab = "business", saved } = await searchParams;
  return (
    <Suspense>
      <SettingsPanels settings={getSettings()} services={listServices()} saved={saved === "1"} initialTab={tab} />
    </Suspense>
  );
}

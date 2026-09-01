import { Suspense } from "react";
import { SettingsPanels } from "@/components/admin/settings-panels";
import { getSettings } from "@/lib/repo/settings";
import { listServices } from "@/lib/repo/services";
import { emailStatus, smsStatus } from "@/lib/notify/providers";
import { goLiveStatus } from "@/lib/actions/golive";
import { listBackups } from "@/lib/backup";
import { stripeStatus } from "@/lib/payments/stripe";

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
      <SettingsPanels
        settings={getSettings()}
        services={listServices()}
        saved={saved === "1"}
        initialTab={tab}
        email={emailStatus()}
        sms={smsStatus()}
        goLiveChecks={await goLiveStatus()}
        backups={listBackups()}
        stripe={stripeStatus()}
        exampleJobPrice={listServices(true)[0]?.base_price ?? 1000}
      />
    </Suspense>
  );
}

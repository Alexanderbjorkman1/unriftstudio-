import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { JobForm } from "@/components/admin/job-form";
import { createJobAction } from "@/lib/actions/jobs";
import { listCustomers } from "@/lib/repo/customers";
import { listVehicles } from "@/lib/repo/vehicles";
import { listServices } from "@/lib/repo/services";
import { listTechnicians } from "@/lib/repo/users";
import { getSettings } from "@/lib/repo/settings";
import { dayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "New job" };

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const { date, time } = await searchParams;

  return (
    <div className="space-y-4">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to jobs
      </Link>
      <JobForm
        action={createJobAction}
        customers={listCustomers()}
        vehicles={listVehicles()}
        services={listServices(true)}
        technicians={listTechnicians()}
        settings={getSettings()}
        defaultDate={date ?? dayKey(new Date())}
        defaultTime={time}
      />
    </div>
  );
}

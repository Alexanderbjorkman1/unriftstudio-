import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { JobForm } from "@/components/admin/job-form";
import { updateJobAction } from "@/lib/actions/jobs";
import { getJob, jobServices } from "@/lib/repo/jobs";
import { listCustomers } from "@/lib/repo/customers";
import { listVehicles } from "@/lib/repo/vehicles";
import { listServices } from "@/lib/repo/services";
import { listTechnicians } from "@/lib/repo/users";
import { getSettings } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) notFound();

  const update = updateJobAction.bind(null, job.id);

  return (
    <div className="space-y-4">
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to {job.job_number}
      </Link>
      <JobForm
        action={update}
        job={job}
        jobServiceIds={jobServices(job.id).map((s) => s.service_id).filter((v): v is number => v !== null)}
        customers={listCustomers()}
        vehicles={listVehicles()}
        services={listServices(true)}
        technicians={listTechnicians()}
        settings={getSettings()}
      />
    </div>
  );
}

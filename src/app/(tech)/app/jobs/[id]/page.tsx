import { notFound } from "next/navigation";
import { TechJobDetail } from "@/components/tech/job-detail";
import { getJob, jobChecklist, jobNotes, jobPhotos, jobServices } from "@/lib/repo/jobs";
import { getVehicle } from "@/lib/repo/vehicles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const job = getJob(Number((await params).id));
  return { title: job ? `${job.vehicle_make} ${job.vehicle_model}` : "Job" };
}

export default async function TechJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) notFound();

  const vehicle = job.vehicle_id ? getVehicle(job.vehicle_id) : undefined;

  return (
    <TechJobDetail
      job={job}
      services={jobServices(job.id)}
      checklist={jobChecklist(job.id)}
      photos={jobPhotos(job.id)}
      notes={jobNotes(job.id)}
      vehicleColor={vehicle?.color ?? null}
    />
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { CarSilhouette, paintFor } from "@/components/car-art";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteVehicleAction } from "@/lib/actions/crm";
import { getVehicle } from "@/lib/repo/vehicles";
import { getCustomer } from "@/lib/repo/customers";
import { listJobs } from "@/lib/repo/jobs";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, money } from "@/lib/format";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const vehicle = getVehicle(Number((await params).id));
  return { title: vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle" };
}

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = getVehicle(Number(id));
  if (!vehicle) notFound();

  const owner = vehicle.customer_id ? getCustomer(vehicle.customer_id) : undefined;
  const jobs = listJobs({ vehicleId: vehicle.id, order: "desc" });
  const revenue = jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.price, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/vehicles" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Back to vehicles
        </Link>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/jobs/new" variant="secondary">
            <Plus className="size-4" /> Book a job
          </LinkButton>
          <LinkButton href={`/vehicles/${vehicle.id}/edit`} variant="secondary">
            <Pencil className="size-4" /> Edit
          </LinkButton>
          <DeleteButton action={deleteVehicleAction.bind(null, vehicle.id)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="grid h-32 w-52 shrink-0 place-items-center rounded-[12px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] px-3">
            <CarSilhouette make={vehicle.make} model={vehicle.model} color={paintFor(vehicle.make, vehicle.model, vehicle.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {vehicle.make} {vehicle.model}
              {vehicle.year ? <span className="ml-2 text-muted">{vehicle.year}</span> : null}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted">
              <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                {vehicle.plate || "No plate"}
              </span>
              {vehicle.color && <span>{vehicle.color}</span>}
              {vehicle.mileage ? <span>{new Intl.NumberFormat("sv-SE").format(vehicle.mileage)} km</span> : null}
              {owner && (
                <Link href={`/customers/${owner.id}`} className="text-brand hover:text-fg">
                  {owner.name}
                </Link>
              )}
            </p>
            {vehicle.notes && <p className="mt-3 text-[13px] whitespace-pre-wrap text-muted">{vehicle.notes}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] tracking-wide text-faint uppercase">Lifetime revenue</p>
            <p className="text-2xl font-semibold tabular-nums">{money(revenue)}</p>
            <p className="mt-1 text-[12px] text-faint">{jobs.length} jobs</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Service history" />
        {jobs.length === 0 ? (
          <EmptyState title="No service history yet" />
        ) : (
          <Table className="min-w-[520px]">
            <thead>
              <tr>
                <Th>Job</Th>
                <Th>Service</Th>
                <Th>Date</Th>
                <Th>Technician</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="group transition hover:bg-raised/60">
                  <Td>
                    <Link href={`/jobs/${job.id}`} className="font-medium group-hover:text-brand">
                      {job.job_number}
                    </Link>
                  </Td>
                  <Td className="max-w-[200px] truncate text-muted">{job.service_names}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(job.scheduled_at)}</Td>
                  <Td className="text-muted">{job.technician_name ?? "—"}</Td>
                  <Td>
                    <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                  </Td>
                  <Td className="text-right tabular-nums">{money(job.price)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

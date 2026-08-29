import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { FilterTabs, SearchInput, SelectFilter } from "@/components/admin/filters";
import { Pagination } from "@/components/admin/pagination";
import { VehicleThumb } from "@/components/car-art";
import { countJobs, listJobs } from "@/lib/repo/jobs";
import { listTechnicians } from "@/lib/repo/users";
import { getDb } from "@/lib/db";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, money } from "@/lib/format";
import { formatDate, stampTime } from "@/lib/dates";
import type { JobStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs" };

const TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "booked", label: "Booked" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; tech?: string; page?: string }>;
}) {
  const { status = "all", q = "", tech, page: pageParam } = await searchParams;
  const PAGE_SIZE = 25;

  const counts = getDb().prepare("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status").all() as Array<{
    status: JobStatus;
    n: number;
  }>;
  const countMap = new Map(counts.map((c) => [c.status as string, c.n]));
  const total = counts.reduce((sum, c) => sum + c.n, 0);

  const filter = {
    status: status as JobStatus | "all",
    search: q,
    technicianId: tech ? Number(tech) : undefined,
  };
  const totalJobs = countJobs(filter);
  const page = Math.min(Math.max(1, Number(pageParam) || 1), Math.max(1, Math.ceil(totalJobs / PAGE_SIZE)));
  const jobs = listJobs({ ...filter, order: "desc", limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const technicians = listTechnicians();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          options={TABS.map((t) => ({ ...t, count: t.value === "all" ? total : (countMap.get(t.value) ?? 0) }))}
          active={status}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <SearchInput placeholder="Search jobs, customers, plates…" />
          <SelectFilter
            param="tech"
            placeholder="All technicians"
            options={technicians.map((t) => ({ value: String(t.id), label: t.name }))}
          />
          <LinkButton href="/jobs/new">
            <Plus className="size-4" /> New job
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        {jobs.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-5" />}
            title="No jobs match that filter"
            description="Try another status, or book the first job of the day."
            action={
              <Link href="/jobs/new" className="text-[13px] font-medium text-brand hover:text-fg">
                Create a job
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Job</Th>
                <Th>Customer</Th>
                <Th>Vehicle</Th>
                <Th>Service</Th>
                <Th>Scheduled</Th>
                <Th>Technician</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="group transition hover:bg-raised/60">
                  <Td>
                    <Link href={`/jobs/${job.id}`} className="font-medium text-fg group-hover:text-brand">
                      {job.job_number}
                    </Link>
                    {job.source === "online" && <span className="ml-2 text-[11px] text-faint">online</span>}
                  </Td>
                  <Td>
                    {job.customer_id ? (
                      <Link href={`/customers/${job.customer_id}`} className="hover:text-brand">
                        {job.customer_name}
                      </Link>
                    ) : (
                      <span className="text-muted">Walk-in</span>
                    )}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <VehicleThumb make={job.vehicle_make} model={job.vehicle_model} className="h-8 w-12" />
                      <span className="min-w-0">
                        <span className="block truncate">
                          {job.vehicle_make} {job.vehicle_model}
                        </span>
                        <span className="block text-[11px] text-faint">{job.vehicle_plate}</span>
                      </span>
                    </span>
                  </Td>
                  <Td className="max-w-[190px] truncate text-muted">{job.service_names ?? "—"}</Td>
                  <Td className="whitespace-nowrap">
                    {formatDate(job.scheduled_at)}
                    <span className="ml-1.5 text-faint">{stampTime(job.scheduled_at)}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{job.technician_name ?? "—"}</Td>
                  <Td>
                    <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{money(job.price)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={totalJobs}
          basePath="/jobs"
          params={{ status: status === "all" ? undefined : status, q: q || undefined, tech }}
        />
      </Card>
    </div>
  );
}

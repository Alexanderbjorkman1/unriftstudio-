import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui";
import { VehicleThumb } from "@/components/car-art";
import { requireUser } from "@/lib/auth";
import { listJobs } from "@/lib/repo/jobs";
import { addDays, dayKey, formatDay, stampDay, stampTime } from "@/lib/dates";
import { duration, JOB_STATUS_LABEL, JOB_STATUS_TONE, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My schedule" };

export default async function TechSchedulePage() {
  const user = await requireUser("/app/schedule");
  const today = new Date();

  const jobs = listJobs({
    technicianId: user.role === "owner" ? undefined : user.id,
    from: `${dayKey(today)}T00:00`,
    to: `${dayKey(addDays(today, 14))}T23:59`,
    order: "asc",
  }).filter((job) => job.status !== "cancelled");

  const byDay = new Map<string, typeof jobs>();
  jobs.forEach((job) => {
    const key = stampDay(job.scheduled_at);
    byDay.set(key, [...(byDay.get(key) ?? []), job]);
  });

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-semibold tracking-tight">Next 14 days</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        {jobs.length} job{jobs.length === 1 ? "" : "s"} ·{" "}
        {duration(jobs.reduce((sum, job) => sum + job.duration_min, 0))} of work
      </p>

      {byDay.size === 0 ? (
        <p className="rounded-[14px] border border-line bg-panel px-4 py-10 text-center text-[13px] text-muted">
          Nothing booked in the next two weeks.
        </p>
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, dayJobs]) => (
            <section key={day}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <CalendarDays className="size-3.5 text-faint" />
                  {formatDay(day)}
                </h2>
                <span className="text-[11.5px] text-faint">
                  {money(dayJobs.reduce((sum, job) => sum + job.price, 0))}
                </span>
              </div>
              <ul className="space-y-2">
                {dayJobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="flex items-center gap-3 rounded-[12px] border border-line bg-panel p-3 transition hover:border-brand/40"
                    >
                      <span className="w-11 shrink-0 text-[13px] font-medium text-muted tabular-nums">
                        {stampTime(job.scheduled_at)}
                      </span>
                      <VehicleThumb make={job.vehicle_make} model={job.vehicle_model} className="h-10 w-16" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">
                          {job.vehicle_make} {job.vehicle_model}
                        </span>
                        <span className="block truncate text-[12px] text-muted">{job.service_names}</span>
                        {job.location_type === "onsite" && (
                          <span className="flex items-center gap-0.5 text-[11.5px] text-faint">
                            <MapPin className="size-3" /> {job.city}
                          </span>
                        )}
                      </span>
                      <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

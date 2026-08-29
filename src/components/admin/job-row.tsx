import Link from "next/link";
import { MapPin } from "lucide-react";
import { VehicleThumb } from "@/components/car-art";
import { Badge } from "@/components/ui";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, money } from "@/lib/format";
import { relativeDayTime, stampTime } from "@/lib/dates";
import type { JobRow } from "@/lib/types";

/** Compact schedule line — used on the dashboard and inside day views. */
export function ScheduleRow({ job }: { job: JobRow }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition hover:bg-raised"
    >
      <span className="w-11 shrink-0 text-[13px] font-medium text-muted tabular-nums">{stampTime(job.scheduled_at)}</span>
      <VehicleThumb make={job.vehicle_make} model={job.vehicle_model} className="h-10 w-15" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">
          {job.vehicle_make} {job.vehicle_model}
        </p>
        <p className="truncate text-[12px] text-muted">{job.service_names ?? "—"}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
          <span className="truncate">{job.technician_name ?? "Unassigned"}</span>
          {job.location_type === "onsite" && (
            <span className="flex shrink-0 items-center gap-0.5">
              <MapPin className="size-3" />
              {job.city || "On site"}
            </span>
          )}
        </p>
      </div>
      <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
    </Link>
  );
}

/** Recent-work line with the price on the right. */
export function RecentJobRow({ job }: { job: JobRow }) {
  return (
    <Link href={`/jobs/${job.id}`} className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition hover:bg-raised">
      <VehicleThumb make={job.vehicle_make} model={job.vehicle_model} className="h-10 w-15" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">
          {job.vehicle_make} {job.vehicle_model}
        </p>
        <p className="truncate text-[12px] text-muted">{job.service_names ?? "—"}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
          <span className="text-[11px] text-faint">{relativeDayTime(job.scheduled_at)}</span>
        </div>
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums">{money(job.price)}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, PlayCircle } from "lucide-react";
import { VehicleThumb } from "@/components/car-art";
import { Badge, cn } from "@/components/ui";
import { setJobStatusAction } from "@/lib/actions/jobs";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE } from "@/lib/format";
import { formatDay, stampDay, stampTime } from "@/lib/dates";
import type { JobRow } from "@/lib/types";

type Range = "today" | "week" | "all";

/** The technician's job feed: Today / This week / All, newest work first. */
export function TechJobList({ jobs, today }: { jobs: JobRow[]; today: string }) {
  const [range, setRange] = useState<Range>("today");
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndKey = weekEnd.toISOString().slice(0, 10);

  const filtered = jobs.filter((job) => {
    const day = stampDay(job.scheduled_at);
    if (range === "today") return day === today;
    if (range === "week") return day >= today && day <= weekEndKey;
    return true;
  });

  return (
    <>
      <div className="sticky top-0 z-10 -mx-5 mb-3 border-b border-line bg-canvas/95 px-5 pb-2 backdrop-blur-xl">
        <div className="flex gap-1 rounded-[10px] border border-line bg-raised p-0.5">
          {(
            [
              ["today", "Today"],
              ["week", "This week"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[12.5px] font-medium transition",
                range === value ? "bg-brand text-white" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[14px] border border-line bg-panel px-4 py-10 text-center text-[13px] text-muted">
          Nothing scheduled {range === "today" ? "today" : range === "week" ? "this week" : "yet"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((job) => (
            <li key={job.id}>
              <JobCard job={job} showDay={range !== "today"} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function JobCard({ job, showDay }: { job: JobRow; showDay: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const startable = job.status === "booked" || job.status === "confirmed";

  return (
    <div className="rounded-[14px] border border-line bg-panel p-3.5">
      <Link href={`/app/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tabular-nums">
              {showDay && <span className="mr-1.5 text-muted">{formatDay(job.scheduled_at)}</span>}
              {stampTime(job.scheduled_at)}
            </p>
            <p className="mt-0.5 truncate text-[15px] font-semibold">
              {job.vehicle_make} {job.vehicle_model}
            </p>
            <p className="truncate text-[12.5px] text-muted">{job.service_names ?? "—"}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-faint">
              {job.vehicle_plate && <span className="font-mono tracking-wider">{job.vehicle_plate}</span>}
              {job.location_type === "onsite" ? (
                <span className="flex items-center gap-0.5">
                  <MapPin className="size-3" /> {job.city || "On site"}
                </span>
              ) : (
                <span>At the shop</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
            <VehicleThumb make={job.vehicle_make} model={job.vehicle_model} className="h-12 w-20" />
          </div>
        </div>
      </Link>

      {startable && (
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setJobStatusAction(job.id, "in_progress");
              router.push(`/app/jobs/${job.id}`);
            })
          }
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-brand-strong py-2.5 text-[13px] font-medium text-white transition hover:bg-brand disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          Start job
        </button>
      )}
      {job.status === "in_progress" && (
        <Link
          href={`/app/jobs/${job.id}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-warn/40 bg-warn/10 py-2.5 text-[13px] font-medium text-warn"
        >
          Continue job
        </Link>
      )}
    </div>
  );
}

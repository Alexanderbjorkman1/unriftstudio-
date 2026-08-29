"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, cn, LinkButton } from "@/components/ui";
import {
  addDays, addMonths, dayKey, DAY_SHORT, isSameDay, minutesFromMidnight, MONTH_NAMES, monthGrid,
  parseStamp, stampDay, stampTime, startOfWeek,
} from "@/lib/dates";
import { JOB_STATUS_LABEL, money } from "@/lib/format";
import type { JobRow, User } from "@/lib/types";

type View = "month" | "week" | "day";

const STATUS_STYLE: Record<string, string> = {
  booked: "border-brand/40 bg-brand/12 text-fg",
  confirmed: "border-violet/40 bg-violet/12 text-fg",
  in_progress: "border-warn/45 bg-warn/12 text-fg",
  completed: "border-success/35 bg-success/10 text-muted",
  cancelled: "border-line bg-raised text-faint line-through",
};

export function CalendarView({
  jobs,
  view,
  date,
  technicians,
  openFrom,
  openTo,
}: {
  jobs: JobRow[];
  view: View;
  date: string;
  technicians: User[];
  openFrom: string;
  openTo: string;
}) {
  const router = useRouter();
  const cursor = parseStamp(date);

  function go(nextDate: Date, nextView: View = view) {
    router.push(`/calendar?view=${nextView}&date=${dayKey(nextDate)}`, { scroll: false });
  }

  function shift(direction: number) {
    if (view === "month") go(addMonths(cursor, direction));
    else if (view === "week") go(addDays(cursor, direction * 7));
    else go(addDays(cursor, direction));
  }

  const heading =
    view === "month"
      ? `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === "week"
        ? (() => {
            const start = startOfWeek(cursor);
            const end = addDays(start, 6);
            return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
          })()
        : `${DAY_SHORT[cursor.getDay()]} ${cursor.getDate()} ${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} aria-label="Previous" className="grid size-9 place-items-center rounded-[10px] border border-line bg-raised text-muted transition hover:text-fg">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => shift(1)} aria-label="Next" className="grid size-9 place-items-center rounded-[10px] border border-line bg-raised text-muted transition hover:text-fg">
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => go(new Date())}
            className="ml-1 rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] font-medium text-muted transition hover:text-fg"
          >
            Today
          </button>
        </div>

        <h2 className="ml-1 text-[15px] font-semibold">{heading}</h2>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-[10px] border border-line bg-raised p-0.5">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => go(cursor, v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-medium capitalize transition",
                  view === v ? "bg-brand text-white" : "text-muted hover:text-fg",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <LinkButton href={`/jobs/new?date=${date}`}>
            <Plus className="size-4" /> New job
          </LinkButton>
        </div>
      </div>

      {technicians.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
          {technicians.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
      )}

      {view === "month" && <MonthView jobs={jobs} cursor={cursor} onPickDay={(d) => go(d, "day")} />}
      {view === "week" && <WeekView jobs={jobs} cursor={cursor} openFrom={openFrom} openTo={openTo} />}
      {view === "day" && <DayView jobs={jobs} cursor={cursor} openFrom={openFrom} openTo={openTo} />}
    </div>
  );
}

function MonthView({ jobs, cursor, onPickDay }: { jobs: JobRow[]; cursor: Date; onPickDay: (d: Date) => void }) {
  const days = monthGrid(cursor);
  const byDay = new Map<string, JobRow[]>();
  jobs.forEach((job) => {
    const key = stampDay(job.scheduled_at);
    byDay.set(key, [...(byDay.get(key) ?? []), job]);
  });

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-3 py-2 text-[11px] font-medium tracking-wide text-faint uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const list = (byDay.get(key) ?? []).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
          const otherMonth = day.getMonth() !== cursor.getMonth();
          const today = isSameDay(day, new Date());
          const revenue = list.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.price, 0);

          return (
            <div
              key={key}
              className={cn(
                "min-h-[116px] border-r border-b border-line-soft p-1.5 last:border-r-0",
                otherMonth && "bg-canvas/40",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <button
                  onClick={() => onPickDay(day)}
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[12px] transition hover:bg-raised",
                    today ? "bg-brand font-semibold text-white" : otherMonth ? "text-faint" : "text-muted",
                  )}
                >
                  {day.getDate()}
                </button>
                {revenue > 0 && <span className="text-[10px] text-faint tabular-nums">{money(revenue)}</span>}
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className={cn(
                      "flex items-center gap-1.5 truncate rounded-md border px-1.5 py-1 text-[11px] transition hover:brightness-125",
                      STATUS_STYLE[job.status],
                    )}
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: job.technician_color ?? "#64748b" }} />
                    <span className="shrink-0 tabular-nums">{stampTime(job.scheduled_at)}</span>
                    <span className="truncate">
                      {job.vehicle_make} {job.vehicle_model}
                    </span>
                  </Link>
                ))}
                {list.length > 3 && (
                  <button onClick={() => onPickDay(day)} className="px-1.5 text-[11px] text-faint hover:text-brand">
                    +{list.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** The grid always covers opening hours, widened to fit any job outside them. */
function useHourRange(openFrom: string, openTo: string, jobs: JobRow[]) {
  let start = Math.floor(minutesFromMidnight(openFrom) / 60);
  let end = Math.ceil(minutesFromMidnight(openTo) / 60);
  for (const job of jobs) {
    const from = minutesFromMidnight(stampTime(job.scheduled_at));
    start = Math.min(start, Math.floor(from / 60));
    end = Math.max(end, Math.ceil((from + job.duration_min) / 60));
  }
  return { start, end, hours: Array.from({ length: Math.max(1, end - start) }, (_, i) => start + i) };
}

/** Lays overlapping jobs out side by side instead of stacking them. */
function layout(jobs: JobRow[]) {
  const sorted = [...jobs].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const placed: Array<{ job: JobRow; start: number; end: number; lane: number; lanes: number }> = [];
  let cluster: typeof placed = [];

  const flush = () => {
    const lanes = cluster.reduce((max, item) => Math.max(max, item.lane + 1), 0);
    cluster.forEach((item) => (item.lanes = lanes));
    placed.push(...cluster);
    cluster = [];
  };

  for (const job of sorted) {
    const start = minutesFromMidnight(stampTime(job.scheduled_at));
    const end = start + job.duration_min;
    if (cluster.length && start >= Math.max(...cluster.map((c) => c.end))) flush();
    const taken = new Set(cluster.filter((c) => c.end > start).map((c) => c.lane));
    let lane = 0;
    while (taken.has(lane)) lane += 1;
    cluster.push({ job, start, end, lane, lanes: lane + 1 });
  }
  flush();
  return placed;
}

const HOUR_HEIGHT = 56;

function TimeGrid({
  days,
  jobs,
  openFrom,
  openTo,
}: {
  days: Date[];
  jobs: JobRow[];
  openFrom: string;
  openTo: string;
}) {
  const { start, hours } = useHourRange(openFrom, openTo, jobs);

  return (
    <Card className="overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-line" />
        {days.map((day) => {
          const today = isSameDay(day, new Date());
          return (
            <div key={dayKey(day)} className="border-b border-l border-line px-2 py-2 text-center">
              <p className="text-[11px] tracking-wide text-faint uppercase">{DAY_SHORT[day.getDay()]}</p>
              <p className={cn("text-[15px] font-semibold", today && "text-brand")}>{day.getDate()}</p>
            </div>
          );
        })}

        <div>
          {hours.map((hour) => (
            <div key={hour} className="relative border-b border-line-soft" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-1.5 right-2 text-[11px] text-faint tabular-nums">{String(hour).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = dayKey(day);
          const dayJobs = jobs.filter((job) => stampDay(job.scheduled_at) === key);
          return (
            <div key={key} className="relative overflow-hidden border-l border-line">
              {hours.map((hour) => (
                <Link
                  key={hour}
                  href={`/jobs/new?date=${key}&time=${String(hour).padStart(2, "0")}:00`}
                  className="block border-b border-line-soft transition hover:bg-raised/60"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
              {layout(dayJobs).map(({ job, start: from, lane, lanes }) => {
                const top = ((from - start * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(22, (job.duration_min / 60) * HOUR_HEIGHT - 3);
                const width = 100 / lanes;
                return (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className={cn(
                      "absolute overflow-hidden rounded-[8px] border px-1.5 py-1 text-[11px] leading-tight transition hover:z-10 hover:brightness-125",
                      STATUS_STYLE[job.status],
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${lane * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      borderLeftWidth: 3,
                      borderLeftColor: job.technician_color ?? "#64748b",
                    }}
                  >
                    <p className="truncate font-medium">
                      {stampTime(job.scheduled_at)} {job.vehicle_make} {job.vehicle_model}
                    </p>
                    {height > 38 && <p className="truncate text-faint">{job.service_names}</p>}
                    {height > 58 && <p className="truncate text-faint">{job.technician_name ?? "Unassigned"}</p>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({ jobs, cursor, openFrom, openTo }: { jobs: JobRow[]; cursor: Date; openFrom: string; openTo: string }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return <TimeGrid days={days} jobs={jobs} openFrom={openFrom} openTo={openTo} />;
}

function DayView({ jobs, cursor, openFrom, openTo }: { jobs: JobRow[]; cursor: Date; openFrom: string; openTo: string }) {
  const dayJobs = jobs
    .filter((job) => stampDay(job.scheduled_at) === dayKey(cursor))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <TimeGrid days={[cursor]} jobs={jobs} openFrom={openFrom} openTo={openTo} />
      <Card className="h-fit p-5">
        <h3 className="text-[15px] font-semibold">{dayJobs.length} job{dayJobs.length === 1 ? "" : "s"}</h3>
        <p className="mt-0.5 text-[12px] text-muted">
          {money(dayJobs.reduce((sum, j) => sum + (j.status === "cancelled" ? 0 : j.price), 0))} booked value
        </p>
        <ul className="mt-4 space-y-2">
          {dayJobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`} className="block rounded-[10px] border border-line bg-raised p-3 transition hover:border-brand/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium">{stampTime(job.scheduled_at)}</span>
                  <span className="text-[11px] text-faint">{JOB_STATUS_LABEL[job.status]}</span>
                </div>
                <p className="mt-0.5 truncate text-[13px]">
                  {job.vehicle_make} {job.vehicle_model}
                </p>
                <p className="truncate text-[12px] text-muted">{job.service_names}</p>
              </Link>
            </li>
          ))}
          {dayJobs.length === 0 && <li className="py-6 text-center text-[13px] text-muted">Nothing booked.</li>}
        </ul>
      </Card>
    </div>
  );
}

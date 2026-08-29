"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, CheckCircle2, ChevronLeft, Clock, Loader2, Mail, MapPin, Phone, PlayCircle,
} from "lucide-react";
import { CarSilhouette, paintFor } from "@/components/car-art";
import { Badge, cn } from "@/components/ui";
import { ChecklistPanel, NotesPanel, PhotoPanel } from "@/components/admin/job-panels";
import { setJobStatusAction } from "@/lib/actions/jobs";
import { duration, JOB_STATUS_LABEL, JOB_STATUS_TONE, money } from "@/lib/format";
import { formatDate, stampTime } from "@/lib/dates";
import type { ChecklistItem, JobNote, JobPhoto, JobRow, JobService } from "@/lib/types";

const TABS = ["Overview", "Checklist", "Photos", "Notes"] as const;

export function TechJobDetail({
  job,
  services,
  checklist,
  photos,
  notes,
  vehicleColor,
}: {
  job: JobRow;
  services: JobService[];
  checklist: ChecklistItem[];
  photos: JobPhoto[];
  notes: JobNote[];
  vehicleColor: string | null;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const done = checklist.filter((item) => item.done).length;

  function advance(status: "in_progress" | "completed") {
    startTransition(async () => {
      await setJobStatusAction(job.id, status);
      router.refresh();
    });
  }

  return (
    <div>
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Link href="/app" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-fg">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-center text-[15px] font-semibold">Job details</h1>
        <span className="w-8 text-right text-[11px] text-faint">{job.job_number.split("-").pop()}</span>
      </header>

      <div className="px-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 shrink-0 rounded-[10px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] p-1.5">
            <CarSilhouette
              make={job.vehicle_make}
              model={job.vehicle_model}
              color={paintFor(job.vehicle_make, job.vehicle_model, vehicleColor)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">
              {job.vehicle_make} {job.vehicle_model}
            </p>
            <p className="truncate text-[12.5px] text-muted">{services.map((s) => s.name).join(", ")}</p>
            <p className="mt-0.5 text-[12px] text-faint">
              {job.vehicle_plate && <span className="font-mono tracking-wider">{job.vehicle_plate}</span>}
              {job.vehicle_mileage ? ` · ${new Intl.NumberFormat("sv-SE").format(job.vehicle_mileage)} km` : ""}
            </p>
            <div className="mt-1.5">
              <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-1 rounded-[10px] border border-line bg-raised p-0.5">
          {TABS.map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[12.5px] font-medium transition",
                tab === option ? "bg-brand text-white" : "text-muted",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "Overview" && (
            <div className="space-y-4">
              <section>
                <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Customer</h2>
                <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-panel p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{job.customer_name ?? "Walk-in"}</p>
                    <p className="text-[12px] text-muted">{job.customer_phone || job.customer_email || "No contact"}</p>
                  </div>
                  <div className="flex gap-2">
                    {job.customer_phone && (
                      <a
                        href={`tel:${job.customer_phone}`}
                        aria-label="Call customer"
                        className="grid size-9 place-items-center rounded-full border border-line bg-raised text-brand"
                      >
                        <Phone className="size-4" />
                      </a>
                    )}
                    {job.customer_email && (
                      <a
                        href={`mailto:${job.customer_email}`}
                        aria-label="Email customer"
                        className="grid size-9 place-items-center rounded-full border border-line bg-raised text-brand"
                      >
                        <Mail className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Address</h2>
                <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-panel p-3.5">
                  <p className="min-w-0 text-[13px]">
                    {job.location_type === "onsite" ? (
                      <>
                        {job.address}
                        <br />
                        <span className="text-muted">{job.city}</span>
                      </>
                    ) : (
                      <span className="text-muted">At the shop</span>
                    )}
                  </p>
                  {job.location_type === "onsite" && job.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address}, ${job.city}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open in maps"
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-raised text-brand"
                    >
                      <MapPin className="size-4" />
                    </a>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] border border-line bg-panel p-3.5">
                  <p className="text-[11px] tracking-wide text-faint uppercase">Start time</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold tabular-nums">
                    <Clock className="size-4 text-faint" />
                    {stampTime(job.scheduled_at)}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{formatDate(job.scheduled_at)}</p>
                </div>
                <div className="rounded-[12px] border border-line bg-panel p-3.5">
                  <p className="text-[11px] tracking-wide text-faint uppercase">Estimated time</p>
                  <p className="mt-1 text-[15px] font-semibold">{duration(job.duration_min)}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{money(job.price)}</p>
                </div>
              </section>

              {job.notes && (
                <section>
                  <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">From the office</h2>
                  <p className="rounded-[12px] border border-line bg-panel p-3.5 text-[13px] whitespace-pre-wrap text-muted">
                    {job.notes}
                  </p>
                </section>
              )}

              <button
                onClick={() => setTab("Photos")}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-strong py-3 text-[13.5px] font-medium text-white transition hover:bg-brand"
              >
                <Camera className="size-4.5" /> Add before photos
              </button>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold tracking-wide text-faint uppercase">Job checklist</h2>
                  <span className="text-[11.5px] text-faint">
                    {done} / {checklist.length} completed
                  </span>
                </div>
                <div className="rounded-[12px] border border-line bg-panel p-3.5">
                  <ChecklistPanel jobId={job.id} items={checklist} editable={false} compact />
                </div>
              </section>
            </div>
          )}

          {tab === "Checklist" && (
            <div className="rounded-[12px] border border-line bg-panel p-3.5">
              <ChecklistPanel jobId={job.id} items={checklist} editable={false} compact />
            </div>
          )}

          {tab === "Photos" && (
            <div className="rounded-[12px] border border-line bg-panel p-3.5">
              <PhotoPanel jobId={job.id} photos={photos} />
            </div>
          )}

          {tab === "Notes" && (
            <div className="rounded-[12px] border border-line bg-panel p-3.5">
              <NotesPanel jobId={job.id} notes={notes} />
            </div>
          )}
        </div>
      </div>

      {(job.status === "booked" || job.status === "confirmed" || job.status === "in_progress") && (
        <div className="fixed inset-x-0 bottom-[57px] mx-auto w-full max-w-md border-t border-line bg-rail/95 p-3 backdrop-blur-xl">
          {job.status === "in_progress" ? (
            <button
              onClick={() => advance("completed")}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-success py-3 text-[14px] font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" /> : <CheckCircle2 className="size-4.5" />}
              Complete job
            </button>
          ) : (
            <button
              onClick={() => advance("in_progress")}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-strong py-3 text-[14px] font-semibold text-white transition hover:bg-brand disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" /> : <PlayCircle className="size-4.5" />}
              Start job
            </button>
          )}
        </div>
      )}
    </div>
  );
}

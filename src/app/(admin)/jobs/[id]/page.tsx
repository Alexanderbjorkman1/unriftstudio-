import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft, Clock, FileText, Gauge, Mail, MapPin, Pencil, Phone, Receipt, User as UserIcon,
} from "lucide-react";
import { Badge, Card, CardHeader, LinkButton, Avatar } from "@/components/ui";
import { CarSilhouette, paintFor } from "@/components/car-art";
import {
  ChecklistPanel, NotesPanel, PanelCard, PhotoPanel, StatusActions,
} from "@/components/admin/job-panels";
import { JobProductsPanel } from "@/components/admin/job-products";
import {
  getJob, jobChecklist, jobNotes, jobPhotos, jobProducts, jobServices,
} from "@/lib/repo/jobs";
import { getVehicle } from "@/lib/repo/vehicles";
import { listProducts } from "@/lib/repo/products";
import { getDb } from "@/lib/db";
import { CONDITION_LABEL, duration, JOB_STATUS_LABEL, JOB_STATUS_TONE, money } from "@/lib/format";
import { formatDate, stampTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const job = getJob(Number((await params).id));
  return { title: job ? `${job.job_number} · Job` : "Job" };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) notFound();

  const services = jobServices(job.id);
  const products = jobProducts(job.id);
  const checklist = jobChecklist(job.id);
  const photos = jobPhotos(job.id);
  const notes = jobNotes(job.id);
  const vehicle = job.vehicle_id ? getVehicle(job.vehicle_id) : undefined;
  const invoice = getDb().prepare("SELECT id, invoice_number, status FROM invoices WHERE job_id = ?").get(job.id) as
    | { id: number; invoice_number: string; status: string }
    | undefined;

  const productsTotal = products.reduce((sum, p) => sum + p.price * p.qty, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Back to jobs
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusActions jobId={job.id} status={job.status} />
          <LinkButton href={`/jobs/${job.id}/edit`} variant="secondary">
            <Pencil className="size-4" /> Edit
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="grid h-28 w-44 shrink-0 place-items-center rounded-[12px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] px-3">
            <CarSilhouette
              make={job.vehicle_make}
              model={job.vehicle_model}
              color={paintFor(job.vehicle_make, job.vehicle_model, vehicle?.color)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {job.vehicle_make} {job.vehicle_model}
                {job.vehicle_year ? <span className="ml-2 text-muted">{job.vehicle_year}</span> : null}
              </h1>
              <Badge tone={JOB_STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
              {job.source === "online" && <Badge tone="cyan">Online booking</Badge>}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {job.job_number} · {services.map((s) => s.name).join(", ") || "No services"}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              <span className="flex items-center gap-1.5 text-muted">
                <Clock className="size-4 text-faint" />
                {formatDate(job.scheduled_at, { weekday: "short", day: "numeric", month: "short" })} · {stampTime(job.scheduled_at)}
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <Gauge className="size-4 text-faint" />
                {duration(job.duration_min)}
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-4 text-faint" />
                {job.location_type === "onsite" ? `${job.address || "Customer address"}, ${job.city}` : "At the shop"}
              </span>
              {job.vehicle_plate && (
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                    {job.vehicle_plate}
                  </span>
                  {job.vehicle_mileage ? `${new Intl.NumberFormat("sv-SE").format(job.vehicle_mileage)} km` : null}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] tracking-wide text-faint uppercase">Total</p>
            <p className="text-2xl font-semibold tabular-nums">{money(job.price + productsTotal)}</p>
            {invoice ? (
              <Link href={`/invoices/${invoice.id}`} className="mt-1 inline-flex items-center gap-1 text-[12px] text-brand hover:text-fg">
                <Receipt className="size-3.5" /> Invoice #{invoice.invoice_number}
              </Link>
            ) : (
              <p className="mt-1 text-[12px] text-faint">Not invoiced</p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <PanelCard title="Checklist">
            <ChecklistPanel jobId={job.id} items={checklist} compact />
          </PanelCard>

          <PanelCard title="Before &amp; after photos">
            <PhotoPanel jobId={job.id} photos={photos} />
          </PanelCard>

          <PanelCard title="Notes">
            <NotesPanel jobId={job.id} notes={notes} />
          </PanelCard>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Customer"
              action={
                job.customer_id ? (
                  <Link href={`/customers/${job.customer_id}`} className="text-xs font-medium text-brand hover:text-fg">
                    Open
                  </Link>
                ) : undefined
              }
            />
            <div className="px-5 pb-5">
              {job.customer_name ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar name={job.customer_name} size={38} color="#2563EB" />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{job.customer_name}</p>
                      <p className="text-[12px] text-muted">Customer</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-[13px]">
                    {job.customer_phone && (
                      <a href={`tel:${job.customer_phone}`} className="flex items-center gap-2 text-muted hover:text-fg">
                        <Phone className="size-4 text-faint" /> {job.customer_phone}
                      </a>
                    )}
                    {job.customer_email && (
                      <a href={`mailto:${job.customer_email}`} className="flex items-center gap-2 text-muted hover:text-fg">
                        <Mail className="size-4 text-faint" /> {job.customer_email}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-muted">Walk-in customer.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Assignment" />
            <div className="px-5 pb-5">
              {job.technician_name ? (
                <div className="flex items-center gap-3">
                  <Avatar name={job.technician_name} color={job.technician_color ?? "#3B82F6"} size={38} />
                  <div>
                    <p className="text-[14px] font-medium">{job.technician_name}</p>
                    <p className="text-[12px] text-muted">Assigned technician</p>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-[13px] text-warn">
                  <UserIcon className="size-4" /> No technician assigned yet.
                </p>
              )}
              <dl className="mt-4 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Condition</dt>
                  <dd>{CONDITION_LABEL[job.condition]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Started</dt>
                  <dd>{job.started_at ? `${formatDate(job.started_at)} ${stampTime(job.started_at)}` : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Completed</dt>
                  <dd>{job.completed_at ? `${formatDate(job.completed_at)} ${stampTime(job.completed_at)}` : "—"}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Services &amp; extras" />
            <div className="px-5 pb-5">
              <ul className="space-y-2 text-[13px]">
                {services.map((service) => (
                  <li key={service.id} className="flex justify-between gap-3">
                    <span className="text-muted">{service.name}</span>
                    <span className="tabular-nums">{money(service.price)}</span>
                  </li>
                ))}
                {services.length === 0 && <li className="text-muted">No services on this job.</li>}
              </ul>
              <JobProductsPanel jobId={job.id} rows={products} products={listProducts(true)} />
              <div className="mt-4 flex justify-between border-t border-line pt-3 text-[15px] font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(job.price + productsTotal)}</span>
              </div>
            </div>
          </Card>

          {job.notes && (
            <Card>
              <CardHeader title="Internal note" />
              <p className="flex gap-2 px-5 pb-5 text-[13px] whitespace-pre-wrap text-muted">
                <FileText className="mt-0.5 size-4 shrink-0 text-faint" />
                {job.notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

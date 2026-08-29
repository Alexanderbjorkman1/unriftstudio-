import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { VehicleThumb } from "@/components/car-art";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCustomerAction } from "@/lib/actions/crm";
import { customerVehicles, getCustomer } from "@/lib/repo/customers";
import { listJobs } from "@/lib/repo/jobs";
import { listInvoices } from "@/lib/repo/invoices";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, INVOICE_STATUS_TONE, money } from "@/lib/format";
import { formatDate, stampTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const customer = getCustomer(Number((await params).id));
  return { title: customer?.name ?? "Customer" };
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = getCustomer(Number(id));
  if (!customer) notFound();

  const vehicles = customerVehicles(customer.id);
  const jobs = listJobs({ customerId: customer.id, order: "desc" });
  const invoices = listInvoices("all").filter((i) => i.customer_id === customer.id);
  const spend = jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.price, 0);
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/customers" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Back to customers
        </Link>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/jobs/new?customer=${customer.id}`} variant="secondary">
            <Plus className="size-4" /> Book a job
          </LinkButton>
          <LinkButton href={`/customers/${customer.id}/edit`} variant="secondary">
            <Pencil className="size-4" /> Edit
          </LinkButton>
          <DeleteButton action={deleteCustomerAction.bind(null, customer.id)} label="Delete" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={customer.name} size={48} color="#2563EB" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight">{customer.name}</h1>
                <p className="text-[12px] text-muted">{customer.company || "Private customer"}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-[13px]">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-muted hover:text-fg">
                  <Phone className="size-4 text-faint" /> {customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-muted hover:text-fg">
                  <Mail className="size-4 text-faint" /> {customer.email}
                </a>
              )}
              {(customer.address || customer.city) && (
                <p className="flex items-start gap-2 text-muted">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-faint" />
                  <span>
                    {customer.address}
                    <br />
                    {customer.postal_code} {customer.city}
                  </span>
                </p>
              )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
              <div>
                <dt className="text-[11px] tracking-wide text-faint uppercase">Lifetime spend</dt>
                <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{money(spend)}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-faint uppercase">Jobs</dt>
                <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{jobs.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-faint uppercase">Outstanding</dt>
                <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{money(outstanding)}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-faint uppercase">Customer since</dt>
                <dd className="mt-0.5 text-[13px]">{formatDate(customer.created_at)}</dd>
              </div>
            </dl>

            {customer.notes && (
              <p className="mt-4 rounded-[10px] border border-line bg-raised px-3 py-2 text-[12px] whitespace-pre-wrap text-muted">
                {customer.notes}
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Vehicles"
              action={
                <Link href={`/vehicles/new?customer=${customer.id}`} className="text-xs font-medium text-brand hover:text-fg">
                  Add
                </Link>
              }
            />
            <div className="space-y-1 px-3 pb-4">
              {vehicles.length === 0 ? (
                <p className="px-2 py-4 text-[13px] text-muted">No vehicles on file.</p>
              ) : (
                vehicles.map((vehicle) => (
                  <Link
                    key={vehicle.id}
                    href={`/vehicles/${vehicle.id}`}
                    className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-raised"
                  >
                    <VehicleThumb make={vehicle.make} model={vehicle.model} color={undefined} className="h-10 w-15" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {vehicle.make} {vehicle.model}
                      </span>
                      <span className="block text-[11px] text-faint">
                        {vehicle.year} · {vehicle.plate}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Job history" />
            {jobs.length === 0 ? (
              <EmptyState title="No jobs yet" description="Book this customer in to get started." />
            ) : (
              <Table className="min-w-[520px]">
                <thead>
                  <tr>
                    <Th>Job</Th>
                    <Th>Vehicle</Th>
                    <Th>Service</Th>
                    <Th>Date</Th>
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
                      <Td className="text-muted">
                        {job.vehicle_make} {job.vehicle_model}
                      </Td>
                      <Td className="max-w-[160px] truncate text-muted">{job.service_names}</Td>
                      <Td className="whitespace-nowrap text-muted">
                        {formatDate(job.scheduled_at)} <span className="text-faint">{stampTime(job.scheduled_at)}</span>
                      </Td>
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

          <Card className="overflow-hidden">
            <CardHeader title="Invoices" />
            {invoices.length === 0 ? (
              <EmptyState title="No invoices" />
            ) : (
              <Table className="min-w-[420px]">
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Issued</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="group transition hover:bg-raised/60">
                      <Td>
                        <Link href={`/invoices/${invoice.id}`} className="font-medium group-hover:text-brand">
                          #{invoice.invoice_number}
                        </Link>
                      </Td>
                      <Td className="text-muted">{formatDate(invoice.issued_at)}</Td>
                      <Td className="text-muted">{formatDate(invoice.due_at)}</Td>
                      <Td>
                        <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{money(invoice.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { LineItemsEditor } from "@/components/admin/line-items";
import type { Customer, JobRow, LineItem, Service } from "@/lib/types";
import type { InvoiceRow } from "@/lib/repo/invoices";
import { addDays, dayKey } from "@/lib/dates";

export function InvoiceForm({
  action,
  invoice,
  items,
  customers,
  jobs,
  services,
  defaultVat,
}: {
  action: (formData: FormData) => void | Promise<void>;
  invoice?: InvoiceRow;
  items: LineItem[];
  customers: Customer[];
  jobs: JobRow[];
  services: Service[];
  defaultVat: number;
}) {
  const today = dayKey(new Date());

  return (
    <form action={action} className="max-w-4xl space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Customer">
            <Select name="customer_id" defaultValue={String(invoice?.customer_id ?? "")}>
              <option value="">No customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Linked job">
            <Select name="job_id" defaultValue={String(invoice?.job_id ?? "")}>
              <option value="">None</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_number} — {job.customer_name ?? "Walk-in"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={invoice?.status ?? "draft"}>
              {["draft", "sent", "paid", "overdue"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Issued">
            <Input type="date" name="issued_at" defaultValue={invoice?.issued_at ?? today} />
          </Field>
          <Field label="Due">
            <Input type="date" name="due_at" defaultValue={invoice?.due_at ?? dayKey(addDays(new Date(), 14))} />
          </Field>
          <Field label="VAT %">
            <Input type="number" name="vat_rate" min={0} max={100} defaultValue={invoice?.vat_rate ?? defaultVat} />
          </Field>
          <Field label="Payment method">
            <Select name="payment_method" defaultValue={invoice?.payment_method ?? ""}>
              <option value="">Not paid</option>
              {["Card", "Swish", "Invoice", "Cash", "Bank transfer"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Lines</h2>
        <LineItemsEditor items={items} services={services} vatRate={invoice?.vat_rate ?? defaultVat} />
      </Card>

      <Card className="p-5">
        <Field label="Notes shown on the invoice">
          <Textarea name="notes" defaultValue={invoice?.notes} placeholder="Thank you for your business. Payment within 14 days." />
        </Field>
      </Card>

      <Button type="submit" size="lg">
        {invoice ? "Save invoice" : "Create invoice"}
      </Button>
    </form>
  );
}

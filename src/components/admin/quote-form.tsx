import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { LineItemsEditor } from "@/components/admin/line-items";
import type { Customer, LineItem, Service, Vehicle } from "@/lib/types";
import type { QuoteRow } from "@/lib/repo/quotes";
import { addDays, dayKey } from "@/lib/dates";

export function QuoteForm({
  action,
  quote,
  items,
  customers,
  vehicles,
  services,
}: {
  action: (formData: FormData) => void | Promise<void>;
  quote?: QuoteRow;
  items: LineItem[];
  customers: Customer[];
  vehicles: Vehicle[];
  services: Service[];
}) {
  return (
    <form action={action} className="max-w-4xl space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Customer">
            <Select name="customer_id" defaultValue={String(quote?.customer_id ?? "")}>
              <option value="">No customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle">
            <Select name="vehicle_id" defaultValue={String(quote?.vehicle_id ?? "")}>
              <option value="">Not specified</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} {vehicle.plate ? `· ${vehicle.plate}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={quote?.status ?? "draft"}>
              {["draft", "sent", "accepted", "declined", "expired"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valid until">
            <Input type="date" name="valid_until" defaultValue={quote?.valid_until ?? dayKey(addDays(new Date(), 30))} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Lines</h2>
        <LineItemsEditor items={items} services={services} vatRate={0} showVat={false} />
      </Card>

      <Card className="p-5">
        <Field label="Notes shown on the quote">
          <Textarea name="notes" defaultValue={quote?.notes} placeholder="Prices include VAT. Valid for 30 days." />
        </Field>
      </Card>

      <Button type="submit" size="lg">
        {quote ? "Save quote" : "Create quote"}
      </Button>
    </form>
  );
}

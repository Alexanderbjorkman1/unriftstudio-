import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { Customer, Vehicle } from "@/lib/types";

export function VehicleForm({
  action,
  vehicle,
  customers,
  defaultCustomerId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  vehicle?: Vehicle;
  customers: Customer[];
  defaultCustomerId?: string;
}) {
  return (
    <form action={action} className="max-w-3xl space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Vehicle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Make">
            <Input name="make" required defaultValue={vehicle?.make} placeholder="BMW" />
          </Field>
          <Field label="Model">
            <Input name="model" required defaultValue={vehicle?.model} placeholder="530d" />
          </Field>
          <Field label="Year">
            <Input name="year" type="number" min={1950} max={2100} defaultValue={vehicle?.year ?? ""} placeholder="2019" />
          </Field>
          <Field label="Registration">
            <Input name="plate" defaultValue={vehicle?.plate} placeholder="ABC123" className="font-mono uppercase" />
          </Field>
          <Field label="Colour">
            <Input name="color" defaultValue={vehicle?.color} placeholder="Black" />
          </Field>
          <Field label="Size class" hint="Drives the price multiplier on every service.">
            <Select name="size" defaultValue={vehicle?.size ?? "medium"}>
              <option value="small">Small (city car, coupe)</option>
              <option value="medium">Medium (hatch, compact)</option>
              <option value="large">Large (sedan, estate)</option>
              <option value="xl">XL (SUV, van)</option>
            </Select>
          </Field>
          <Field label="Mileage (km)">
            <Input name="mileage" type="number" min={0} defaultValue={vehicle?.mileage ?? ""} placeholder="124000" />
          </Field>
          <Field label="Owner">
            <Select name="customer_id" defaultValue={String(vehicle?.customer_id ?? defaultCustomerId ?? "")}>
              <option value="">No owner on file</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes" className="mt-4">
          <Textarea name="notes" defaultValue={vehicle?.notes} placeholder="Ceramic coated Mar 2024, avoid automatic wash…" />
        </Field>
      </Card>

      <Button type="submit" size="lg">
        {vehicle ? "Save vehicle" : "Create vehicle"}
      </Button>
    </form>
  );
}

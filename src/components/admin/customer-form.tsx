import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { Customer } from "@/lib/types";

export function CustomerForm({
  action,
  customer,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customer?: Customer;
}) {
  return (
    <form action={action} className="max-w-3xl space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required defaultValue={customer?.name} placeholder="Erik Lindqvist" />
          </Field>
          <Field label="Company (optional)">
            <Input name="company" defaultValue={customer?.company} placeholder="Nordic Leasing AB" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={customer?.email} placeholder="erik@mail.se" />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={customer?.phone} placeholder="070-123 45 67" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Address</h2>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Street">
            <Input name="address" defaultValue={customer?.address} placeholder="Kungsgatan 12" />
          </Field>
          <Field label="Postal code">
            <Input name="postal_code" defaultValue={customer?.postal_code} placeholder="111 43" />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={customer?.city} placeholder="Stockholm" />
          </Field>
        </div>
        <Field label="Notes" className="mt-4">
          <Textarea name="notes" defaultValue={customer?.notes} placeholder="Prefers Saturday mornings, has a garage…" />
        </Field>
      </Card>

      <Button type="submit" size="lg">
        {customer ? "Save customer" : "Create customer"}
      </Button>
    </form>
  );
}

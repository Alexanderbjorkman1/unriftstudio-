import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listCustomers } from "@/lib/repo/customers";
import { money } from "@/lib/format";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function TechCustomersPage() {
  await requireUser("/app/customers");
  const customers = listCustomers().filter((customer) => customer.job_count > 0);

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">{customers.length} people you have worked for.</p>

      <ul className="space-y-2">
        {customers.map((customer) => (
          <li key={customer.id} className="rounded-[12px] border border-line bg-panel p-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={customer.name} size={38} color="#2563EB" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{customer.name}</p>
                <p className="text-[12px] text-muted">
                  {customer.job_count} jobs · {money(customer.total_spend)}
                  {customer.last_visit ? ` · last ${formatDate(customer.last_visit)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {customer.phone && (
                  <Link
                    href={`tel:${customer.phone}`}
                    aria-label={`Call ${customer.name}`}
                    className="grid size-9 place-items-center rounded-full border border-line bg-raised text-brand"
                  >
                    <Phone className="size-4" />
                  </Link>
                )}
                {customer.email && (
                  <Link
                    href={`mailto:${customer.email}`}
                    aria-label={`Email ${customer.name}`}
                    className="grid size-9 place-items-center rounded-full border border-line bg-raised text-brand"
                  >
                    <Mail className="size-4" />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

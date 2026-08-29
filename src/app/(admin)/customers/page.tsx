import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Avatar, Card, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { SearchInput } from "@/components/admin/filters";
import { listCustomers } from "@/lib/repo/customers";
import { money } from "@/lib/format";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const customers = listCustomers(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search by name, email, phone or city…" />
        <div className="ml-auto">
          <LinkButton href="/customers/new">
            <Plus className="size-4" /> New customer
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No customers yet"
            description="They appear here automatically when someone books online."
            action={
              <Link href="/customers/new" className="text-[13px] font-medium text-brand hover:text-fg">
                Add one manually
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th>City</Th>
                <Th className="text-right">Vehicles</Th>
                <Th className="text-right">Jobs</Th>
                <Th className="text-right">Spend</Th>
                <Th>Last visit</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="group transition hover:bg-raised/60">
                  <Td>
                    <Link href={`/customers/${customer.id}`} className="flex items-center gap-3">
                      <Avatar name={customer.name} size={32} color="#2563EB" />
                      <span>
                        <span className="block font-medium group-hover:text-brand">{customer.name}</span>
                        {customer.company && <span className="block text-[11px] text-faint">{customer.company}</span>}
                      </span>
                    </Link>
                  </Td>
                  <Td className="text-muted">
                    <span className="block">{customer.phone || "—"}</span>
                    <span className="block text-[11px] text-faint">{customer.email}</span>
                  </Td>
                  <Td className="text-muted">{customer.city || "—"}</Td>
                  <Td className="text-right tabular-nums">{customer.vehicle_count}</Td>
                  <Td className="text-right tabular-nums">{customer.job_count}</Td>
                  <Td className="text-right font-medium tabular-nums">{money(customer.total_spend)}</Td>
                  <Td className="whitespace-nowrap text-muted">
                    {customer.last_visit ? formatDate(customer.last_visit) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

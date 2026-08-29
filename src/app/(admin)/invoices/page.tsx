import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { FilterTabs, SearchInput } from "@/components/admin/filters";
import { listInvoices } from "@/lib/repo/invoices";
import { INVOICE_STATUS_TONE, money } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { dayKey } from "@/lib/dates";
import type { InvoiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const invoices = listInvoices(status as InvoiceStatus | "all", q);
  const all = listInvoices("all");
  const today = dayKey(new Date());

  const outstanding = all
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0);
  const overdue = all
    .filter((i) => i.status === "overdue" || (i.status === "sent" && i.due_at < today))
    .reduce((sum, i) => sum + i.total, 0);
  const paidThisMonth = all
    .filter((i) => i.status === "paid" && i.paid_at?.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, i) => sum + i.total, 0);

  const counts = all.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Outstanding", outstanding, "text-warn"],
          ["Overdue", overdue, "text-danger"],
          ["Paid this month", paidThisMonth, "text-success"],
        ].map(([label, value, tone]) => (
          <Card key={label as string} className="px-4 py-3.5">
            <p className="text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">{label as string}</p>
            <p className={`mt-1 text-[22px] font-semibold tabular-nums ${tone as string}`}>{money(value as number)}</p>
          </Card>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          options={[
            { value: "all", label: "All", count: all.length },
            { value: "draft", label: "Draft", count: counts.draft ?? 0 },
            { value: "sent", label: "Sent", count: counts.sent ?? 0 },
            { value: "paid", label: "Paid", count: counts.paid ?? 0 },
            { value: "overdue", label: "Overdue", count: counts.overdue ?? 0 },
          ]}
          active={status}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search invoices…" />
          <LinkButton href="/invoices/new">
            <Plus className="size-4" /> New invoice
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-5" />}
            title="No invoices here"
            description="Completing a job drafts its invoice automatically."
            action={
              <Link href="/invoices/new" className="text-[13px] font-medium text-brand hover:text-fg">
                Create one manually
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th>Job</Th>
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
                  <Td>
                    {invoice.customer_id ? (
                      <Link href={`/customers/${invoice.customer_id}`} className="text-muted hover:text-brand">
                        {invoice.customer_name}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td className="text-muted">{invoice.job_number ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(invoice.issued_at)}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(invoice.due_at)}</Td>
                  <Td>
                    <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{money(invoice.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

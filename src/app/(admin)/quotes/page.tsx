import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { FilterTabs, SearchInput } from "@/components/admin/filters";
import { listQuotes } from "@/lib/repo/quotes";
import { QUOTE_STATUS_TONE, money } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { QuoteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const quotes = listQuotes(status as QuoteStatus | "all", q);
  const all = listQuotes("all");
  const counts = all.reduce<Record<string, number>>((acc, quote) => {
    acc[quote.status] = (acc[quote.status] ?? 0) + 1;
    return acc;
  }, {});
  const openValue = all.filter((quote) => quote.status === "sent").reduce((sum, quote) => sum + quote.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          options={[
            { value: "all", label: "All", count: all.length },
            { value: "draft", label: "Draft", count: counts.draft ?? 0 },
            { value: "sent", label: "Sent", count: counts.sent ?? 0 },
            { value: "accepted", label: "Accepted", count: counts.accepted ?? 0 },
            { value: "declined", label: "Declined", count: counts.declined ?? 0 },
          ]}
          active={status}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">
            Open value <span className="font-medium text-fg tabular-nums">{money(openValue)}</span>
          </span>
          <SearchInput placeholder="Search quotes…" />
          <LinkButton href="/quotes/new">
            <Plus className="size-4" /> New quote
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        {quotes.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No quotes here"
            description="Send an estimate and convert it to a job when the customer says yes."
            action={
              <Link href="/quotes/new" className="text-[13px] font-medium text-brand hover:text-fg">
                Create a quote
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Quote</Th>
                <Th>Customer</Th>
                <Th>Vehicle</Th>
                <Th>Created</Th>
                <Th>Valid until</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="group transition hover:bg-raised/60">
                  <Td>
                    <Link href={`/quotes/${quote.id}`} className="font-medium group-hover:text-brand">
                      {quote.quote_number}
                    </Link>
                  </Td>
                  <Td>
                    {quote.customer_id ? (
                      <Link href={`/customers/${quote.customer_id}`} className="text-muted hover:text-brand">
                        {quote.customer_name}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td className="text-muted">{quote.vehicle_label ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(quote.created_at)}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(quote.valid_until)}</Td>
                  <Td>
                    <Badge tone={QUOTE_STATUS_TONE[quote.status]}>{quote.status}</Badge>
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{money(quote.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

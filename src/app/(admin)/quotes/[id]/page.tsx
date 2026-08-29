import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Badge, LinkButton } from "@/components/ui";
import { DocumentSheet } from "@/components/admin/document";
import { ConvertQuoteButton, PrintButton, QuoteStatusActions } from "@/components/admin/doc-actions";
import { DeleteButton } from "@/components/admin/delete-button";
import { convertQuoteToJobAction, deleteQuoteAction } from "@/lib/actions/billing";
import { getQuote, quoteItems } from "@/lib/repo/quotes";
import { getCustomer } from "@/lib/repo/customers";
import { getSettings } from "@/lib/repo/settings";
import { QUOTE_STATUS_TONE } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const quote = getQuote(Number((await params).id));
  return { title: quote ? `Quote ${quote.quote_number}` : "Quote" };
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = getQuote(Number(id));
  if (!quote) notFound();

  const items = quoteItems(quote.id);
  const customer = quote.customer_id ? getCustomer(quote.customer_id) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/quotes" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Back to quotes
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={QUOTE_STATUS_TONE[quote.status]}>{quote.status}</Badge>
          <QuoteStatusActions id={quote.id} status={quote.status} />
          <ConvertQuoteButton action={convertQuoteToJobAction.bind(null, quote.id)} />
          <PrintButton />
          <LinkButton href={`/quotes/${quote.id}/edit`} variant="secondary">
            <Pencil className="size-4" /> Edit
          </LinkButton>
          <DeleteButton action={deleteQuoteAction.bind(null, quote.id)} />
        </div>
      </div>

      <DocumentSheet
        kind="Quote"
        number={quote.quote_number}
        settings={getSettings()}
        customer={customer}
        issuedLabel="Created"
        issuedAt={quote.created_at}
        dueLabel="Valid until"
        dueAt={quote.valid_until}
        items={items}
        notes={quote.notes || "Prices include VAT. Booking confirms the quote."}
        footer={
          quote.vehicle_label ? (
            <p className="mt-6 border-t border-line pt-4 text-[12px] text-muted print:border-black/20 print:text-black/70">
              Vehicle: {quote.vehicle_label}
            </p>
          ) : undefined
        }
      />
    </div>
  );
}

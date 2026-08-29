import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { QuoteForm } from "@/components/admin/quote-form";
import { saveQuoteAction } from "@/lib/actions/billing";
import { getQuote, quoteItems } from "@/lib/repo/quotes";
import { listCustomers } from "@/lib/repo/customers";
import { listVehicles } from "@/lib/repo/vehicles";
import { listServices } from "@/lib/repo/services";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = getQuote(Number(id));
  if (!quote) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/quotes/${quote.id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to quote
      </Link>
      <QuoteForm
        action={saveQuoteAction.bind(null, quote.id)}
        quote={quote}
        items={quoteItems(quote.id)}
        customers={listCustomers()}
        vehicles={listVehicles()}
        services={listServices(true)}
      />
    </div>
  );
}

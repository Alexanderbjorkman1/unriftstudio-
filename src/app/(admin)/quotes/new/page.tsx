import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { QuoteForm } from "@/components/admin/quote-form";
import { saveQuoteAction } from "@/lib/actions/billing";
import { listCustomers } from "@/lib/repo/customers";
import { listVehicles } from "@/lib/repo/vehicles";
import { listServices } from "@/lib/repo/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "New quote" };

export default function NewQuotePage() {
  return (
    <div className="space-y-4">
      <Link href="/quotes" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to quotes
      </Link>
      <QuoteForm
        action={saveQuoteAction.bind(null, null)}
        items={[]}
        customers={listCustomers()}
        vehicles={listVehicles()}
        services={listServices(true)}
      />
    </div>
  );
}

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InvoiceForm } from "@/components/admin/invoice-form";
import { saveInvoiceAction } from "@/lib/actions/billing";
import { listCustomers } from "@/lib/repo/customers";
import { listJobs } from "@/lib/repo/jobs";
import { listServices } from "@/lib/repo/services";
import { getSettings } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return (
    <div className="space-y-4">
      <Link href="/invoices" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to invoices
      </Link>
      <InvoiceForm
        action={saveInvoiceAction.bind(null, null)}
        items={[]}
        customers={listCustomers()}
        jobs={listJobs({ order: "desc", limit: 60 })}
        services={listServices(true)}
        defaultVat={getSettings().vat_rate}
      />
    </div>
  );
}

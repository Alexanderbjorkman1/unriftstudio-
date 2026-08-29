import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InvoiceForm } from "@/components/admin/invoice-form";
import { saveInvoiceAction } from "@/lib/actions/billing";
import { getInvoice, invoiceItems } from "@/lib/repo/invoices";
import { listCustomers } from "@/lib/repo/customers";
import { listJobs } from "@/lib/repo/jobs";
import { listServices } from "@/lib/repo/services";
import { getSettings } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = getInvoice(Number(id));
  if (!invoice) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to invoice
      </Link>
      <InvoiceForm
        action={saveInvoiceAction.bind(null, invoice.id)}
        invoice={invoice}
        items={invoiceItems(invoice.id)}
        customers={listCustomers()}
        jobs={listJobs({ order: "desc", limit: 60 })}
        services={listServices(true)}
        defaultVat={getSettings().vat_rate}
      />
    </div>
  );
}

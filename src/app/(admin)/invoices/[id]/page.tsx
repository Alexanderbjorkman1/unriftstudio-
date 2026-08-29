import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Badge, LinkButton } from "@/components/ui";
import { DocumentSheet } from "@/components/admin/document";
import { InvoiceStatusActions, PrintButton } from "@/components/admin/doc-actions";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteInvoiceAction } from "@/lib/actions/billing";
import { getInvoice, invoiceItems } from "@/lib/repo/invoices";
import { getCustomer } from "@/lib/repo/customers";
import { getSettings } from "@/lib/repo/settings";
import { INVOICE_STATUS_TONE } from "@/lib/format";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const invoice = getInvoice(Number((await params).id));
  return { title: invoice ? `Invoice #${invoice.invoice_number}` : "Invoice" };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = getInvoice(Number(id));
  if (!invoice) notFound();

  const items = invoiceItems(invoice.id);
  const customer = invoice.customer_id ? getCustomer(invoice.customer_id) : undefined;
  const settings = getSettings();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Back to invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
          <InvoiceStatusActions id={invoice.id} status={invoice.status} />
          <PrintButton />
          <LinkButton href={`/invoices/${invoice.id}/edit`} variant="secondary">
            <Pencil className="size-4" /> Edit
          </LinkButton>
          <DeleteButton action={deleteInvoiceAction.bind(null, invoice.id)} />
        </div>
      </div>

      <DocumentSheet
        kind="Invoice"
        number={invoice.invoice_number}
        settings={settings}
        customer={customer}
        issuedLabel="Issued"
        issuedAt={invoice.issued_at}
        dueLabel="Due"
        dueAt={invoice.due_at}
        items={items}
        vatRate={invoice.vat_rate}
        notes={invoice.notes}
        footer={
          <div className="mt-6 border-t border-line pt-4 text-[12px] text-muted print:border-black/20 print:text-black/70">
            {invoice.status === "paid" ? (
              <p>
                Paid {invoice.paid_at ? formatDate(invoice.paid_at) : ""} · {invoice.payment_method || "—"}
              </p>
            ) : (
              <p>Payment within {Math.max(0, Math.round((new Date(invoice.due_at).getTime() - new Date(invoice.issued_at).getTime()) / 86400000))} days. Late payment interest applies per Swedish law.</p>
            )}
            {invoice.job_number && (
              <p className="no-print mt-1">
                Job{" "}
                <Link href={`/jobs/${invoice.job_id}`} className="text-brand hover:text-fg">
                  {invoice.job_number}
                </Link>
              </p>
            )}
          </div>
        }
      />
    </div>
  );
}

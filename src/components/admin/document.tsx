import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { money } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { BusinessSettings, Customer, LineItem } from "@/lib/types";

/** Shared print-friendly layout for invoices and quotes. */
export function DocumentSheet({
  kind,
  number,
  settings,
  customer,
  issuedLabel,
  issuedAt,
  dueLabel,
  dueAt,
  items,
  vatRate,
  notes,
  footer,
}: {
  kind: "Invoice" | "Quote";
  number: string;
  settings: BusinessSettings;
  customer?: Customer;
  issuedLabel: string;
  issuedAt: string;
  dueLabel: string;
  dueAt: string;
  items: LineItem[];
  vatRate?: number;
  notes?: string;
  footer?: React.ReactNode;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const vat = vatRate ? Math.round((subtotal * vatRate) / 100) : 0;

  return (
    <Card className="overflow-hidden print:border-0 print:bg-white print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line p-6 print:border-black/20">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-brand-strong print:bg-black">
              <Sparkles className="size-4.5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">{settings.business_name}</span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted print:text-black/70">
            {settings.address}
            <br />
            {settings.postal_code} {settings.city}
            <br />
            {settings.email} · {settings.phone}
            <br />
            Org. nr {settings.org_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-faint uppercase">{kind}</p>
          <p className="text-2xl font-semibold tracking-tight">#{number}</p>
          <p className="mt-3 text-[12px] text-muted print:text-black/70">
            {issuedLabel}: {formatDate(issuedAt)}
            <br />
            {dueLabel}: {formatDate(dueAt)}
          </p>
        </div>
      </div>

      <div className="border-b border-line p-6 print:border-black/20">
        <p className="text-[11px] font-medium tracking-wide text-faint uppercase">Billed to</p>
        {customer ? (
          <p className="mt-1.5 text-[13px] leading-relaxed">
            <span className="font-medium">{customer.company || customer.name}</span>
            <br />
            {customer.company && (
              <>
                {customer.name}
                <br />
              </>
            )}
            {customer.address && (
              <>
                {customer.address}
                <br />
                {customer.postal_code} {customer.city}
                <br />
              </>
            )}
            {customer.email}
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] text-muted">Walk-in customer</p>
        )}
      </div>

      <div className="p-6">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line print:border-black/20">
              <th className="pb-2 text-[11px] font-medium tracking-wide text-faint uppercase">Description</th>
              <th className="pb-2 text-right text-[11px] font-medium tracking-wide text-faint uppercase">Qty</th>
              <th className="pb-2 text-right text-[11px] font-medium tracking-wide text-faint uppercase">Price</th>
              <th className="pb-2 text-right text-[11px] font-medium tracking-wide text-faint uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line-soft print:border-black/10">
                <td className="py-2.5">{item.name}</td>
                <td className="py-2.5 text-right tabular-nums">{item.qty}</td>
                <td className="py-2.5 text-right tabular-nums">{money(item.price)}</td>
                <td className="py-2.5 text-right tabular-nums">{money(item.qty * item.price)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted">
                  No lines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <dl className="mt-5 ml-auto max-w-xs space-y-2 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted print:text-black/70">Subtotal</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          {vatRate !== undefined && (
            <div className="flex justify-between">
              <dt className="text-muted print:text-black/70">VAT {vatRate}%</dt>
              <dd className="tabular-nums">{money(vat)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold print:border-black/20">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(subtotal + vat)}</dd>
          </div>
        </dl>

        {notes && <p className="mt-6 text-[12px] whitespace-pre-wrap text-muted print:text-black/70">{notes}</p>}
        {footer}
      </div>
    </Card>
  );
}

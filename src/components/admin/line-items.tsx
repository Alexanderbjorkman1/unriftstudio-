"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { money } from "@/lib/format";
import type { LineItem, Service } from "@/lib/types";

interface Row {
  key: string;
  name: string;
  qty: number;
  price: number;
}

/** Editable document lines shared by quotes and invoices. */
export function LineItemsEditor({
  items,
  services,
  vatRate,
  showVat = true,
}: {
  items: LineItem[];
  services: Service[];
  vatRate: number;
  showVat?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    items.length
      ? items.map((item, i) => ({ key: `i${i}`, name: item.name, qty: item.qty, price: item.price }))
      : [{ key: "i0", name: "", qty: 1, price: 0 }],
  );

  const subtotal = rows.reduce((sum, row) => sum + row.qty * row.price, 0);
  const vat = Math.round((subtotal * vatRate) / 100);

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addFromService(serviceId: string) {
    const service = services.find((s) => String(s.id) === serviceId);
    if (!service) return;
    setRows((prev) => [...prev, { key: `s${Date.now()}`, name: service.name, qty: 1, price: service.base_price }]);
  }

  return (
    <div>
      <div className="hidden gap-3 px-1 pb-2 text-[11px] font-medium tracking-wide text-faint uppercase sm:grid sm:grid-cols-[1fr_70px_110px_110px_28px]">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_70px_110px_110px_28px] sm:items-center">
            <input
              name="item_name"
              value={row.name}
              onChange={(e) => update(row.key, { name: e.target.value })}
              placeholder="Full Detail"
              className="rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] placeholder:text-faint focus:border-brand focus:outline-none"
            />
            <input
              name="item_qty"
              type="number"
              min={1}
              value={row.qty}
              onChange={(e) => update(row.key, { qty: Math.max(1, Number(e.target.value)) })}
              className="rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
            />
            <input
              name="item_price"
              type="number"
              min={0}
              step={5}
              value={row.price}
              onChange={(e) => update(row.key, { price: Number(e.target.value) })}
              className="rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
            />
            <span className="px-2 text-right text-[13px] tabular-nums">{money(row.qty * row.price)}</span>
            <button
              type="button"
              onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev))}
              className="grid size-7 place-items-center rounded-lg text-faint transition hover:bg-raised hover:text-danger"
              aria-label="Remove line"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { key: `n${Date.now()}`, name: "", qty: 1, price: 0 }])}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] text-muted transition hover:text-fg"
        >
          <Plus className="size-4" /> Add line
        </button>
        <select
          value=""
          onChange={(e) => addFromService(e.target.value)}
          className="rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] text-muted focus:border-brand focus:outline-none"
        >
          <option value="">Add from services…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — {money(service.base_price)}
            </option>
          ))}
        </select>
      </div>

      <dl className="mt-5 ml-auto max-w-xs space-y-2 border-t border-line pt-4 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{money(subtotal)}</dd>
        </div>
        {showVat && (
          <div className="flex justify-between">
            <dt className="text-muted">VAT {vatRate}%</dt>
            <dd className="tabular-nums">{money(vat)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(showVat ? subtotal + vat : subtotal)}</dd>
        </div>
      </dl>
    </div>
  );
}

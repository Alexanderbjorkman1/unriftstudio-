"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Select, cn } from "@/components/ui";
import { addJobProductAction, removeJobProductAction } from "@/lib/actions/jobs";
import { money } from "@/lib/format";
import type { JobProduct, Product } from "@/lib/types";

/** Products consumed on a job — adding one also draws down stock. */
export function JobProductsPanel({
  jobId,
  rows,
  products,
}: {
  jobId: number;
  rows: JobProduct[];
  products: Product[];
}) {
  const [adding, setAdding] = useState(false);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    if (!productId) return;
    startTransition(async () => {
      await addJobProductAction(jobId, Number(productId), qty);
      setProductId("");
      setQty(1);
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold tracking-wide text-faint uppercase">Products used</h4>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[12px] text-brand hover:text-fg">
          <Plus className="size-3.5" /> Add
        </button>
      </div>

      <ul className="space-y-2 text-[13px]">
        {rows.map((row) => (
          <li key={row.id} className="group flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-muted">
              {row.name}
              {row.qty > 1 && <span className="text-faint"> × {row.qty}</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="tabular-nums">{money(row.price * row.qty)}</span>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await removeJobProductAction(row.id, jobId);
                    router.refresh();
                  })
                }
                className="opacity-0 transition group-hover:opacity-100"
                aria-label={`Remove ${row.name}`}
              >
                <X className="size-3.5 text-faint hover:text-danger" />
              </button>
            </span>
          </li>
        ))}
        {rows.length === 0 && !adding && <li className="text-faint">None yet.</li>}
      </ul>

      {adding && (
        <div className="mt-3 flex gap-2">
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} className="flex-1">
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.price)}
              </option>
            ))}
          </Select>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-[10px] border border-line bg-raised px-2 text-[13px]"
          />
          <button
            onClick={add}
            disabled={pending || !productId}
            className={cn("rounded-[10px] bg-brand-strong px-3 text-[13px] font-medium text-white", pending && "opacity-60")}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

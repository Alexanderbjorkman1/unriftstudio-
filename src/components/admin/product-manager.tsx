"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Package, Pencil, Plus, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Table, Td, Th, cn } from "@/components/ui";
import { adjustStockAction, deleteProductAction, saveProductAction } from "@/lib/actions/crm";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

const CATEGORIES = ["chemical", "protection", "interior", "accessory", "consumable"];

export function ProductManager({ products }: { products: Product[] }) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const stockValue = products.reduce((sum, p) => sum + p.cost * p.stock, 0);
  const lowStock = products.filter((p) => p.active && p.stock <= p.reorder_at);

  function nudge(product: Product, delta: number) {
    startTransition(async () => {
      await adjustStockAction(product.id, delta);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="px-4 py-3.5">
          <p className="text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">Products</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums">{products.length}</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">Stock value (cost)</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums">{money(stockValue)}</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">Needs reordering</p>
          <p className={cn("mt-1 text-[22px] font-semibold tabular-nums", lowStock.length ? "text-warn" : "")}>
            {lowStock.length}
          </p>
        </Card>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> New product
        </Button>
      </div>

      {editing && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{editing === "new" ? "New product" : `Edit ${editing.name}`}</h2>
            <button onClick={() => setEditing(null)} aria-label="Close" className="text-faint hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
          <form action={saveProductAction.bind(null, editing === "new" ? null : editing.id)} className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" className="sm:col-span-2">
              <Input name="name" required defaultValue={editing === "new" ? "" : editing.name} placeholder="Ceramic Coating 50ml" />
            </Field>
            <Field label="SKU">
              <Input name="sku" defaultValue={editing === "new" ? "" : editing.sku} placeholder="PRT-010" />
            </Field>
            <Field label="Category">
              <Select name="category" defaultValue={editing === "new" ? "chemical" : editing.category}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sale price">
              <Input name="price" type="number" min={0} defaultValue={editing === "new" ? 0 : editing.price} />
            </Field>
            <Field label="Cost">
              <Input name="cost" type="number" min={0} defaultValue={editing === "new" ? 0 : editing.cost} />
            </Field>
            <Field label="Stock">
              <Input name="stock" type="number" min={0} defaultValue={editing === "new" ? 0 : editing.stock} />
            </Field>
            <Field label="Reorder at">
              <Input name="reorder_at" type="number" min={0} defaultValue={editing === "new" ? 0 : editing.reorder_at} />
            </Field>
            <Field label="Unit">
              <Input name="unit" defaultValue={editing === "new" ? "pcs" : editing.unit} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing === "new" ? true : editing.active === 1}
                className="size-4 accent-[#2563eb]"
              />
              Active
            </label>
            <div className="sm:col-span-3">
              <Button type="submit">Save product</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <EmptyState icon={<Package className="size-5" />} title="No products yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Category</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Margin</Th>
                <Th>Stock</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const margin = product.price ? Math.round(((product.price - product.cost) / product.price) * 100) : 0;
                const low = product.stock <= product.reorder_at;
                return (
                  <tr key={product.id} className={cn("transition hover:bg-raised/60", !product.active && "opacity-50")}>
                    <Td className="font-medium">{product.name}</Td>
                    <Td className="font-mono text-[11px] text-faint">{product.sku || "—"}</Td>
                    <Td className="text-muted capitalize">{product.category}</Td>
                    <Td className="text-right text-muted tabular-nums">{money(product.cost)}</Td>
                    <Td className="text-right tabular-nums">{money(product.price)}</Td>
                    <Td className="text-right tabular-nums">{margin}%</Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => nudge(product, -1)}
                          disabled={pending}
                          className="grid size-6 place-items-center rounded-md border border-line text-faint hover:text-fg"
                          aria-label={`Decrease stock of ${product.name}`}
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className={cn("w-14 text-center tabular-nums", low && "text-warn")}>
                          {product.stock} {product.unit}
                        </span>
                        <button
                          onClick={() => nudge(product, 1)}
                          disabled={pending}
                          className="grid size-6 place-items-center rounded-md border border-line text-faint hover:text-fg"
                          aria-label={`Increase stock of ${product.name}`}
                        >
                          <Plus className="size-3" />
                        </button>
                        {low && <Badge tone="amber">Reorder</Badge>}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <span className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(product)}
                          className="grid size-7 place-items-center rounded-lg text-faint hover:bg-raised hover:text-fg"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await deleteProductAction(product.id);
                              router.refresh();
                            })
                          }
                          className="grid size-7 place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
                          aria-label={`Delete ${product.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

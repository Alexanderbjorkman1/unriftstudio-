import { getDb } from "../db";
import type { Product } from "../types";

export function listProducts(onlyActive = false): Product[] {
  return getDb()
    .prepare(`SELECT * FROM products ${onlyActive ? "WHERE active = 1" : ""} ORDER BY category, name`)
    .all() as Product[];
}

export function getProduct(id: number) {
  return getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
}

export type ProductInput = Omit<Product, "id">;

export function createProduct(input: ProductInput) {
  return getDb()
    .prepare(
      `INSERT INTO products (name, sku, category, price, cost, stock, reorder_at, unit, active)
       VALUES (@name, @sku, @category, @price, @cost, @stock, @reorder_at, @unit, @active)`,
    )
    .run(input).lastInsertRowid as number;
}

export function updateProduct(id: number, input: ProductInput) {
  getDb()
    .prepare(
      `UPDATE products SET name = @name, sku = @sku, category = @category, price = @price, cost = @cost,
        stock = @stock, reorder_at = @reorder_at, unit = @unit, active = @active WHERE id = @id`,
    )
    .run({ ...input, id });
}

export function deleteProduct(id: number) {
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function adjustStock(id: number, delta: number) {
  getDb().prepare("UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?").run(delta, id);
}

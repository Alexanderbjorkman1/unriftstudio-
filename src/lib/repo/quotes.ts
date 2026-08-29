import { getDb } from "../db";
import type { LineItem, Quote, QuoteStatus } from "../types";

export interface QuoteRow extends Quote {
  customer_name: string | null;
  customer_email: string | null;
  vehicle_label: string | null;
  total: number;
}

const QUOTE_SELECT = `
  SELECT q.*, c.name AS customer_name, c.email AS customer_email,
         CASE WHEN v.id IS NULL THEN NULL ELSE v.make || ' ' || v.model END AS vehicle_label,
         COALESCE((SELECT SUM(qty * price) FROM quote_items qi WHERE qi.quote_id = q.id), 0) AS total
    FROM quotes q
    LEFT JOIN customers c ON c.id = q.customer_id
    LEFT JOIN vehicles v ON v.id = q.vehicle_id`;

export function listQuotes(status: QuoteStatus | "all" = "all", search = ""): QuoteRow[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (status !== "all") {
    where.push("q.status = @status");
    params.status = status;
  }
  if (search.trim()) {
    where.push("(c.name LIKE @like OR q.quote_number LIKE @like)");
    params.like = `%${search.trim()}%`;
  }
  return getDb()
    .prepare(`${QUOTE_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY q.created_at DESC, q.id DESC`)
    .all(params) as QuoteRow[];
}

export function getQuote(id: number) {
  return getDb().prepare(`${QUOTE_SELECT} WHERE q.id = ?`).get(id) as QuoteRow | undefined;
}

export function quoteItems(quoteId: number): LineItem[] {
  return getDb().prepare("SELECT id, name, qty, price FROM quote_items WHERE quote_id = ? ORDER BY id").all(quoteId) as LineItem[];
}

export function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const row = getDb()
    .prepare("SELECT quote_number FROM quotes WHERE quote_number LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`Q-${year}-%`) as { quote_number: string } | undefined;
  const last = row ? Number(row.quote_number.split("-")[2]) : 100;
  return `Q-${year}-${last + 1}`;
}

export interface QuoteInput {
  customer_id: number | null;
  vehicle_id: number | null;
  status: QuoteStatus;
  valid_until: string;
  notes: string;
  items: Array<{ name: string; qty: number; price: number }>;
}

export function createQuote(input: QuoteInput) {
  const db = getDb();
  const tx = db.transaction((data: QuoteInput) => {
    const number = nextQuoteNumber();
    const id = db
      .prepare(
        `INSERT INTO quotes (quote_number, customer_id, vehicle_id, status, valid_until, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(number, data.customer_id, data.vehicle_id, data.status, data.valid_until, data.notes)
      .lastInsertRowid as number;
    const stmt = db.prepare("INSERT INTO quote_items (quote_id, name, qty, price) VALUES (?, ?, ?, ?)");
    data.items.forEach((it) => stmt.run(id, it.name, it.qty, it.price));
    return { id, number };
  });
  return tx(input);
}

export function updateQuote(id: number, input: QuoteInput) {
  const db = getDb();
  const tx = db.transaction((data: QuoteInput) => {
    db.prepare(
      `UPDATE quotes SET customer_id = ?, vehicle_id = ?, status = ?, valid_until = ?, notes = ? WHERE id = ?`,
    ).run(data.customer_id, data.vehicle_id, data.status, data.valid_until, data.notes, id);
    db.prepare("DELETE FROM quote_items WHERE quote_id = ?").run(id);
    const stmt = db.prepare("INSERT INTO quote_items (quote_id, name, qty, price) VALUES (?, ?, ?, ?)");
    data.items.forEach((it) => stmt.run(id, it.name, it.qty, it.price));
  });
  tx(input);
}

export function setQuoteStatus(id: number, status: QuoteStatus) {
  getDb().prepare("UPDATE quotes SET status = ? WHERE id = ?").run(status, id);
}

export function deleteQuote(id: number) {
  getDb().prepare("DELETE FROM quotes WHERE id = ?").run(id);
}

import { getDb } from "../db";
import { dayKey, addDays } from "../dates";
import type { Invoice, InvoiceStatus, LineItem } from "../types";

export interface InvoiceRow extends Invoice {
  customer_name: string | null;
  customer_email: string | null;
  job_number: string | null;
  subtotal: number;
  total: number;
}

const INVOICE_SELECT = `
  SELECT i.*, c.name AS customer_name, c.email AS customer_email, j.job_number,
         COALESCE((SELECT SUM(qty * price) FROM invoice_items it WHERE it.invoice_id = i.id), 0) AS subtotal,
         ROUND(COALESCE((SELECT SUM(qty * price) FROM invoice_items it WHERE it.invoice_id = i.id), 0)
               * (1 + i.vat_rate / 100.0)) AS total
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN jobs j ON j.id = i.job_id`;

export function listInvoices(status: InvoiceStatus | "all" = "all", search = ""): InvoiceRow[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (status !== "all") {
    where.push("i.status = @status");
    params.status = status;
  }
  if (search.trim()) {
    where.push("(c.name LIKE @like OR i.invoice_number LIKE @like)");
    params.like = `%${search.trim()}%`;
  }
  return getDb()
    .prepare(`${INVOICE_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY i.issued_at DESC, i.id DESC`)
    .all(params) as InvoiceRow[];
}

export function getInvoice(id: number) {
  return getDb().prepare(`${INVOICE_SELECT} WHERE i.id = ?`).get(id) as InvoiceRow | undefined;
}

export function invoiceItems(invoiceId: number): LineItem[] {
  return getDb().prepare("SELECT id, name, qty, price FROM invoice_items WHERE invoice_id = ? ORDER BY id").all(invoiceId) as LineItem[];
}

export function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const row = getDb()
    .prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`${year}-%`) as { invoice_number: string } | undefined;
  const last = row ? Number(row.invoice_number.split("-")[1]) : 500;
  return `${year}-${last + 1}`;
}

export interface InvoiceInput {
  customer_id: number | null;
  job_id: number | null;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string;
  vat_rate: number;
  payment_method: string;
  notes: string;
  items: Array<{ name: string; qty: number; price: number }>;
}

export function createInvoice(input: InvoiceInput) {
  const db = getDb();
  const tx = db.transaction((data: InvoiceInput) => {
    const number = nextInvoiceNumber();
    const id = db
      .prepare(
        `INSERT INTO invoices (invoice_number, customer_id, job_id, status, issued_at, due_at, vat_rate, payment_method, notes)
         VALUES (@invoice_number, @customer_id, @job_id, @status, @issued_at, @due_at, @vat_rate, @payment_method, @notes)`,
      )
      .run({
        invoice_number: number,
        customer_id: data.customer_id,
        job_id: data.job_id,
        status: data.status,
        issued_at: data.issued_at,
        due_at: data.due_at,
        vat_rate: data.vat_rate,
        payment_method: data.payment_method,
        notes: data.notes,
      }).lastInsertRowid as number;
    const stmt = db.prepare("INSERT INTO invoice_items (invoice_id, name, qty, price) VALUES (?, ?, ?, ?)");
    data.items.forEach((it) => stmt.run(id, it.name, it.qty, it.price));
    return { id, number };
  });
  return tx(input);
}

export function updateInvoice(id: number, input: InvoiceInput) {
  const db = getDb();
  const tx = db.transaction((data: InvoiceInput) => {
    db.prepare(
      `UPDATE invoices SET customer_id = @customer_id, job_id = @job_id, status = @status, issued_at = @issued_at,
        due_at = @due_at, vat_rate = @vat_rate, payment_method = @payment_method, notes = @notes WHERE id = @id`,
    ).run({
      id,
      customer_id: data.customer_id,
      job_id: data.job_id,
      status: data.status,
      issued_at: data.issued_at,
      due_at: data.due_at,
      vat_rate: data.vat_rate,
      payment_method: data.payment_method,
      notes: data.notes,
    });
    db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
    const stmt = db.prepare("INSERT INTO invoice_items (invoice_id, name, qty, price) VALUES (?, ?, ?, ?)");
    data.items.forEach((it) => stmt.run(id, it.name, it.qty, it.price));
  });
  tx(input);
}

export function setInvoiceStatus(id: number, status: InvoiceStatus, method = "") {
  if (status === "paid") {
    getDb()
      .prepare("UPDATE invoices SET status = 'paid', paid_at = ?, payment_method = ? WHERE id = ?")
      .run(dayKey(new Date()), method || "Card", id);
  } else {
    getDb().prepare("UPDATE invoices SET status = ?, paid_at = NULL WHERE id = ?").run(status, id);
  }
}

export function deleteInvoice(id: number) {
  getDb().prepare("DELETE FROM invoices WHERE id = ?").run(id);
}

/** Turns a completed job into a draft invoice with its services and products as lines. */
export function invoiceFromJob(jobId: number, vatRate: number) {
  const db = getDb();
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as
    | { id: number; customer_id: number | null; price: number }
    | undefined;
  if (!job) return null;
  const existing = db.prepare("SELECT id FROM invoices WHERE job_id = ?").get(jobId) as { id: number } | undefined;
  if (existing) return existing.id;

  const services = db.prepare("SELECT name, price FROM job_services WHERE job_id = ?").all(jobId) as Array<{ name: string; price: number }>;
  const products = db.prepare("SELECT name, price, qty FROM job_products WHERE job_id = ?").all(jobId) as Array<{ name: string; price: number; qty: number }>;
  const today = new Date();
  const { id } = createInvoice({
    customer_id: job.customer_id,
    job_id: job.id,
    status: "draft",
    issued_at: dayKey(today),
    due_at: dayKey(addDays(today, 14)),
    vat_rate: vatRate,
    payment_method: "",
    notes: "",
    items: [
      ...services.map((s) => ({ name: s.name, qty: 1, price: s.price })),
      ...products.map((p) => ({ name: p.name, qty: p.qty, price: p.price })),
    ],
  });
  return id;
}

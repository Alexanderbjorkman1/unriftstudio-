import { getDb } from "../db";
import { toLocalStamp } from "../dates";

export interface Payment {
  id: number;
  job_id: number | null;
  invoice_id: number | null;
  kind: "deposit" | "invoice";
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  provider: string;
  provider_ref: string | null;
  created_at: string;
  paid_at: string | null;
}

export function recordPending(input: {
  jobId?: number | null;
  invoiceId?: number | null;
  kind: "deposit" | "invoice";
  amount: number;
  currency: string;
  providerRef: string;
}) {
  return getDb()
    .prepare(
      `INSERT INTO payments (job_id, invoice_id, kind, amount, currency, status, provider_ref)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      input.jobId ?? null,
      input.invoiceId ?? null,
      input.kind,
      input.amount,
      input.currency,
      input.providerRef,
    ).lastInsertRowid as number;
}

/**
 * Marks a checkout session paid. Returns the row only the first time, so a
 * webhook delivered twice does not trigger side effects twice.
 */
export function markPaid(providerRef: string): Payment | null {
  const db = getDb();
  const changes = db
    .prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE provider_ref = ? AND status <> 'paid'")
    .run(toLocalStamp(new Date()), providerRef).changes;

  if (!changes) return null;
  return db.prepare("SELECT * FROM payments WHERE provider_ref = ?").get(providerRef) as Payment;
}

export function paymentsForJob(jobId: number): Payment[] {
  return getDb().prepare("SELECT * FROM payments WHERE job_id = ? ORDER BY id").all(jobId) as Payment[];
}

export function paidDepositTotal(jobId: number) {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE job_id = ? AND status = 'paid'")
    .get(jobId) as { total: number };
  return row.total;
}

import { getDb } from "../db";
import type { MessageStatus, OutboxMessage } from "../types";

export interface MessageRow extends OutboxMessage {
  customer_name: string | null;
  job_number: string | null;
}

const SELECT = `
  SELECT m.*, c.name AS customer_name, j.job_number
    FROM messages m
    LEFT JOIN customers c ON c.id = m.customer_id
    LEFT JOIN jobs j ON j.id = m.job_id`;

export function listMessages(status: MessageStatus | "all" = "all", limit = 100): MessageRow[] {
  const where = status === "all" ? "" : "WHERE m.status = @status";
  return getDb()
    .prepare(`${SELECT} ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT ${Number(limit)}`)
    .all(status === "all" ? {} : { status }) as MessageRow[];
}

export function messageCounts() {
  const rows = getDb()
    .prepare("SELECT status, COUNT(*) AS n FROM messages GROUP BY status")
    .all() as Array<{ status: MessageStatus; n: number }>;
  const counts: Record<string, number> = { queued: 0, sent: 0, failed: 0, skipped: 0, all: 0 };
  for (const row of rows) {
    counts[row.status] = row.n;
    counts.all += row.n;
  }
  return counts;
}

export function getMessage(id: number) {
  return getDb().prepare(`${SELECT} WHERE m.id = ?`).get(id) as MessageRow | undefined;
}

/** Puts a failed or skipped message back in the queue for another attempt. */
export function retryMessage(id: number) {
  getDb()
    .prepare("UPDATE messages SET status = 'queued', attempts = 0, error = '' WHERE id = ?")
    .run(id);
}

export function retryAllFailed() {
  return getDb()
    .prepare("UPDATE messages SET status = 'queued', attempts = 0, error = '' WHERE status IN ('failed','skipped')")
    .run().changes;
}

export function deleteMessage(id: number) {
  getDb().prepare("DELETE FROM messages WHERE id = ?").run(id);
}

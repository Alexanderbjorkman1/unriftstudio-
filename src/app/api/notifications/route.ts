import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { money } from "@/lib/format";
import { lowStockProducts } from "@/lib/repo/stats";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ notifications: [] }, { status: 401 });

  const db = getDb();
  const today = dayKey(new Date());
  const notifications: Array<{ id: string; title: string; body: string; href: string; tone: string }> = [];

  const overdue = db
    .prepare(
      `SELECT i.id, i.invoice_number, c.name AS customer,
              COALESCE((SELECT SUM(qty * price) FROM invoice_items it WHERE it.invoice_id = i.id), 0) AS subtotal
         FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
        WHERE i.status = 'overdue' OR (i.status = 'sent' AND i.due_at < ?)
        ORDER BY i.due_at LIMIT 5`,
    )
    .all(today) as Array<{ id: number; invoice_number: string; customer: string | null; subtotal: number }>;
  overdue.forEach((inv) =>
    notifications.push({
      id: `inv-${inv.id}`,
      title: `Invoice #${inv.invoice_number} is overdue`,
      body: `${inv.customer ?? "Customer"} · ${money(inv.subtotal)}`,
      href: `/invoices/${inv.id}`,
      tone: "danger",
    }),
  );

  const unassigned = db
    .prepare(
      `SELECT id, job_number FROM jobs
        WHERE assigned_to IS NULL AND status IN ('booked','confirmed') AND substr(scheduled_at, 1, 10) >= ?
        ORDER BY scheduled_at LIMIT 5`,
    )
    .all(today) as Array<{ id: number; job_number: string }>;
  unassigned.forEach((job) =>
    notifications.push({
      id: `job-${job.id}`,
      title: `${job.job_number} has no technician`,
      body: "Assign someone before the job starts.",
      href: `/jobs/${job.id}`,
      tone: "warn",
    }),
  );

  const newOnline = db
    .prepare(
      `SELECT id, job_number FROM jobs WHERE source = 'online' AND status = 'booked' AND substr(scheduled_at, 1, 10) >= ?
        ORDER BY created_at DESC LIMIT 3`,
    )
    .all(today) as Array<{ id: number; job_number: string }>;
  newOnline.forEach((job) =>
    notifications.push({
      id: `online-${job.id}`,
      title: `Online booking ${job.job_number}`,
      body: "Booked from the website — confirm it.",
      href: `/jobs/${job.id}`,
      tone: "brand",
    }),
  );

  lowStockProducts()
    .slice(0, 3)
    .forEach((p) =>
      notifications.push({
        id: `stock-${p.id}`,
        title: `${p.name} is running low`,
        body: `${p.stock} ${p.unit} left (reorder at ${p.reorder_at}).`,
        href: "/products",
        tone: "warn",
      }),
    );

  return NextResponse.json({ notifications });
}

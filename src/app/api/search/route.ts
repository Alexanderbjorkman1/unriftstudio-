import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { stampDay } from "@/lib/dates";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });
  const like = `%${q}%`;
  const db = getDb();

  const customers = db
    .prepare("SELECT id, name, email, phone FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? LIMIT 5")
    .all(like, like, like) as Array<{ id: number; name: string; email: string; phone: string }>;
  const vehicles = db
    .prepare(
      `SELECT v.id, v.make, v.model, v.plate, c.name AS owner FROM vehicles v
        LEFT JOIN customers c ON c.id = v.customer_id
        WHERE v.make LIKE ? OR v.model LIKE ? OR v.plate LIKE ? LIMIT 5`,
    )
    .all(like, like, like) as Array<{ id: number; make: string; model: string; plate: string; owner: string | null }>;
  const jobs = db
    .prepare(
      `SELECT j.id, j.job_number, j.scheduled_at, j.status, c.name AS customer FROM jobs j
        LEFT JOIN customers c ON c.id = j.customer_id
        WHERE j.job_number LIKE ? OR c.name LIKE ?
        ORDER BY j.scheduled_at DESC LIMIT 5`,
    )
    .all(like, like) as Array<{ id: number; job_number: string; scheduled_at: string; status: string; customer: string | null }>;
  const invoices = db
    .prepare(
      `SELECT i.id, i.invoice_number, i.status, c.name AS customer,
              COALESCE((SELECT SUM(qty * price) FROM invoice_items it WHERE it.invoice_id = i.id), 0) AS subtotal
         FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
        WHERE i.invoice_number LIKE ? OR c.name LIKE ? LIMIT 5`,
    )
    .all(like, like) as Array<{ id: number; invoice_number: string; status: string; customer: string | null; subtotal: number }>;

  return NextResponse.json({
    results: [
      ...customers.map((c) => ({ type: "customer", label: c.name, sub: c.email || c.phone, href: `/customers/${c.id}` })),
      ...jobs.map((j) => ({
        type: "job",
        label: `${j.job_number} · ${j.customer ?? "Walk-in"}`,
        sub: `${stampDay(j.scheduled_at)} · ${j.status.replace("_", " ")}`,
        href: `/jobs/${j.id}`,
      })),
      ...vehicles.map((v) => ({
        type: "vehicle",
        label: `${v.make} ${v.model}`,
        sub: [v.plate, v.owner].filter(Boolean).join(" · "),
        href: `/vehicles/${v.id}`,
      })),
      ...invoices.map((i) => ({
        type: "invoice",
        label: `#${i.invoice_number} · ${i.customer ?? ""}`,
        sub: `${money(i.subtotal)} · ${i.status}`,
        href: `/invoices/${i.id}`,
      })),
    ],
  });
}

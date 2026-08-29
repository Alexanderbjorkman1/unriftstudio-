import { getDb } from "../db";
import { addDays, dayKey, DAY_SHORT, startOfWeek, toLocalStamp } from "../dates";

export interface DashboardStats {
  jobsToday: number;
  jobsYesterday: number;
  revenueToday: number;
  revenueYesterday: number;
  pendingPayments: number;
  pendingInvoiceCount: number;
  newCustomers: number;
  newCustomersPrev: number;
}

function dayBounds(date: Date) {
  return { from: `${dayKey(date)}T00:00`, to: `${dayKey(date)}T23:59` };
}

export function dashboardStats(): DashboardStats {
  const db = getDb();
  const today = new Date();
  const yesterday = addDays(today, -1);
  const t = dayBounds(today);
  const y = dayBounds(yesterday);

  const countJobs = db.prepare(
    "SELECT COUNT(*) AS n FROM jobs WHERE scheduled_at BETWEEN ? AND ? AND status <> 'cancelled'",
  );
  const sumRevenue = db.prepare(
    "SELECT COALESCE(SUM(price), 0) AS total FROM jobs WHERE status = 'completed' AND scheduled_at BETWEEN ? AND ?",
  );
  const pending = db
    .prepare(
      `SELECT COUNT(*) AS n,
              COALESCE(SUM(ROUND((SELECT COALESCE(SUM(qty * price), 0) FROM invoice_items it WHERE it.invoice_id = i.id)
                  * (1 + i.vat_rate / 100.0))), 0) AS total
         FROM invoices i WHERE i.status IN ('sent','overdue')`,
    )
    .get() as { n: number; total: number };
  const newCustomers = db.prepare("SELECT COUNT(*) AS n FROM customers WHERE created_at >= ?");

  return {
    jobsToday: (countJobs.get(t.from, t.to) as { n: number }).n,
    jobsYesterday: (countJobs.get(y.from, y.to) as { n: number }).n,
    revenueToday: (sumRevenue.get(t.from, t.to) as { total: number }).total,
    revenueYesterday: (sumRevenue.get(y.from, y.to) as { total: number }).total,
    pendingPayments: pending.total,
    pendingInvoiceCount: pending.n,
    newCustomers: (newCustomers.get(toLocalStamp(addDays(today, -30))) as { n: number }).n,
    newCustomersPrev: (newCustomers.get(toLocalStamp(addDays(today, -60))) as { n: number }).n -
      (newCustomers.get(toLocalStamp(addDays(today, -30))) as { n: number }).n,
  };
}

export interface Point {
  label: string;
  value: number;
  key: string;
}

/** Completed revenue per day for the current week (Mon-Sun). */
export function revenueThisWeek(): Point[] {
  const db = getDb();
  const monday = startOfWeek(new Date());
  const stmt = db.prepare(
    "SELECT COALESCE(SUM(price), 0) AS total FROM jobs WHERE status = 'completed' AND scheduled_at BETWEEN ? AND ?",
  );
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const key = dayKey(d);
    const total = (stmt.get(`${key}T00:00`, `${key}T23:59`) as { total: number }).total;
    return { label: DAY_SHORT[d.getDay()], value: total, key };
  });
}

export function revenueSeries(days: number): Point[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT COALESCE(SUM(price), 0) AS total FROM jobs WHERE status = 'completed' AND scheduled_at BETWEEN ? AND ?",
  );
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today, -(days - 1 - i));
    const key = dayKey(d);
    const total = (stmt.get(`${key}T00:00`, `${key}T23:59`) as { total: number }).total;
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: total, key };
  });
}

export function revenueByMonth(months: number): Point[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT substr(scheduled_at, 1, 7) AS ym, COALESCE(SUM(price), 0) AS total
         FROM jobs WHERE status = 'completed' GROUP BY ym ORDER BY ym`,
    )
    .all() as Array<{ ym: string; total: number }>;
  const map = new Map(rows.map((r) => [r.ym, r.total]));
  const today = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: d.toLocaleString("en-GB", { month: "short" }), value: map.get(ym) ?? 0, key: ym };
  });
}

export function revenueByService(from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT js.name, COUNT(*) AS jobs, COALESCE(SUM(js.price), 0) AS revenue
         FROM job_services js
         JOIN jobs j ON j.id = js.job_id
        WHERE j.status = 'completed' AND j.scheduled_at BETWEEN ? AND ?
        GROUP BY js.name ORDER BY revenue DESC`,
    )
    .all(from, to) as Array<{ name: string; jobs: number; revenue: number }>;
}

export function topCustomers(limit = 5) {
  return getDb()
    .prepare(
      `SELECT c.id, c.name, COUNT(j.id) AS jobs, COALESCE(SUM(j.price), 0) AS revenue
         FROM customers c JOIN jobs j ON j.customer_id = c.id AND j.status = 'completed'
        GROUP BY c.id ORDER BY revenue DESC LIMIT ?`,
    )
    .all(limit) as Array<{ id: number; name: string; jobs: number; revenue: number }>;
}

export function rangeSummary(from: string, to: string) {
  const db = getDb();
  const jobs = db
    .prepare(
      `SELECT COUNT(*) AS jobs, COALESCE(SUM(price), 0) AS revenue, COALESCE(AVG(price), 0) AS avg_ticket,
              COALESCE(SUM(duration_min), 0) AS minutes
         FROM jobs WHERE status = 'completed' AND scheduled_at BETWEEN ? AND ?`,
    )
    .get(from, to) as { jobs: number; revenue: number; avg_ticket: number; minutes: number };
  const cancelled = db
    .prepare("SELECT COUNT(*) AS n FROM jobs WHERE status = 'cancelled' AND scheduled_at BETWEEN ? AND ?")
    .get(from, to) as { n: number };
  const online = db
    .prepare("SELECT COUNT(*) AS n FROM jobs WHERE source = 'online' AND scheduled_at BETWEEN ? AND ?")
    .get(from, to) as { n: number };
  const repeat = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT customer_id FROM jobs WHERE status = 'completed' AND scheduled_at BETWEEN ? AND ?
         GROUP BY customer_id HAVING COUNT(*) > 1)`,
    )
    .get(from, to) as { n: number };
  return { ...jobs, cancelled: cancelled.n, online: online.n, repeatCustomers: repeat.n };
}

export function lowStockProducts() {
  return getDb()
    .prepare("SELECT * FROM products WHERE active = 1 AND stock <= reorder_at ORDER BY stock")
    .all() as Array<{ id: number; name: string; stock: number; reorder_at: number; unit: string }>;
}

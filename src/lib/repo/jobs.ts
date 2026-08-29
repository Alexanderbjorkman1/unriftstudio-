import { getDb } from "../db";
import { toLocalStamp } from "../dates";
import type {
  ChecklistItem, Job, JobNote, JobPhoto, JobProduct, JobRow, JobService, JobStatus,
} from "../types";

const JOB_SELECT = `
  SELECT j.*,
         c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
         v.make AS vehicle_make, v.model AS vehicle_model, v.year AS vehicle_year,
         v.plate AS vehicle_plate, v.mileage AS vehicle_mileage,
         u.name AS technician_name, u.color AS technician_color,
         (SELECT group_concat(name, ', ') FROM job_services js WHERE js.job_id = j.id) AS service_names
    FROM jobs j
    LEFT JOIN customers c ON c.id = j.customer_id
    LEFT JOIN vehicles  v ON v.id = j.vehicle_id
    LEFT JOIN users     u ON u.id = j.assigned_to`;

export interface JobFilter {
  status?: JobStatus | "all" | "active";
  from?: string;
  to?: string;
  technicianId?: number;
  customerId?: number;
  vehicleId?: number;
  search?: string;
  limit?: number;
  order?: "asc" | "desc";
}

export function listJobs(filter: JobFilter = {}): JobRow[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.status && filter.status !== "all") {
    if (filter.status === "active") {
      where.push("j.status IN ('booked','confirmed','in_progress')");
    } else {
      where.push("j.status = @status");
      params.status = filter.status;
    }
  }
  if (filter.from) {
    where.push("j.scheduled_at >= @from");
    params.from = filter.from;
  }
  if (filter.to) {
    where.push("j.scheduled_at <= @to");
    params.to = filter.to;
  }
  if (filter.technicianId) {
    where.push("j.assigned_to = @technicianId");
    params.technicianId = filter.technicianId;
  }
  if (filter.customerId) {
    where.push("j.customer_id = @customerId");
    params.customerId = filter.customerId;
  }
  if (filter.vehicleId) {
    where.push("j.vehicle_id = @vehicleId");
    params.vehicleId = filter.vehicleId;
  }
  if (filter.search?.trim()) {
    where.push("(c.name LIKE @like OR j.job_number LIKE @like OR v.plate LIKE @like OR v.make LIKE @like OR v.model LIKE @like)");
    params.like = `%${filter.search.trim()}%`;
  }

  const sql = `${JOB_SELECT}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY j.scheduled_at ${filter.order === "desc" ? "DESC" : "ASC"}
    ${filter.limit ? `LIMIT ${Number(filter.limit)}` : ""}`;

  return getDb().prepare(sql).all(params) as JobRow[];
}

export function getJob(id: number): JobRow | undefined {
  return getDb().prepare(`${JOB_SELECT} WHERE j.id = ?`).get(id) as JobRow | undefined;
}

export function getJobByNumber(jobNumber: string): JobRow | undefined {
  return getDb().prepare(`${JOB_SELECT} WHERE j.job_number = ?`).get(jobNumber) as JobRow | undefined;
}

export function jobServices(jobId: number): JobService[] {
  return getDb().prepare("SELECT * FROM job_services WHERE job_id = ? ORDER BY id").all(jobId) as JobService[];
}

export function jobProducts(jobId: number): JobProduct[] {
  return getDb().prepare("SELECT * FROM job_products WHERE job_id = ? ORDER BY id").all(jobId) as JobProduct[];
}

export function jobChecklist(jobId: number): ChecklistItem[] {
  return getDb()
    .prepare("SELECT * FROM job_checklist WHERE job_id = ? ORDER BY sort_order, id")
    .all(jobId) as ChecklistItem[];
}

export function jobPhotos(jobId: number): JobPhoto[] {
  return getDb().prepare("SELECT * FROM job_photos WHERE job_id = ? ORDER BY id").all(jobId) as JobPhoto[];
}

export function jobNotes(jobId: number): JobNote[] {
  return getDb()
    .prepare(
      `SELECT n.*, u.name AS author_name FROM job_notes n
        LEFT JOIN users u ON u.id = n.author_id
        WHERE n.job_id = ? ORDER BY n.created_at DESC, n.id DESC`,
    )
    .all(jobId) as JobNote[];
}

export function nextJobNumber() {
  const year = new Date().getFullYear();
  const row = getDb()
    .prepare("SELECT job_number FROM jobs WHERE job_number LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`DF-${year}-%`) as { job_number: string } | undefined;
  const last = row ? Number(row.job_number.split("-")[2]) : 1000;
  return `DF-${year}-${last + 1}`;
}

export interface JobInput {
  customer_id: number | null;
  vehicle_id: number | null;
  assigned_to: number | null;
  status: JobStatus;
  scheduled_at: string;
  duration_min: number;
  location_type: "shop" | "onsite";
  address: string;
  city: string;
  condition: string;
  price: number;
  notes: string;
  source?: string;
  services: Array<{ service_id: number | null; name: string; price: number; duration_min: number }>;
  checklist?: string[];
}

export function createJob(input: JobInput) {
  const db = getDb();
  const tx = db.transaction((data: JobInput) => {
    const jobNumber = nextJobNumber();
    const id = db
      .prepare(
        `INSERT INTO jobs (job_number, customer_id, vehicle_id, assigned_to, status, scheduled_at, duration_min,
            location_type, address, city, condition, price, notes, source)
         VALUES (@job_number, @customer_id, @vehicle_id, @assigned_to, @status, @scheduled_at, @duration_min,
            @location_type, @address, @city, @condition, @price, @notes, @source)`,
      )
      .run({
        job_number: jobNumber,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        assigned_to: data.assigned_to,
        status: data.status,
        scheduled_at: data.scheduled_at,
        duration_min: data.duration_min,
        location_type: data.location_type,
        address: data.address,
        city: data.city,
        condition: data.condition,
        price: data.price,
        notes: data.notes,
        source: data.source ?? "admin",
      }).lastInsertRowid as number;

    const svcStmt = db.prepare(
      "INSERT INTO job_services (job_id, service_id, name, price, duration_min) VALUES (?, ?, ?, ?, ?)",
    );
    data.services.forEach((s) => svcStmt.run(id, s.service_id, s.name, s.price, s.duration_min));

    const checkStmt = db.prepare("INSERT INTO job_checklist (job_id, label, done, sort_order) VALUES (?, ?, 0, ?)");
    (data.checklist ?? []).forEach((label, i) => checkStmt.run(id, label, i));

    return { id, jobNumber };
  });
  return tx(input);
}

export function updateJob(id: number, input: JobInput) {
  const db = getDb();
  const tx = db.transaction((data: JobInput) => {
    db.prepare(
      `UPDATE jobs SET customer_id = @customer_id, vehicle_id = @vehicle_id, assigned_to = @assigned_to,
         status = @status, scheduled_at = @scheduled_at, duration_min = @duration_min,
         location_type = @location_type, address = @address, city = @city, condition = @condition,
         price = @price, notes = @notes WHERE id = @id`,
    ).run({
      id,
      customer_id: data.customer_id,
      vehicle_id: data.vehicle_id,
      assigned_to: data.assigned_to,
      status: data.status,
      scheduled_at: data.scheduled_at,
      duration_min: data.duration_min,
      location_type: data.location_type,
      address: data.address,
      city: data.city,
      condition: data.condition,
      price: data.price,
      notes: data.notes,
    });
    db.prepare("DELETE FROM job_services WHERE job_id = ?").run(id);
    const svcStmt = db.prepare(
      "INSERT INTO job_services (job_id, service_id, name, price, duration_min) VALUES (?, ?, ?, ?, ?)",
    );
    data.services.forEach((s) => svcStmt.run(id, s.service_id, s.name, s.price, s.duration_min));
  });
  tx(input);
}

export function setJobStatus(id: number, status: JobStatus) {
  const db = getDb();
  const now = toLocalStamp(new Date());
  if (status === "in_progress") {
    db.prepare("UPDATE jobs SET status = ?, started_at = COALESCE(started_at, ?) WHERE id = ?").run(status, now, id);
  } else if (status === "completed") {
    db.prepare(
      "UPDATE jobs SET status = ?, started_at = COALESCE(started_at, ?), completed_at = ? WHERE id = ?",
    ).run(status, now, now, id);
  } else {
    db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, id);
  }
}

export function rescheduleJob(id: number, scheduledAt: string, technicianId?: number | null) {
  if (technicianId === undefined) {
    getDb().prepare("UPDATE jobs SET scheduled_at = ? WHERE id = ?").run(scheduledAt, id);
  } else {
    getDb().prepare("UPDATE jobs SET scheduled_at = ?, assigned_to = ? WHERE id = ?").run(scheduledAt, technicianId, id);
  }
}

export function deleteJob(id: number) {
  getDb().prepare("DELETE FROM jobs WHERE id = ?").run(id);
}

export function toggleChecklistItem(itemId: number, done: boolean) {
  getDb().prepare("UPDATE job_checklist SET done = ? WHERE id = ?").run(done ? 1 : 0, itemId);
}

export function addChecklistItem(jobId: number, label: string) {
  const row = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM job_checklist WHERE job_id = ?")
    .get(jobId) as { next: number };
  return getDb()
    .prepare("INSERT INTO job_checklist (job_id, label, done, sort_order) VALUES (?, ?, 0, ?)")
    .run(jobId, label, row.next).lastInsertRowid as number;
}

export function removeChecklistItem(itemId: number) {
  getDb().prepare("DELETE FROM job_checklist WHERE id = ?").run(itemId);
}

export function addJobNote(jobId: number, authorId: number | null, body: string) {
  return getDb()
    .prepare("INSERT INTO job_notes (job_id, author_id, body) VALUES (?, ?, ?)")
    .run(jobId, authorId, body).lastInsertRowid as number;
}

export function addJobPhoto(jobId: number, kind: "before" | "after", filename: string) {
  return getDb()
    .prepare("INSERT INTO job_photos (job_id, kind, filename) VALUES (?, ?, ?)")
    .run(jobId, kind, filename).lastInsertRowid as number;
}

export function deleteJobPhoto(photoId: number) {
  const photo = getDb().prepare("SELECT * FROM job_photos WHERE id = ?").get(photoId) as JobPhoto | undefined;
  getDb().prepare("DELETE FROM job_photos WHERE id = ?").run(photoId);
  return photo;
}

export function addJobProduct(jobId: number, productId: number | null, name: string, price: number, qty: number) {
  return getDb()
    .prepare("INSERT INTO job_products (job_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)")
    .run(jobId, productId, name, price, qty).lastInsertRowid as number;
}

export function removeJobProduct(id: number) {
  getDb().prepare("DELETE FROM job_products WHERE id = ?").run(id);
}

export function jobTotal(job: Job, products: JobProduct[]) {
  return job.price + products.reduce((sum, p) => sum + p.price * p.qty, 0);
}

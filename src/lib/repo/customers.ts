import { getDb } from "../db";
import type { Customer, Vehicle } from "../types";

export interface CustomerRow extends Customer {
  vehicle_count: number;
  job_count: number;
  total_spend: number;
  last_visit: string | null;
}

export function listCustomers(search = ""): CustomerRow[] {
  const like = `%${search.trim()}%`;
  return getDb()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id) AS vehicle_count,
              (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id) AS job_count,
              (SELECT COALESCE(SUM(price), 0) FROM jobs j WHERE j.customer_id = c.id AND j.status = 'completed') AS total_spend,
              (SELECT MAX(scheduled_at) FROM jobs j WHERE j.customer_id = c.id AND j.status = 'completed') AS last_visit
         FROM customers c
        WHERE (@search = '' OR c.name LIKE @like OR c.email LIKE @like OR c.phone LIKE @like OR c.city LIKE @like)
        ORDER BY c.name`,
    )
    .all({ search: search.trim(), like }) as CustomerRow[];
}

export function getCustomer(id: number) {
  return getDb().prepare("SELECT * FROM customers WHERE id = ?").get(id) as Customer | undefined;
}

export function customerVehicles(customerId: number): Vehicle[] {
  return getDb()
    .prepare("SELECT * FROM vehicles WHERE customer_id = ? ORDER BY make, model")
    .all(customerId) as Vehicle[];
}

export type CustomerInput = Omit<Customer, "id" | "created_at">;

export function createCustomer(input: CustomerInput) {
  return getDb()
    .prepare(
      `INSERT INTO customers (name, email, phone, address, postal_code, city, company, notes)
       VALUES (@name, @email, @phone, @address, @postal_code, @city, @company, @notes)`,
    )
    .run(input).lastInsertRowid as number;
}

export function updateCustomer(id: number, input: CustomerInput) {
  getDb()
    .prepare(
      `UPDATE customers SET name = @name, email = @email, phone = @phone, address = @address,
        postal_code = @postal_code, city = @city, company = @company, notes = @notes WHERE id = @id`,
    )
    .run({ ...input, id });
}

export function deleteCustomer(id: number) {
  getDb().prepare("DELETE FROM customers WHERE id = ?").run(id);
}

/** Finds an existing customer by email or phone, otherwise creates one. */
export function upsertCustomerByContact(input: CustomerInput) {
  const db = getDb();
  const existing = db
    .prepare(
      "SELECT * FROM customers WHERE (email <> '' AND lower(email) = lower(?)) OR (phone <> '' AND phone = ?) LIMIT 1",
    )
    .get(input.email, input.phone) as Customer | undefined;
  if (existing) {
    db.prepare(
      `UPDATE customers SET name = ?, phone = COALESCE(NULLIF(?, ''), phone),
        address = COALESCE(NULLIF(?, ''), address), postal_code = COALESCE(NULLIF(?, ''), postal_code),
        city = COALESCE(NULLIF(?, ''), city) WHERE id = ?`,
    ).run(input.name, input.phone, input.address, input.postal_code, input.city, existing.id);
    return existing.id;
  }
  return createCustomer(input);
}

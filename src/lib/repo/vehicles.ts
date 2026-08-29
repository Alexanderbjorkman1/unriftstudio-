import { getDb } from "../db";
import type { Vehicle } from "../types";

export interface VehicleRow extends Vehicle {
  customer_name: string | null;
  job_count: number;
  last_service: string | null;
  total_spend: number;
}

export function listVehicles(search = ""): VehicleRow[] {
  const like = `%${search.trim()}%`;
  return getDb()
    .prepare(
      `SELECT v.*, c.name AS customer_name,
              (SELECT COUNT(*) FROM jobs j WHERE j.vehicle_id = v.id) AS job_count,
              (SELECT MAX(scheduled_at) FROM jobs j WHERE j.vehicle_id = v.id AND j.status = 'completed') AS last_service,
              (SELECT COALESCE(SUM(price), 0) FROM jobs j WHERE j.vehicle_id = v.id AND j.status = 'completed') AS total_spend
         FROM vehicles v
         LEFT JOIN customers c ON c.id = v.customer_id
        WHERE (@search = '' OR v.make LIKE @like OR v.model LIKE @like OR v.plate LIKE @like OR c.name LIKE @like)
        ORDER BY v.make, v.model`,
    )
    .all({ search: search.trim(), like }) as VehicleRow[];
}

export function getVehicle(id: number) {
  return getDb().prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as Vehicle | undefined;
}

export type VehicleInput = Omit<Vehicle, "id" | "created_at">;

export function createVehicle(input: VehicleInput) {
  return getDb()
    .prepare(
      `INSERT INTO vehicles (customer_id, make, model, year, plate, color, size, mileage, notes)
       VALUES (@customer_id, @make, @model, @year, @plate, @color, @size, @mileage, @notes)`,
    )
    .run(input).lastInsertRowid as number;
}

export function updateVehicle(id: number, input: VehicleInput) {
  getDb()
    .prepare(
      `UPDATE vehicles SET customer_id = @customer_id, make = @make, model = @model, year = @year,
        plate = @plate, color = @color, size = @size, mileage = @mileage, notes = @notes WHERE id = @id`,
    )
    .run({ ...input, id });
}

export function deleteVehicle(id: number) {
  getDb().prepare("DELETE FROM vehicles WHERE id = ?").run(id);
}

/** Used by the public booking flow, where the plate is the natural key. */
export function findOrCreateVehicle(input: VehicleInput) {
  const db = getDb();
  if (input.plate.trim()) {
    const found = db
      .prepare("SELECT * FROM vehicles WHERE replace(upper(plate), ' ', '') = replace(upper(?), ' ', '') LIMIT 1")
      .get(input.plate) as Vehicle | undefined;
    if (found) {
      db.prepare("UPDATE vehicles SET customer_id = COALESCE(customer_id, ?), mileage = COALESCE(?, mileage) WHERE id = ?")
        .run(input.customer_id, input.mileage, found.id);
      return found.id;
    }
  }
  return createVehicle(input);
}

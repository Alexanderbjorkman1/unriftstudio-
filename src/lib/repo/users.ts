import { getDb } from "../db";
import { hashPassword } from "../password";
import type { User } from "../types";

export function listUsers(includeInactive = true): User[] {
  return getDb()
    .prepare(
      `SELECT * FROM users ${includeInactive ? "" : "WHERE active = 1"} ORDER BY role = 'owner' DESC, name`,
    )
    .all() as User[];
}

export function listTechnicians(): User[] {
  return getDb().prepare("SELECT * FROM users WHERE active = 1 ORDER BY name").all() as User[];
}

export function getUser(id: number): User | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function getUserByEmail(email: string) {
  return getDb().prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email) as
    | (User & { password_hash: string })
    | undefined;
}

export interface UserInput {
  name: string;
  email: string;
  phone: string;
  role: "owner" | "technician";
  color: string;
  hourly_rate: number;
  active: number;
  password?: string;
}

export function createUser(input: UserInput) {
  return getDb()
    .prepare(
      `INSERT INTO users (name, email, phone, role, password_hash, color, hourly_rate, active)
       VALUES (@name, @email, @phone, @role, @password_hash, @color, @hourly_rate, @active)`,
    )
    .run({ ...input, password_hash: hashPassword(input.password || "demo1234") }).lastInsertRowid as number;
}

export function updateUser(id: number, input: UserInput) {
  const db = getDb();
  db.prepare(
    `UPDATE users SET name = @name, email = @email, phone = @phone, role = @role,
       color = @color, hourly_rate = @hourly_rate, active = @active WHERE id = @id`,
  ).run({ ...input, id });
  if (input.password) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(input.password), id);
  }
}

export function deleteUser(id: number) {
  getDb().prepare("UPDATE users SET active = 0 WHERE id = ?").run(id);
}

/** Jobs / hours / revenue per technician for a date range. */
export function technicianStats(from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.color,
              COUNT(j.id) AS jobs,
              COALESCE(SUM(j.duration_min), 0) AS minutes,
              COALESCE(SUM(CASE WHEN j.status = 'completed' THEN j.price ELSE 0 END), 0) AS revenue
         FROM users u
         LEFT JOIN jobs j ON j.assigned_to = u.id AND j.scheduled_at >= ? AND j.scheduled_at <= ?
                         AND j.status <> 'cancelled'
        WHERE u.active = 1
        GROUP BY u.id
        ORDER BY revenue DESC`,
    )
    .all(from, to) as Array<{ id: number; name: string; color: string; jobs: number; minutes: number; revenue: number }>;
}

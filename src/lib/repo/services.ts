import { getDb } from "../db";
import type { Service } from "../types";

export function listServices(onlyActive = false): Service[] {
  return getDb()
    .prepare(`SELECT * FROM services ${onlyActive ? "WHERE active = 1" : ""} ORDER BY sort_order, id`)
    .all() as Service[];
}

export function getService(id: number) {
  return getDb().prepare("SELECT * FROM services WHERE id = ?").get(id) as Service | undefined;
}

export function getServiceBySlug(slug: string) {
  return getDb().prepare("SELECT * FROM services WHERE slug = ?").get(slug) as Service | undefined;
}

export function checklistFor(service: Service): string[] {
  try {
    const parsed = JSON.parse(service.checklist);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export interface ServiceInput {
  name: string;
  slug: string;
  description: string;
  base_price: number;
  duration_min: number;
  category: string;
  checklist: string[];
  active: number;
  sort_order: number;
}

export function createService(input: ServiceInput) {
  return getDb()
    .prepare(
      `INSERT INTO services (name, slug, description, base_price, duration_min, category, image, checklist, active, sort_order)
       VALUES (@name, @slug, @description, @base_price, @duration_min, @category, '', @checklist, @active, @sort_order)`,
    )
    .run({ ...input, checklist: JSON.stringify(input.checklist) }).lastInsertRowid as number;
}

export function updateService(id: number, input: ServiceInput) {
  getDb()
    .prepare(
      `UPDATE services SET name = @name, slug = @slug, description = @description, base_price = @base_price,
         duration_min = @duration_min, category = @category, checklist = @checklist, active = @active,
         sort_order = @sort_order WHERE id = @id`,
    )
    .run({ ...input, checklist: JSON.stringify(input.checklist), id });
}

export function deleteService(id: number) {
  getDb().prepare("UPDATE services SET active = 0 WHERE id = ?").run(id);
}

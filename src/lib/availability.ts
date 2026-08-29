import { getDb } from "./db";
import { addMinutes, dayKey, minutesFromMidnight, minutesToTime, parseStamp } from "./dates";
import { getSettings } from "./repo/settings";
import { computePrice } from "./pricing";
import type { BusinessSettings, VehicleCondition, VehicleSize } from "./types";

export interface Slot {
  time: string;
  available: boolean;
}

interface Booking {
  start: number;
  end: number;
  assigned_to: number | null;
}

function bookingsOn(day: string): Booking[] {
  const rows = getDb()
    .prepare(
      `SELECT scheduled_at, duration_min, assigned_to FROM jobs
        WHERE substr(scheduled_at, 1, 10) = ? AND status <> 'cancelled'`,
    )
    .all(day) as Array<{ scheduled_at: string; duration_min: number; assigned_to: number | null }>;
  return rows.map((r) => {
    const start = minutesFromMidnight(r.scheduled_at.replace(" ", "T").split("T")[1].slice(0, 5));
    return { start, end: start + r.duration_min, assigned_to: r.assigned_to };
  });
}

function capacityOn(day: string) {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) AS n FROM users WHERE active = 1").get() as { n: number }).n;
  const off = (db.prepare("SELECT COUNT(*) AS n FROM time_off WHERE day = ?").get(day) as { n: number }).n;
  return Math.max(0, total - off);
}

export function isOpenOn(date: Date, settings: BusinessSettings) {
  return settings.open_days.includes(date.getDay());
}

/** Slot grid for one day, with each slot marked bookable or not. */
export function slotsForDay(day: string, durationMin: number, settings = getSettings()): Slot[] {
  const date = parseStamp(day);
  if (!isOpenOn(date, settings)) return [];

  const open = minutesFromMidnight(settings.open_from);
  const close = minutesFromMidnight(settings.open_to);
  const step = settings.slot_minutes;
  const capacity = capacityOn(day);
  const booked = bookingsOn(day);
  const earliest = new Date(Date.now() + settings.lead_time_hours * 3600_000);

  const slots: Slot[] = [];
  for (let start = open; start + durationMin <= close; start += step) {
    const end = start + durationMin;
    const overlapping = booked.filter((b) => b.start < end && start < b.end).length;
    const slotDate = parseStamp(`${day}T${minutesToTime(start)}`);
    slots.push({
      time: minutesToTime(start),
      available: overlapping < capacity && slotDate.getTime() >= earliest.getTime(),
    });
  }
  return slots;
}

/** Which technician is free for a slot — used when a booking comes in from the website. */
export function pickTechnician(day: string, time: string, durationMin: number): number | null {
  const db = getDb();
  const techs = db.prepare("SELECT id FROM users WHERE active = 1 ORDER BY role = 'owner', id").all() as Array<{ id: number }>;
  const start = minutesFromMidnight(time);
  const end = start + durationMin;
  const booked = bookingsOn(day);
  const free = techs.find((t) => !booked.some((b) => b.assigned_to === t.id && b.start < end && start < b.end));
  return free?.id ?? null;
}

export interface DayAvailability {
  day: string;
  open: boolean;
  slots: number;
}

export function availabilityForRange(fromDay: string, days: number, durationMin: number): DayAvailability[] {
  const settings = getSettings();
  const start = parseStamp(fromDay);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    if (!isOpenOn(d, settings)) return { day: key, open: false, slots: 0 };
    const slots = slotsForDay(key, durationMin, settings).filter((s) => s.available).length;
    return { day: key, open: true, slots };
  });
}

/** Server-side wrapper that feeds the stored settings into the shared rules. */
export function priceFor(
  basePrice: number,
  durationMin: number,
  size: VehicleSize,
  condition: VehicleCondition,
  onsite: boolean,
  settings = getSettings(),
) {
  return computePrice(basePrice, durationMin, size, condition, onsite, settings);
}

export function endStamp(day: string, time: string, durationMin: number) {
  const end = addMinutes(parseStamp(`${day}T${time}`), durationMin);
  return end;
}

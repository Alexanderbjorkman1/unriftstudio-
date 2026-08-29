/**
 * The shop runs in one timezone, so datetimes are stored as naive local
 * strings ("YYYY-MM-DDTHH:MM"). These helpers keep that format consistent.
 */

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeKey(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalStamp(d: Date) {
  return `${dayKey(d)}T${timeKey(d)}`;
}

/** Accepts "YYYY-MM-DDTHH:MM", "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD". */
export function parseStamp(value: string): Date {
  const [datePart, timePart = "00:00"] = value.replace(" ", "T").split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh || 0, mm || 0, 0, 0);
}

export function stampDay(value: string) {
  return value.replace(" ", "T").split("T")[0];
}

export function stampTime(value: string) {
  const t = value.replace(" ", "T").split("T")[1] ?? "00:00";
  return t.slice(0, 5);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, minutes: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Week starts on Monday. */
export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date) {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** 6x7 grid of days covering the month, padded with neighbouring days. */
export function monthGrid(date: Date) {
  const first = startOfWeek(startOfMonth(date));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

export function minutesFromMidnight(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number) {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const d = typeof value === "string" ? parseStamp(value) : value;
  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

export function formatDay(value: string | Date) {
  const d = typeof value === "string" ? parseStamp(value) : value;
  const today = new Date();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, addDays(today, 1))) return "Tomorrow";
  if (isSameDay(d, addDays(today, -1))) return "Yesterday";
  return formatDate(d, { day: "numeric", month: "short" });
}

export function relativeDayTime(value: string) {
  return `${formatDay(value)}, ${stampTime(value)}`;
}

export function isPast(value: string) {
  return parseStamp(value).getTime() < Date.now();
}

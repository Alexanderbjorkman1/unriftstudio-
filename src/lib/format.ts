import type { JobStatus, InvoiceStatus, QuoteStatus, VehicleCondition } from "./types";

export const CURRENCY = "kr";

/** Prices are stored as whole units (kronor) — no cents in this business. */
export function money(amount: number, currency = CURRENCY) {
  return `${new Intl.NumberFormat("sv-SE").format(Math.round(amount))} ${currency}`;
}

export function moneyShort(amount: number) {
  if (Math.abs(amount) >= 1000) {
    const k = amount / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return String(Math.round(amount));
}

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const JOB_STATUS_TONE: Record<JobStatus, "blue" | "green" | "amber" | "violet" | "slate"> = {
  booked: "blue",
  confirmed: "violet",
  in_progress: "amber",
  completed: "green",
  cancelled: "slate",
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, "blue" | "green" | "amber" | "red" | "slate"> = {
  draft: "slate",
  sent: "blue",
  paid: "green",
  overdue: "red",
};

export const QUOTE_STATUS_TONE: Record<QuoteStatus, "blue" | "green" | "amber" | "red" | "slate"> = {
  draft: "slate",
  sent: "blue",
  accepted: "green",
  declined: "red",
  expired: "amber",
};

export const CONDITION_LABEL: Record<VehicleCondition, string> = {
  normal: "Normal",
  dirty: "Dirty",
  very_dirty: "Very dirty",
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

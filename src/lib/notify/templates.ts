import { duration, money } from "../format";
import { formatDate, stampTime } from "../dates";
import type { BusinessSettings, JobRow } from "../types";

export interface Composed {
  subject: string;
  body: string;
}

function whenLine(job: JobRow) {
  return `${formatDate(job.scheduled_at, { weekday: "long", day: "numeric", month: "long" })} at ${stampTime(job.scheduled_at)}`;
}

function whereLine(job: JobRow, settings: BusinessSettings) {
  return job.location_type === "onsite"
    ? `We come to you: ${job.address}${job.city ? `, ${job.city}` : ""}`
    : `At our shop: ${settings.address}, ${settings.postal_code} ${settings.city}`;
}

function vehicle(job: JobRow) {
  return [job.vehicle_make, job.vehicle_model, job.vehicle_year].filter(Boolean).join(" ");
}

function signOff(settings: BusinessSettings) {
  return `${settings.business_name}\n${settings.phone}${settings.email ? `\n${settings.email}` : ""}`;
}

/* ------------------------------------------------------------------- email */

export function bookingConfirmationEmail(job: JobRow, settings: BusinessSettings): Composed {
  return {
    subject: `Booking confirmed — ${job.job_number}`,
    body: [
      `Hi ${job.customer_name ?? "there"},`,
      ``,
      `Your booking is confirmed. Here are the details:`,
      ``,
      `  Service:   ${job.service_names ?? "Detailing"}`,
      `  Vehicle:   ${vehicle(job)}${job.vehicle_plate ? ` (${job.vehicle_plate})` : ""}`,
      `  When:      ${whenLine(job)}`,
      `  ${whereLine(job, settings)}`,
      `  Estimated: ${money(job.price, settings.currency)}, about ${duration(job.duration_min)}`,
      ``,
      `Your booking number is ${job.job_number}.`,
      ``,
      `The price is an estimate based on what you told us about the car. If anything`,
      `changes once we see it, we will agree it with you before we start.`,
      ``,
      `Need to move or cancel? Just reply to this email or call ${settings.phone}.`,
      ``,
      `See you soon,`,
      signOff(settings),
    ].join("\n"),
  };
}

export function reminderEmail(job: JobRow, settings: BusinessSettings): Composed {
  return {
    subject: `Tomorrow: ${job.service_names ?? "your detail"} at ${stampTime(job.scheduled_at)}`,
    body: [
      `Hi ${job.customer_name ?? "there"},`,
      ``,
      `A quick reminder about your booking tomorrow.`,
      ``,
      `  Service: ${job.service_names ?? "Detailing"}`,
      `  Vehicle: ${vehicle(job)}`,
      `  When:    ${whenLine(job)}`,
      `  ${whereLine(job, settings)}`,
      ``,
      job.location_type === "onsite"
        ? `Please make sure the car is accessible and there is somewhere to park alongside it.`
        : `Please empty any valuables from the car before you drop it off.`,
      ``,
      `If tomorrow no longer works, call ${settings.phone} and we will find another slot.`,
      ``,
      signOff(settings),
    ].join("\n"),
  };
}

export function jobCompletedEmail(job: JobRow, settings: BusinessSettings, total: number): Composed {
  return {
    subject: `Your ${vehicle(job)} is ready — ${job.job_number}`,
    body: [
      `Hi ${job.customer_name ?? "there"},`,
      ``,
      `We have finished work on your ${vehicle(job)}.`,
      ``,
      `  Service: ${job.service_names ?? "Detailing"}`,
      `  Total:   ${money(total, settings.currency)} including ${settings.vat_rate}% VAT`,
      ``,
      `Your invoice follows separately. Thank you for your business — and if anything`,
      `is not right, tell us and we will put it right.`,
      ``,
      signOff(settings),
    ].join("\n"),
  };
}

export function ownerAlertEmail(job: JobRow, settings: BusinessSettings): Composed {
  return {
    subject: `New online booking — ${job.job_number}`,
    body: [
      `${job.customer_name ?? "Someone"} just booked online.`,
      ``,
      `  Service:  ${job.service_names ?? "Detailing"}`,
      `  Vehicle:  ${vehicle(job)}${job.vehicle_plate ? ` (${job.vehicle_plate})` : ""}`,
      `  When:     ${whenLine(job)}`,
      `  ${whereLine(job, settings)}`,
      `  Value:    ${money(job.price, settings.currency)}`,
      `  Contact:  ${job.customer_phone || "—"} ${job.customer_email || ""}`,
      ``,
      `Assigned to: ${job.technician_name ?? "nobody yet"}`,
    ].join("\n"),
  };
}

/* --------------------------------------------------------------------- sms */

/** Kept under 160 characters where possible so it stays a single segment. */
export function bookingConfirmationSms(job: JobRow, settings: BusinessSettings) {
  return `${settings.business_name}: booking confirmed for ${formatDate(job.scheduled_at, { day: "numeric", month: "short" })} at ${stampTime(job.scheduled_at)}. Ref ${job.job_number}. Questions? ${settings.phone}`;
}

export function reminderSms(job: JobRow, settings: BusinessSettings) {
  return `${settings.business_name}: reminder — we have your ${vehicle(job)} booked tomorrow at ${stampTime(job.scheduled_at)}. Need to change it? ${settings.phone}`;
}

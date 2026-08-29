"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import * as invoices from "@/lib/repo/invoices";
import * as quotes from "@/lib/repo/quotes";
import { createJob } from "@/lib/repo/jobs";
import { getSettings } from "@/lib/repo/settings";
import { dayKey, addDays } from "@/lib/dates";
import type { InvoiceStatus, QuoteStatus } from "@/lib/types";

function lineItems(form: FormData) {
  const names = form.getAll("item_name").map(String);
  const qtys = form.getAll("item_qty").map(Number);
  const prices = form.getAll("item_price").map(Number);
  return names
    .map((name, i) => ({ name: name.trim(), qty: qtys[i] || 1, price: prices[i] || 0 }))
    .filter((item) => item.name.length > 0);
}

const optionalNum = (form: FormData, key: string) => {
  const raw = form.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
};

/* --------------------------------------------------------------- Invoices */

function invoiceInput(form: FormData) {
  return {
    customer_id: optionalNum(form, "customer_id"),
    job_id: optionalNum(form, "job_id"),
    status: (String(form.get("status") ?? "draft") as InvoiceStatus),
    issued_at: String(form.get("issued_at") ?? dayKey(new Date())),
    due_at: String(form.get("due_at") ?? dayKey(addDays(new Date(), 14))),
    vat_rate: Number(form.get("vat_rate") ?? getSettings().vat_rate),
    payment_method: String(form.get("payment_method") ?? ""),
    notes: String(form.get("notes") ?? ""),
    items: lineItems(form),
  };
}

export async function saveInvoiceAction(id: number | null, form: FormData) {
  await requireRole("owner");
  if (id) {
    invoices.updateInvoice(id, invoiceInput(form));
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/invoices");
    redirect(`/invoices/${id}`);
  }
  const created = invoices.createInvoice(invoiceInput(form));
  revalidatePath("/invoices");
  redirect(`/invoices/${created.id}`);
}

export async function setInvoiceStatusAction(id: number, status: InvoiceStatus, method = "") {
  await requireRole("owner");
  invoices.setInvoiceStatus(id, status, method);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteInvoiceAction(id: number) {
  await requireRole("owner");
  invoices.deleteInvoice(id);
  revalidatePath("/invoices");
  redirect("/invoices");
}

/* ----------------------------------------------------------------- Quotes */

function quoteInput(form: FormData) {
  return {
    customer_id: optionalNum(form, "customer_id"),
    vehicle_id: optionalNum(form, "vehicle_id"),
    status: (String(form.get("status") ?? "draft") as QuoteStatus),
    valid_until: String(form.get("valid_until") ?? dayKey(addDays(new Date(), 30))),
    notes: String(form.get("notes") ?? ""),
    items: lineItems(form),
  };
}

export async function saveQuoteAction(id: number | null, form: FormData) {
  await requireRole("owner");
  if (id) {
    quotes.updateQuote(id, quoteInput(form));
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    redirect(`/quotes/${id}`);
  }
  const created = quotes.createQuote(quoteInput(form));
  revalidatePath("/quotes");
  redirect(`/quotes/${created.id}`);
}

export async function setQuoteStatusAction(id: number, status: QuoteStatus) {
  await requireRole("owner");
  quotes.setQuoteStatus(id, status);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
}

export async function deleteQuoteAction(id: number) {
  await requireRole("owner");
  quotes.deleteQuote(id);
  revalidatePath("/quotes");
  redirect("/quotes");
}

/** Accepting a quote turns it straight into a booked job. */
export async function convertQuoteToJobAction(id: number) {
  await requireRole("owner");
  const quote = quotes.getQuote(id);
  if (!quote) return;
  const items = quotes.quoteItems(id);
  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  const scheduled = addDays(new Date(), 3);
  scheduled.setHours(9, 0, 0, 0);

  const { id: jobId } = createJob({
    customer_id: quote.customer_id,
    vehicle_id: quote.vehicle_id,
    assigned_to: null,
    status: "booked",
    scheduled_at: `${dayKey(scheduled)}T09:00`,
    duration_min: Math.max(60, items.length * 120),
    location_type: "shop",
    address: "",
    city: "",
    condition: "normal",
    price: total,
    notes: `Created from quote ${quote.quote_number}`,
    services: items.map((item) => ({ service_id: null, name: item.name, price: item.price * item.qty, duration_min: 120 })),
    checklist: [],
  });

  quotes.setQuoteStatus(id, "accepted");
  revalidatePath("/quotes");
  revalidatePath("/jobs");
  redirect(`/jobs/${jobId}`);
}

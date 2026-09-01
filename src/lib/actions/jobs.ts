"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, requireRole } from "@/lib/auth";
import * as jobsRepo from "@/lib/repo/jobs";
import { checklistFor, getService } from "@/lib/repo/services";
import { getSettings } from "@/lib/repo/settings";
import { invoiceFromJob } from "@/lib/repo/invoices";
import { adjustStock, getProduct } from "@/lib/repo/products";
import { dropPendingReminders, queueJobCompleted, queueReminder } from "@/lib/notify/outbox";
import { flushSoon } from "@/lib/notify/scheduler";
import type { JobStatus } from "@/lib/types";

function numberOrNull(value: FormDataEntryValue | null) {
  const n = Number(value);
  return value === null || value === "" || Number.isNaN(n) ? null : n;
}

function parseJobForm(formData: FormData) {
  const serviceIds = formData.getAll("service_ids").map(Number).filter(Boolean);
  const services = serviceIds
    .map((id) => getService(id))
    .filter((s) => s !== undefined)
    .map((s) => ({ service_id: s.id, name: s.name, price: s.base_price, duration_min: s.duration_min }));

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "09:00");
  const durationInput = numberOrNull(formData.get("duration_min"));
  const priceInput = numberOrNull(formData.get("price"));

  return {
    customer_id: numberOrNull(formData.get("customer_id")),
    vehicle_id: numberOrNull(formData.get("vehicle_id")),
    assigned_to: numberOrNull(formData.get("assigned_to")),
    status: (String(formData.get("status") ?? "booked") as JobStatus),
    scheduled_at: `${date}T${time}`,
    duration_min: durationInput ?? (services.reduce((sum, s) => sum + s.duration_min, 0) || 120),
    location_type: (String(formData.get("location_type") ?? "shop") as "shop" | "onsite"),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    condition: String(formData.get("condition") ?? "normal"),
    price: priceInput ?? services.reduce((sum, s) => sum + s.price, 0),
    notes: String(formData.get("notes") ?? ""),
    services,
  };
}

export async function createJobAction(formData: FormData) {
  await requireRole("owner");
  const input = parseJobForm(formData);
  const checklist = input.services.flatMap((s) => (s.service_id ? checklistFor(getService(s.service_id)!) : []));
  const { id } = jobsRepo.createJob({ ...input, checklist });
  revalidatePath("/jobs");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/jobs/${id}`);
}

export async function updateJobAction(id: number, formData: FormData) {
  await requireRole("owner");
  jobsRepo.updateJob(id, parseJobForm(formData));
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/jobs");
  revalidatePath("/calendar");
  redirect(`/jobs/${id}`);
}

export async function setJobStatusAction(id: number, status: JobStatus) {
  const user = await currentUser();
  if (!user) return;
  jobsRepo.setJobStatus(id, status);

  // Completing a job drafts its invoice so nothing gets billed late.
  if (status === "completed") {
    invoiceFromJob(id, getSettings().vat_rate);
    const products = jobsRepo.jobProducts(id);
    const job = jobsRepo.getJob(id);
    if (job) queueJobCompleted(id, jobsRepo.jobTotal(job, products));
  }

  // A finished or cancelled job must not still nudge the customer tomorrow.
  if (status === "completed" || status === "cancelled") {
    dropPendingReminders(id);
  }
  flushSoon();
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/jobs");
  revalidatePath("/app");
  revalidatePath(`/app/jobs/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
}

export async function deleteJobAction(id: number) {
  await requireRole("owner");
  jobsRepo.deleteJob(id);
  revalidatePath("/jobs");
  revalidatePath("/calendar");
  redirect("/jobs");
}

export async function rescheduleJobAction(id: number, scheduledAt: string, technicianId?: number | null) {
  await requireRole("owner");
  jobsRepo.rescheduleJob(id, scheduledAt, technicianId);
  // The old reminder points at the old time — replace it.
  dropPendingReminders(id);
  queueReminder(id);
  revalidatePath("/calendar");
  revalidatePath("/jobs");
}

export async function toggleChecklistAction(itemId: number, done: boolean, jobId: number) {
  const user = await currentUser();
  if (!user) return;
  jobsRepo.toggleChecklistItem(itemId, done);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/app/jobs/${jobId}`);
}

export async function addChecklistItemAction(jobId: number, label: string) {
  const user = await currentUser();
  if (!user || !label.trim()) return;
  jobsRepo.addChecklistItem(jobId, label.trim());
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/app/jobs/${jobId}`);
}

export async function removeChecklistItemAction(itemId: number, jobId: number) {
  await requireRole("owner");
  jobsRepo.removeChecklistItem(itemId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function addNoteAction(jobId: number, body: string) {
  const user = await currentUser();
  if (!user || !body.trim()) return;
  jobsRepo.addJobNote(jobId, user.id, body.trim());
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/app/jobs/${jobId}`);
}

export async function addJobProductAction(jobId: number, productId: number, qty: number) {
  await requireRole("owner");
  const product = getProduct(productId);
  if (!product) return;
  jobsRepo.addJobProduct(jobId, product.id, product.name, product.price, qty);
  adjustStock(product.id, -qty);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/products");
}

export async function removeJobProductAction(rowId: number, jobId: number) {
  await requireRole("owner");
  jobsRepo.removeJobProduct(rowId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function createInvoiceForJobAction(jobId: number) {
  await requireRole("owner");
  const id = invoiceFromJob(jobId, getSettings().vat_rate);
  revalidatePath("/invoices");
  if (id) redirect(`/invoices/${id}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import * as customers from "@/lib/repo/customers";
import * as vehicles from "@/lib/repo/vehicles";
import * as products from "@/lib/repo/products";
import * as users from "@/lib/repo/users";
import * as servicesRepo from "@/lib/repo/services";
import { saveSettings } from "@/lib/repo/settings";
import type { BusinessSettings, VehicleSize } from "@/lib/types";

const str = (form: FormData, key: string, fallback = "") => String(form.get(key) ?? fallback);
const num = (form: FormData, key: string, fallback = 0) => {
  const value = Number(form.get(key));
  return Number.isNaN(value) ? fallback : value;
};
const optionalNum = (form: FormData, key: string) => {
  const raw = form.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
};

/* -------------------------------------------------------------- Customers */

function customerInput(form: FormData) {
  return {
    name: str(form, "name"),
    email: str(form, "email"),
    phone: str(form, "phone"),
    address: str(form, "address"),
    postal_code: str(form, "postal_code"),
    city: str(form, "city"),
    company: str(form, "company"),
    notes: str(form, "notes"),
  };
}

export async function createCustomerAction(form: FormData) {
  await requireRole("owner");
  const id = customers.createCustomer(customerInput(form));
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function updateCustomerAction(id: number, form: FormData) {
  await requireRole("owner");
  customers.updateCustomer(id, customerInput(form));
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomerAction(id: number) {
  await requireRole("owner");
  customers.deleteCustomer(id);
  revalidatePath("/customers");
  redirect("/customers");
}

/* --------------------------------------------------------------- Vehicles */

function vehicleInput(form: FormData) {
  return {
    customer_id: optionalNum(form, "customer_id"),
    make: str(form, "make"),
    model: str(form, "model"),
    year: optionalNum(form, "year"),
    plate: str(form, "plate").toUpperCase(),
    color: str(form, "color"),
    size: (str(form, "size", "medium") as VehicleSize),
    mileage: optionalNum(form, "mileage"),
    notes: str(form, "notes"),
  };
}

export async function createVehicleAction(form: FormData) {
  await requireRole("owner");
  const id = vehicles.createVehicle(vehicleInput(form));
  revalidatePath("/vehicles");
  redirect(`/vehicles/${id}`);
}

export async function updateVehicleAction(id: number, form: FormData) {
  await requireRole("owner");
  vehicles.updateVehicle(id, vehicleInput(form));
  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}

export async function deleteVehicleAction(id: number) {
  await requireRole("owner");
  vehicles.deleteVehicle(id);
  revalidatePath("/vehicles");
  redirect("/vehicles");
}

/* --------------------------------------------------------------- Products */

function productInput(form: FormData) {
  return {
    name: str(form, "name"),
    sku: str(form, "sku"),
    category: str(form, "category", "consumable"),
    price: num(form, "price"),
    cost: num(form, "cost"),
    stock: num(form, "stock"),
    reorder_at: num(form, "reorder_at"),
    unit: str(form, "unit", "pcs"),
    active: form.get("active") ? 1 : 0,
  };
}

export async function saveProductAction(id: number | null, form: FormData) {
  await requireRole("owner");
  if (id) products.updateProduct(id, productInput(form));
  else products.createProduct(productInput(form));
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProductAction(id: number) {
  await requireRole("owner");
  products.deleteProduct(id);
  revalidatePath("/products");
}

export async function adjustStockAction(id: number, delta: number) {
  await requireRole("owner");
  products.adjustStock(id, delta);
  revalidatePath("/products");
}

/* -------------------------------------------------------------- Employees */

export async function saveEmployeeAction(id: number | null, form: FormData) {
  await requireRole("owner");
  const input = {
    name: str(form, "name"),
    email: str(form, "email"),
    phone: str(form, "phone"),
    role: (str(form, "role", "technician") as "owner" | "technician"),
    color: str(form, "color", "#3B82F6"),
    hourly_rate: num(form, "hourly_rate"),
    active: form.get("active") ? 1 : 0,
    password: str(form, "password") || undefined,
  };
  if (id) users.updateUser(id, input);
  else users.createUser(input);
  revalidatePath("/employees");
  redirect("/employees");
}

export async function deactivateEmployeeAction(id: number) {
  await requireRole("owner");
  users.deleteUser(id);
  revalidatePath("/employees");
}

/* --------------------------------------------------------------- Services */

export async function saveServiceAction(id: number | null, form: FormData) {
  await requireRole("owner");
  const name = str(form, "name");
  const input = {
    name,
    slug: str(form, "slug") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description: str(form, "description"),
    base_price: num(form, "base_price"),
    duration_min: num(form, "duration_min", 60),
    category: str(form, "category", "detailing"),
    checklist: str(form, "checklist")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    active: form.get("active") ? 1 : 0,
    sort_order: num(form, "sort_order"),
  };
  if (id) servicesRepo.updateService(id, input);
  else servicesRepo.createService(input);
  revalidatePath("/settings");
  revalidatePath("/book");
  revalidatePath("/");
  redirect("/settings?tab=services");
}

export async function deleteServiceAction(id: number) {
  await requireRole("owner");
  servicesRepo.deleteService(id);
  revalidatePath("/settings");
  revalidatePath("/book");
}

/* --------------------------------------------------------------- Settings */

export async function saveSettingsAction(form: FormData) {
  await requireRole("owner");
  const openDays = form.getAll("open_days").map(Number);
  const patch: Partial<BusinessSettings> = {
    business_name: str(form, "business_name"),
    tagline: str(form, "tagline"),
    email: str(form, "email"),
    phone: str(form, "phone"),
    address: str(form, "address"),
    postal_code: str(form, "postal_code"),
    city: str(form, "city"),
    org_number: str(form, "org_number"),
    currency: str(form, "currency", "kr"),
    vat_rate: num(form, "vat_rate", 25),
    open_days: openDays,
    open_from: str(form, "open_from", "08:00"),
    open_to: str(form, "open_to", "18:00"),
    slot_minutes: num(form, "slot_minutes", 30),
    booking_enabled: form.get("booking_enabled") !== null,
    onsite_enabled: form.get("onsite_enabled") !== null,
    onsite_fee: num(form, "onsite_fee"),
    lead_time_hours: num(form, "lead_time_hours", 12),
    max_days_ahead: num(form, "max_days_ahead", 60),
    condition_surcharge: {
      normal: 0,
      dirty: num(form, "surcharge_dirty", 15),
      very_dirty: num(form, "surcharge_very_dirty", 30),
    },
    size_multiplier: {
      small: num(form, "size_small", 0.9),
      medium: num(form, "size_medium", 1),
      large: num(form, "size_large", 1.15),
      xl: num(form, "size_xl", 1.3),
    },
  };
  saveSettings(patch);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/book");
  redirect("/settings?saved=1");
}

export type Role = "owner" | "technician";

export type JobStatus =
  | "booked"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type LocationType = "shop" | "onsite";
export type VehicleCondition = "normal" | "dirty" | "very_dirty";
export type VehicleSize = "small" | "medium" | "large" | "xl";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  color: string;
  hourly_rate: number;
  active: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  company: string;
  notes: string;
  created_at: string;
}

export interface Vehicle {
  id: number;
  customer_id: number | null;
  make: string;
  model: string;
  year: number | null;
  plate: string;
  color: string;
  size: VehicleSize;
  mileage: number | null;
  notes: string;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  duration_min: number;
  category: string;
  image: string;
  checklist: string;
  active: number;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorder_at: number;
  unit: string;
  active: number;
}

export interface Job {
  id: number;
  job_number: string;
  customer_id: number | null;
  vehicle_id: number | null;
  assigned_to: number | null;
  status: JobStatus;
  scheduled_at: string;
  duration_min: number;
  location_type: LocationType;
  address: string;
  city: string;
  condition: VehicleCondition;
  price: number;
  notes: string;
  source: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface JobService {
  id: number;
  job_id: number;
  service_id: number | null;
  name: string;
  price: number;
  duration_min: number;
}

export interface JobProduct {
  id: number;
  job_id: number;
  product_id: number | null;
  name: string;
  price: number;
  qty: number;
}

export interface ChecklistItem {
  id: number;
  job_id: number;
  label: string;
  done: number;
  sort_order: number;
}

export interface JobPhoto {
  id: number;
  job_id: number;
  kind: "before" | "after";
  filename: string;
  created_at: string;
}

export interface JobNote {
  id: number;
  job_id: number;
  author_id: number | null;
  body: string;
  created_at: string;
  author_name?: string | null;
}

/** A job joined with the names it is almost always displayed with. */
export interface JobRow extends Job {
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_plate: string | null;
  vehicle_mileage: number | null;
  technician_name: string | null;
  technician_color: string | null;
  service_names: string | null;
}

export interface Quote {
  id: number;
  quote_number: string;
  customer_id: number | null;
  vehicle_id: number | null;
  status: QuoteStatus;
  valid_until: string;
  notes: string;
  created_at: string;
}

export interface LineItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  job_id: number | null;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string;
  vat_rate: number;
  paid_at: string | null;
  payment_method: string;
  notes: string;
  created_at: string;
}

export interface BusinessSettings {
  business_name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  org_number: string;
  currency: string;
  vat_rate: number;
  open_days: number[];
  open_from: string;
  open_to: string;
  slot_minutes: number;
  booking_enabled: boolean;
  onsite_enabled: boolean;
  onsite_fee: number;
  lead_time_hours: number;
  max_days_ahead: number;
  condition_surcharge: Record<VehicleCondition, number>;
  size_multiplier: Record<VehicleSize, number>;
}

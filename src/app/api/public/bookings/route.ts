import { NextResponse } from "next/server";
import { pickTechnician, slotsForDay } from "@/lib/availability";
import { computePrice } from "@/lib/pricing";
import { getSettings } from "@/lib/repo/settings";
import { checklistFor, getService } from "@/lib/repo/services";
import { upsertCustomerByContact } from "@/lib/repo/customers";
import { findOrCreateVehicle } from "@/lib/repo/vehicles";
import { createJob } from "@/lib/repo/jobs";
import { queueBookingMessages } from "@/lib/notify/outbox";
import { flushSoon } from "@/lib/notify/scheduler";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { VehicleCondition, VehicleSize } from "@/lib/types";

interface BookingPayload {
  serviceId: number;
  make: string;
  model: string;
  year: number | null;
  plate: string;
  size: VehicleSize;
  condition: VehicleCondition;
  mileage: number | null;
  locationType: "shop" | "onsite";
  address: string;
  postalCode: string;
  city: string;
  day: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  // A real customer books once or twice. This stops a script filling the diary.
  const limit = rateLimit(clientKey(request, "book"), 5, 60 * 60_000);
  if (!limit.allowed) {
    return tooManyRequests(
      limit.retryAfterSeconds,
      "That's a lot of bookings from one place. Give us a call and we'll sort it out directly.",
    );
  }

  const settings = getSettings();
  if (!settings.booking_enabled) return invalid("Online booking is currently closed.");

  let payload: BookingPayload;
  try {
    payload = (await request.json()) as BookingPayload;
  } catch {
    return invalid("Malformed request.");
  }

  const service = getService(Number(payload.serviceId));
  if (!service || !service.active) return invalid("Pick a service to continue.");
  if (!payload.name?.trim()) return invalid("We need a name for the booking.");
  if (!payload.email?.trim() && !payload.phone?.trim()) return invalid("Add an email or a phone number.");
  if (!payload.make?.trim() || !payload.model?.trim()) return invalid("Tell us which car we're working on.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.day ?? "")) return invalid("Pick a date.");
  if (!/^\d{2}:\d{2}$/.test(payload.time ?? "")) return invalid("Pick a time.");

  const onsite = payload.locationType === "onsite";
  if (onsite && !settings.onsite_enabled) return invalid("Mobile detailing is not available right now.");
  if (onsite && !payload.address?.trim()) return invalid("We need an address to come to you.");

  const size = payload.size ?? "medium";
  const condition = payload.condition ?? "normal";
  const price = computePrice(service.base_price, service.duration_min, size, condition, onsite, settings);

  // Re-check the slot server side; the wizard may have been open a while.
  const slot = slotsForDay(payload.day, price.durationMin, settings).find((s) => s.time === payload.time);
  if (!slot?.available) {
    return NextResponse.json({ error: "That time was just taken. Please pick another slot." }, { status: 409 });
  }

  const customerId = upsertCustomerByContact({
    name: payload.name.trim(),
    email: payload.email?.trim() ?? "",
    phone: payload.phone?.trim() ?? "",
    address: payload.address?.trim() ?? "",
    postal_code: payload.postalCode?.trim() ?? "",
    city: payload.city?.trim() ?? "",
    company: "",
    notes: "",
  });

  const vehicleId = findOrCreateVehicle({
    customer_id: customerId,
    make: payload.make.trim(),
    model: payload.model.trim(),
    year: payload.year ?? null,
    plate: (payload.plate ?? "").trim().toUpperCase(),
    color: "",
    size,
    mileage: payload.mileage ?? null,
    notes: "",
  });

  const { id, jobNumber } = createJob({
    customer_id: customerId,
    vehicle_id: vehicleId,
    assigned_to: pickTechnician(payload.day, payload.time, price.durationMin),
    status: "booked",
    scheduled_at: `${payload.day}T${payload.time}`,
    duration_min: price.durationMin,
    location_type: onsite ? "onsite" : "shop",
    address: onsite ? payload.address.trim() : "",
    city: onsite ? (payload.city?.trim() ?? "") : "",
    condition,
    price: price.total,
    notes: payload.notes?.trim() ?? "",
    source: "online",
    services: [{ service_id: service.id, name: service.name, price: price.total, duration_min: price.durationMin }],
    checklist: checklistFor(service),
  });

  // Confirmation to the customer, alert to the owner, reminder scheduled for
  // the day before. Queued inside the request, delivered by the outbox ticker,
  // so a slow mail provider never holds up the booking.
  queueBookingMessages(id);
  flushSoon();

  return NextResponse.json({ id, jobNumber, price: price.total });
}

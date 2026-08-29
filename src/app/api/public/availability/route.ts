import { NextResponse } from "next/server";
import { availabilityForRange, slotsForDay } from "@/lib/availability";
import { getSettings } from "@/lib/repo/settings";
import { getService } from "@/lib/repo/services";
import { computePrice } from "@/lib/pricing";
import { dayKey } from "@/lib/dates";
import type { VehicleCondition, VehicleSize } from "@/lib/types";

/**
 * Public availability. Given a service and vehicle details it returns the
 * bookable slots for a day plus a per-day summary for the date picker.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = getSettings();
  if (!settings.booking_enabled) {
    return NextResponse.json({ error: "Online booking is currently closed." }, { status: 403 });
  }

  const service = getService(Number(url.searchParams.get("service")));
  if (!service) return NextResponse.json({ error: "Unknown service" }, { status: 400 });

  const size = (url.searchParams.get("size") ?? "medium") as VehicleSize;
  const condition = (url.searchParams.get("condition") ?? "normal") as VehicleCondition;
  const onsite = url.searchParams.get("onsite") === "1";
  const price = computePrice(service.base_price, service.duration_min, size, condition, onsite, settings);

  const day = url.searchParams.get("day") ?? dayKey(new Date());
  const rangeFrom = url.searchParams.get("from") ?? dayKey(new Date());
  const rangeDays = Math.min(62, Math.max(1, Number(url.searchParams.get("days") ?? 42)));

  return NextResponse.json({
    price,
    slots: slotsForDay(day, price.durationMin, settings),
    days: availabilityForRange(rangeFrom, rangeDays, price.durationMin),
    maxDaysAhead: settings.max_days_ahead,
  });
}

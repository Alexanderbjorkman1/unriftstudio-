"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Field, Input, Select, Textarea, Button, cn } from "@/components/ui";
import { money } from "@/lib/format";
import { duration as fmtDuration } from "@/lib/format";
import type { BusinessSettings, Customer, JobRow, Service, User, Vehicle, VehicleCondition } from "@/lib/types";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  customers: Customer[];
  vehicles: Vehicle[];
  services: Service[];
  technicians: User[];
  settings: BusinessSettings;
  job?: JobRow;
  jobServiceIds?: number[];
  defaultDate?: string;
  defaultTime?: string;
}

export function JobForm({
  action,
  customers,
  vehicles,
  services,
  technicians,
  settings,
  job,
  jobServiceIds = [],
  defaultDate,
  defaultTime,
}: Props) {
  const [customerId, setCustomerId] = useState(String(job?.customer_id ?? ""));
  const [vehicleId, setVehicleId] = useState(String(job?.vehicle_id ?? ""));
  const [selected, setSelected] = useState<number[]>(jobServiceIds);
  const [condition, setCondition] = useState<VehicleCondition>(job?.condition ?? "normal");
  const [locationType, setLocationType] = useState(job?.location_type ?? "shop");
  const [priceOverride, setPriceOverride] = useState<string>(job ? String(job.price) : "");
  const [durationOverride, setDurationOverride] = useState<string>(job ? String(job.duration_min) : "");

  const customerVehicles = customerId
    ? vehicles.filter((v) => String(v.customer_id) === customerId)
    : vehicles;

  const vehicle = vehicles.find((v) => String(v.id) === vehicleId);

  const estimate = useMemo(() => {
    const chosen = services.filter((s) => selected.includes(s.id));
    const base = chosen.reduce((sum, s) => sum + s.base_price, 0);
    const minutes = chosen.reduce((sum, s) => sum + s.duration_min, 0);
    const sizeMultiplier = settings.size_multiplier[vehicle?.size ?? "medium"] ?? 1;
    const sized = Math.round(base * sizeMultiplier);
    const surcharge = Math.round((sized * (settings.condition_surcharge[condition] ?? 0)) / 100);
    const travel = locationType === "onsite" ? settings.onsite_fee : 0;
    const extra = condition === "very_dirty" ? 60 : condition === "dirty" ? 30 : 0;
    return { total: sized + surcharge + travel, minutes: minutes + extra, base, sized, surcharge, travel };
  }, [selected, services, settings, vehicle, condition, locationType]);

  const price = priceOverride === "" ? estimate.total : Number(priceOverride);
  const minutes = durationOverride === "" ? estimate.minutes : Number(durationOverride);

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Customer &amp; vehicle</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer">
              <Select
                name="customer_id"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setVehicleId("");
                }}
              >
                <option value="">Walk-in / no account</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select name="vehicle_id" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Select a vehicle</option>
                {customerVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} {v.plate ? `· ${v.plate}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="mt-2 text-[12px] text-faint">
            Missing someone?{" "}
            <Link href="/customers/new" className="text-brand hover:text-fg">
              Add a customer
            </Link>{" "}
            or{" "}
            <Link href="/vehicles/new" className="text-brand hover:text-fg">
              add a vehicle
            </Link>
            .
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Services</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const checked = selected.includes(service.id);
              return (
                <label
                  key={service.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition",
                    checked ? "border-brand/60 bg-brand/10" : "border-line bg-raised hover:border-line/80",
                  )}
                >
                  <input
                    type="checkbox"
                    name="service_ids"
                    value={service.id}
                    checked={checked}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, service.id] : prev.filter((id) => id !== service.id),
                      )
                    }
                    className="mt-0.5 size-4 accent-[#2563eb]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{service.name}</span>
                    <span className="block text-[12px] text-muted">
                      {money(service.base_price)} · {fmtDuration(service.duration_min)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Schedule</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input type="date" name="date" required defaultValue={job ? job.scheduled_at.slice(0, 10) : defaultDate} />
            </Field>
            <Field label="Start time">
              <Input
                type="time"
                name="time"
                required
                step={900}
                defaultValue={job ? job.scheduled_at.slice(11, 16) : (defaultTime ?? "09:00")}
              />
            </Field>
            <Field label="Duration (min)">
              <Input
                type="number"
                name="duration_min"
                min={15}
                step={15}
                value={minutes}
                onChange={(e) => setDurationOverride(e.target.value)}
              />
            </Field>
            <Field label="Technician">
              <Select name="assigned_to" defaultValue={String(job?.assigned_to ?? "")}>
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={job?.status ?? "booked"}>
                {["booked", "confirmed", "in_progress", "completed", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle condition">
              <Select name="condition" value={condition} onChange={(e) => setCondition(e.target.value as VehicleCondition)}>
                <option value="normal">Normal</option>
                <option value="dirty">Dirty (+{settings.condition_surcharge.dirty}%)</option>
                <option value="very_dirty">Very dirty (+{settings.condition_surcharge.very_dirty}%)</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Location</h2>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["shop", "onsite"] as const).map((value) => (
              <label
                key={value}
                className={cn(
                  "cursor-pointer rounded-[10px] border p-3 text-center text-[13px] font-medium transition",
                  locationType === value ? "border-brand/60 bg-brand/10 text-fg" : "border-line bg-raised text-muted",
                )}
              >
                <input
                  type="radio"
                  name="location_type"
                  value={value}
                  checked={locationType === value}
                  onChange={() => setLocationType(value)}
                  className="sr-only"
                />
                {value === "shop" ? "At our shop" : `At customer (+${money(settings.onsite_fee)})`}
              </label>
            ))}
          </div>
          {locationType === "onsite" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address">
                <Input name="address" defaultValue={job?.address ?? ""} placeholder="Kungsgatan 12" />
              </Field>
              <Field label="City">
                <Input name="city" defaultValue={job?.city ?? ""} placeholder="Stockholm" />
              </Field>
            </div>
          )}
          <Field label="Internal notes" className="mt-4">
            <Textarea name="notes" defaultValue={job?.notes ?? ""} placeholder="Anything the technician should know…" />
          </Field>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-24 p-5">
          <h2 className="text-[15px] font-semibold">Price</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted">Services</dt>
              <dd className="tabular-nums">{money(estimate.base)}</dd>
            </div>
            {estimate.sized !== estimate.base && (
              <div className="flex justify-between">
                <dt className="text-muted">Vehicle size</dt>
                <dd className="tabular-nums">+{money(estimate.sized - estimate.base)}</dd>
              </div>
            )}
            {estimate.surcharge > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Condition</dt>
                <dd className="tabular-nums">+{money(estimate.surcharge)}</dd>
              </div>
            )}
            {estimate.travel > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Travel</dt>
                <dd className="tabular-nums">+{money(estimate.travel)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(price)}</dd>
            </div>
          </dl>

          <Field label="Override price" className="mt-4">
            <Input
              type="number"
              name="price"
              min={0}
              step={5}
              value={price}
              onChange={(e) => setPriceOverride(e.target.value)}
            />
          </Field>
          <p className="mt-2 text-[12px] text-faint">Estimated time {fmtDuration(minutes)}.</p>

          <div className="mt-5 flex gap-2">
            <Button type="submit" className="flex-1" size="lg">
              {job ? "Save changes" : "Create job"}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CalendarDays, Car, CheckCircle2, Loader2, MapPin, Timer,
} from "lucide-react";
import { CarSilhouette } from "@/components/car-art";
import { cn } from "@/components/ui";
import { CAR_MAKES, suggestSize } from "@/lib/car-catalogue";
import { computePrice } from "@/lib/pricing";
import { duration as fmtDuration, money } from "@/lib/format";
import { addDays, dayKey, formatDate, MONTH_NAMES } from "@/lib/dates";
import type { BusinessSettings, Service, VehicleCondition, VehicleSize } from "@/lib/types";

interface Slot {
  time: string;
  available: boolean;
}

interface DayAvailability {
  day: string;
  open: boolean;
  slots: number;
}

const STEPS = ["Choose service", "Your vehicle", "Location & date", "Summary"];
const CONDITIONS: Array<{ value: VehicleCondition; label: string; hint: string }> = [
  { value: "normal", label: "Normal", hint: "Regularly washed" },
  { value: "dirty", label: "Dirty", hint: "A few weeks of grime" },
  { value: "very_dirty", label: "Very dirty", hint: "Pets, sand, heavy stains" },
];
const SIZES: Array<{ value: VehicleSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large / estate" },
  { value: "xl", label: "SUV / van" },
];

export function BookingWizard({
  services,
  settings,
  initialServiceId,
}: {
  services: Service[];
  settings: BusinessSettings;
  initialServiceId?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState<number | null>(initialServiceId ?? null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [chosenSize, setChosenSize] = useState<VehicleSize | null>(null);
  const [condition, setCondition] = useState<VehicleCondition>("normal");

  const [onsite, setOnsite] = useState(false);
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState(settings.city);
  const [day, setDayState] = useState(dayKey(addDays(new Date(), 1)));
  const [time, setTime] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [availability, setAvailability] = useState<{ key: string; slots: Slot[]; days: DayAvailability[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const service = services.find((s) => s.id === serviceId);
  const modelName = model === "__other" ? customModel : model;

  // Suggested from the model until the customer picks a size class themselves.
  const size = chosenSize ?? (make && modelName ? suggestSize(make, modelName) : "medium");

  // Picking another day always invalidates the slot chosen for the old one.
  const setDay = useCallback((next: string) => {
    setDayState(next);
    setTime("");
  }, []);

  const price = useMemo(() => {
    if (!service) return null;
    return computePrice(service.base_price, service.duration_min, size, condition, onsite, settings);
  }, [service, size, condition, onsite, settings]);

  // One key per distinct availability question; the cached answer is only used
  // while it still matches, which is also what tells us a request is in flight.
  const monthStart = dayKey(monthCursor);
  const availabilityKey = service
    ? [service.id, size, condition, onsite ? "1" : "0", day, monthStart].join("|")
    : "";
  const fresh = availability?.key === availabilityKey;
  const slots = fresh ? availability.slots : [];
  const days = availability?.days ?? [];
  const loadingSlots = Boolean(service) && !fresh;

  useEffect(() => {
    if (step !== 2 || !service || fresh) return;
    let cancelled = false;

    const params = new URLSearchParams({
      service: String(service.id),
      size,
      condition,
      onsite: onsite ? "1" : "0",
      day,
      from: monthStart,
      days: "42",
    });

    fetch(`/api/public/availability?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const dayList: DayAvailability[] = data.days ?? [];
        setAvailability({ key: availabilityKey, slots: data.slots ?? [], days: dayList });

        // The default date may land on a closed or fully booked day — move the
        // customer to the first day they can actually book instead.
        const today = dayKey(new Date());
        const picked = dayList.find((d) => d.day === day);
        if (dayList.length && (!picked || !picked.open || picked.slots === 0)) {
          const firstOpen = dayList.find((d) => d.open && d.slots > 0 && d.day >= today);
          if (firstOpen && firstOpen.day !== day) setDay(firstOpen.day);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability({ key: availabilityKey, slots: [], days: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [step, service, fresh, availabilityKey, size, condition, onsite, day, monthStart, setDay]);

  const canContinue = [
    Boolean(service),
    Boolean(make && modelName),
    Boolean(day && time && (!onsite || address.trim())),
    Boolean(name.trim() && (email.trim() || phone.trim())),
  ][step];

  async function submit() {
    if (!service) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          make,
          model: modelName,
          year: year ? Number(year) : null,
          plate,
          size,
          condition,
          mileage: null,
          locationType: onsite ? "onsite" : "shop",
          address,
          postalCode,
          city,
          day,
          time,
          name,
          email,
          phone,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      // A deposit sends the customer to the card page; otherwise straight to
      // the confirmation. The booking is already saved in both cases.
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      router.push(`/booking/${data.jobNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[16px] border border-line bg-panel p-5 sm:p-6">
          {step === 0 && <ServiceStep services={services} serviceId={serviceId} onPick={setServiceId} />}

          {step === 1 && (
            <VehicleStep
              make={make}
              setMake={(value) => {
                setMake(value);
                setModel("");
              }}
              model={model}
              setModel={setModel}
              customModel={customModel}
              setCustomModel={setCustomModel}
              year={year}
              setYear={setYear}
              plate={plate}
              setPlate={setPlate}
              size={size}
              setSize={setChosenSize}
              condition={condition}
              setCondition={setCondition}
              settings={settings}
            />
          )}

          {step === 2 && (
            <ScheduleStep
              settings={settings}
              onsite={onsite}
              setOnsite={setOnsite}
              address={address}
              setAddress={setAddress}
              postalCode={postalCode}
              setPostalCode={setPostalCode}
              city={city}
              setCity={setCity}
              day={day}
              setDay={setDay}
              time={time}
              setTime={setTime}
              slots={slots}
              days={days}
              loading={loadingSlots}
              monthCursor={monthCursor}
              setMonthCursor={setMonthCursor}
            />
          )}

          {step === 3 && service && price && (
            <SummaryStep
              service={service}
              make={make}
              model={modelName}
              year={year}
              plate={plate}
              size={size}
              condition={condition}
              onsite={onsite}
              address={address}
              city={city}
              day={day}
              time={time}
              price={price}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              notes={notes}
              setNotes={setNotes}
              error={error}
            />
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-raised px-4 py-2.5 text-[13px] font-medium text-muted transition hover:text-fg disabled:opacity-40"
            >
              <ArrowLeft className="size-4" /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue}
                className="inline-flex items-center gap-2 rounded-[10px] bg-brand-strong px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-brand disabled:opacity-40"
              >
                Next <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canContinue || submitting}
                className="inline-flex items-center gap-2 rounded-[10px] bg-success px-5 py-2.5 text-[13px] font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-40"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Book now
              </button>
            )}
          </div>
        </div>

        <SummaryRail
          service={service}
          price={price}
          make={make}
          model={modelName}
          day={day}
          time={time}
          onsite={onsite}
          settings={settings}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Stepper */

function Stepper({ step, onJump }: { step: number; onJump: (index: number) => void }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {STEPS.map((label, i) => {
        const state = i === step ? "current" : i < step ? "done" : "todo";
        return (
          <li key={label}>
            <button
              onClick={() => onJump(i)}
              disabled={i >= step}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition",
                state === "current" && "border-brand/60 bg-brand/10",
                state === "done" && "border-line bg-panel hover:border-brand/40",
                state === "todo" && "border-line bg-panel opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  state === "current" ? "bg-brand text-white" : state === "done" ? "bg-success/20 text-success" : "bg-raised text-faint",
                )}
              >
                {state === "done" ? <CheckCircle2 className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium">{label}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------ Step 1: service */

function ServiceStep({
  services,
  serviceId,
  onPick,
}: {
  services: Service[];
  serviceId: number | null;
  onPick: (id: number) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">What service do you need?</h2>
      <p className="mt-1 text-[13px] text-muted">Select the service you are interested in.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const active = serviceId === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onPick(service.id)}
              className={cn(
                "rounded-[14px] border p-3 text-left transition",
                active ? "border-brand bg-brand/10 ring-2 ring-brand/30" : "border-line bg-raised hover:border-brand/40",
              )}
            >
              <div className="h-16 rounded-[10px] border border-line bg-gradient-to-br from-[#1a2434] to-[#0c121c] p-2">
                <CarSilhouette body={service.sort_order % 2 === 0 ? "sedan" : "suv"} color="#c3d1e4" />
              </div>
              <p className="mt-2.5 text-[13.5px] font-medium">{service.name}</p>
              <p className="mt-0.5 text-[12px] text-muted">
                from <span className="font-medium text-fg">{money(service.base_price)}</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-faint">
                <Timer className="size-3" /> {fmtDuration(service.duration_min)}
              </p>
            </button>
          );
        })}
      </div>

      {serviceId && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
          {services.find((s) => s.id === serviceId)?.description}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Step 2: vehicle */

const labelClass = "mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase";
const fieldClass =
  "w-full rounded-[10px] border border-line bg-raised px-3 py-2.5 text-[13px] text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

function VehicleStep(props: {
  make: string;
  setMake: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  customModel: string;
  setCustomModel: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  plate: string;
  setPlate: (v: string) => void;
  size: VehicleSize;
  setSize: (v: VehicleSize) => void;
  condition: VehicleCondition;
  setCondition: (v: VehicleCondition) => void;
  settings: BusinessSettings;
}) {
  const models = CAR_MAKES[props.make] ?? [];
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Tell us about your vehicle</h2>
      <p className="mt-1 text-[13px] text-muted">This helps us give you an accurate price.</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_180px] sm:items-start">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Make</span>
            <select value={props.make} onChange={(e) => props.setMake(e.target.value)} className={fieldClass}>
              <option value="">Select make</option>
              {Object.keys(CAR_MAKES).map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            <span className={labelClass}>Model</span>
            {models.length ? (
              <select value={props.model} onChange={(e) => props.setModel(e.target.value)} className={fieldClass}>
                <option value="">Select model</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                <option value="__other">Other…</option>
              </select>
            ) : (
              <input
                value={props.customModel}
                onChange={(e) => {
                  props.setCustomModel(e.target.value);
                  props.setModel("__other");
                }}
                placeholder="Model"
                className={fieldClass}
              />
            )}
          </label>

          {props.model === "__other" && models.length > 0 && (
            <label className="sm:col-span-2">
              <span className={labelClass}>Model name</span>
              <input
                value={props.customModel}
                onChange={(e) => props.setCustomModel(e.target.value)}
                placeholder="Type the model"
                className={fieldClass}
              />
            </label>
          )}

          <label>
            <span className={labelClass}>Year</span>
            <select value={props.year} onChange={(e) => props.setYear(e.target.value)} className={fieldClass}>
              <option value="">Select year</option>
              {Array.from({ length: 30 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Registration (optional)</span>
            <input
              value={props.plate}
              onChange={(e) => props.setPlate(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className={cn(fieldClass, "font-mono tracking-wider")}
            />
          </label>

          <label className="sm:col-span-2">
            <span className={labelClass}>Size class</span>
            <select
              value={props.size}
              onChange={(e) => props.setSize(e.target.value as VehicleSize)}
              className={fieldClass}
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} (×{props.settings.size_multiplier[s.value]})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[12px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] p-3">
          <CarSilhouette make={props.make} model={props.model === "__other" ? props.customModel : props.model} color="#cdd9e8" />
          <p className="mt-2 truncate text-center text-[12px] text-muted">
            {props.make || "Your car"} {props.model === "__other" ? props.customModel : props.model}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <span className={labelClass}>Condition</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {CONDITIONS.map((option) => {
            const surcharge = props.settings.condition_surcharge[option.value];
            const active = props.condition === option.value;
            return (
              <button
                key={option.value}
                onClick={() => props.setCondition(option.value)}
                className={cn(
                  "rounded-[12px] border px-3 py-2.5 text-left transition",
                  active ? "border-brand bg-brand/10" : "border-line bg-raised hover:border-brand/40",
                )}
              >
                <span className="block text-[13px] font-medium">
                  {option.label}
                  {surcharge > 0 && <span className="ml-1.5 text-[11px] text-warn">+{surcharge}%</span>}
                </span>
                <span className="block text-[11.5px] text-muted">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Step 3: schedule */

function ScheduleStep(props: {
  settings: BusinessSettings;
  onsite: boolean;
  setOnsite: (v: boolean) => void;
  address: string;
  setAddress: (v: string) => void;
  postalCode: string;
  setPostalCode: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  day: string;
  setDay: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  slots: Slot[];
  days: DayAvailability[];
  loading: boolean;
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
}) {
  const today = dayKey(new Date());
  const maxDay = dayKey(addDays(new Date(), props.settings.max_days_ahead));
  const availability = new Map(props.days.map((d) => [d.day, d]));

  const first = new Date(props.monthCursor);
  first.setDate(1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -offset);
  const grid = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Where and when?</h2>
      <p className="mt-1 text-[13px] text-muted">Choose location and preferred date.</p>

      {props.settings.onsite_enabled && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            { value: false, label: "At our shop", hint: props.settings.city },
            { value: true, label: "At your location", hint: `+${money(props.settings.onsite_fee)}` },
          ].map((option) => (
            <button
              key={String(option.value)}
              onClick={() => props.setOnsite(option.value)}
              className={cn(
                "flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left transition",
                props.onsite === option.value ? "border-brand bg-brand/10" : "border-line bg-raised hover:border-brand/40",
              )}
            >
              <MapPin className={cn("size-4 shrink-0", props.onsite === option.value ? "text-brand" : "text-faint")} />
              <span>
                <span className="block text-[13px] font-medium">{option.label}</span>
                <span className="block text-[11.5px] text-muted">{option.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {props.onsite && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label>
            <span className={labelClass}>Street address</span>
            <input value={props.address} onChange={(e) => props.setAddress(e.target.value)} placeholder="Kungsgatan 12" className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Postal code</span>
            <input value={props.postalCode} onChange={(e) => props.setPostalCode(e.target.value)} placeholder="111 43" className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>City</span>
            <input value={props.city} onChange={(e) => props.setCity(e.target.value)} className={fieldClass} />
          </label>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[12px] border border-line bg-raised p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => {
                const prev = new Date(props.monthCursor);
                prev.setMonth(prev.getMonth() - 1);
                props.setMonthCursor(prev);
              }}
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-panel hover:text-fg"
              aria-label="Previous month"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <span className="text-[13px] font-medium">
              {MONTH_NAMES[props.monthCursor.getMonth()]} {props.monthCursor.getFullYear()}
            </span>
            <button
              onClick={() => {
                const next = new Date(props.monthCursor);
                next.setMonth(next.getMonth() + 1);
                props.setMonthCursor(next);
              }}
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-panel hover:text-fg"
              aria-label="Next month"
            >
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={`${d}${i}`} className="py-1 text-[10.5px] text-faint">
                {d}
              </span>
            ))}
            {grid.map((date) => {
              const key = dayKey(date);
              const info = availability.get(key);
              const inMonth = date.getMonth() === props.monthCursor.getMonth();
              const bookable = Boolean(info?.open && info.slots > 0) && key >= today && key <= maxDay;
              const selected = key === props.day;
              return (
                <button
                  key={key}
                  disabled={!bookable}
                  onClick={() => props.setDay(key)}
                  className={cn(
                    "aspect-square rounded-lg text-[12px] transition",
                    selected && "bg-brand font-semibold text-white",
                    !selected && bookable && "text-fg hover:bg-panel",
                    !bookable && "text-faint/50",
                    !inMonth && "opacity-40",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-line pt-2 text-[11px] text-faint">
            Greyed-out days are fully booked or closed.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-[13px]">
            <CalendarDays className="size-4 text-faint" />
            <span className="font-medium">{formatDate(props.day, { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>

          {props.loading ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-muted">
              <Loader2 className="size-4 animate-spin" /> Checking the calendar…
            </div>
          ) : props.slots.length === 0 ? (
            <p className="rounded-[10px] border border-line bg-raised px-3 py-6 text-center text-[13px] text-muted">
              We&apos;re closed that day. Pick another date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {props.slots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => props.setTime(slot.time)}
                  className={cn(
                    "rounded-[10px] border py-2.5 text-[13px] font-medium tabular-nums transition",
                    props.time === slot.time
                      ? "border-brand bg-brand text-white"
                      : slot.available
                        ? "border-line bg-raised text-fg hover:border-brand/50"
                        : "border-line-soft bg-canvas text-faint/50 line-through",
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11.5px] text-faint">
            Slots reflect our real calendar, including how long your service takes.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Step 4: summary */

function SummaryStep(props: {
  service: Service;
  make: string;
  model: string;
  year: string;
  plate: string;
  size: VehicleSize;
  condition: VehicleCondition;
  onsite: boolean;
  address: string;
  city: string;
  day: string;
  time: string;
  price: ReturnType<typeof computePrice>;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  error: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Review and book</h2>
      <p className="mt-1 text-[13px] text-muted">Here is your booking summary.</p>

      <div className="mt-5 rounded-[12px] border border-line bg-raised p-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-24 shrink-0 rounded-[10px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] p-1.5">
            <CarSilhouette make={props.make} model={props.model} color="#cdd9e8" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium">{props.service.name}</p>
            <p className="text-[12.5px] text-muted">
              {props.make} {props.model} {props.year && `· ${props.year}`}
            </p>
            <p className="text-[11.5px] text-faint capitalize">
              {props.size} · {props.condition.replace("_", " ")} condition {props.plate && `· ${props.plate}`}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Date</dt>
            <dd>{formatDate(props.day, { weekday: "short", day: "numeric", month: "long" })}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Time</dt>
            <dd className="tabular-nums">{props.time}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Location</dt>
            <dd className="text-right">{props.onsite ? `${props.address}, ${props.city}` : "At our shop"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Estimated time</dt>
            <dd>{fmtDuration(props.price.durationMin)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-semibold">
            <dt>Estimated price</dt>
            <dd className="tabular-nums">{money(props.price.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Your name</span>
          <input value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Erik Lindqvist" className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Phone</span>
          <input value={props.phone} onChange={(e) => props.setPhone(e.target.value)} placeholder="070-123 45 67" className={fieldClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            placeholder="you@mail.se"
            className={fieldClass}
          />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Anything we should know? (optional)</span>
          <textarea
            value={props.notes}
            onChange={(e) => props.setNotes(e.target.value)}
            rows={3}
            placeholder="Dog hair in the boot, please focus on the wheels…"
            className={cn(fieldClass, "resize-y")}
          />
        </label>
      </div>

      {props.error && (
        <p className="mt-4 rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">{props.error}</p>
      )}
      <p className="mt-4 text-[11.5px] text-faint">
        No prepayment needed. We confirm by email or SMS, and the final price is agreed before we start.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- Price rail */

function SummaryRail({
  service,
  price,
  make,
  model,
  day,
  time,
  onsite,
  settings,
}: {
  service?: Service;
  price: ReturnType<typeof computePrice> | null;
  make: string;
  model: string;
  day: string;
  time: string;
  onsite: boolean;
  settings: BusinessSettings;
}) {
  return (
    <aside className="h-fit rounded-[16px] border border-line bg-panel p-5 lg:sticky lg:top-24">
      <h3 className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Your booking</h3>

      <div className="mt-3 space-y-2.5 text-[13px]">
        <div className="flex items-start gap-2.5">
          <Car className="mt-0.5 size-4 shrink-0 text-faint" />
          <span className="min-w-0">
            <span className="block truncate">{service?.name ?? "Pick a service"}</span>
            <span className="block truncate text-[12px] text-muted">
              {make ? `${make} ${model}` : "Your vehicle"}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-faint" />
          <span>
            {time ? `${formatDate(day, { weekday: "short", day: "numeric", month: "short" })} · ${time}` : "No time picked"}
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-faint" />
          <span>{onsite ? "We come to you" : `${settings.address}, ${settings.city}`}</span>
        </div>
      </div>

      {price && (
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted">Base price</dt>
            <dd className="tabular-nums">{money(price.base)}</dd>
          </div>
          {price.sizeAdjustment !== 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Vehicle size</dt>
              <dd className="tabular-nums">
                {price.sizeAdjustment > 0 ? "+" : "−"}
                {money(Math.abs(price.sizeAdjustment))}
              </dd>
            </div>
          )}
          {price.conditionAdjustment > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Condition</dt>
              <dd className="tabular-nums">+{money(price.conditionAdjustment)}</dd>
            </div>
          )}
          {price.travelFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Travel</dt>
              <dd className="tabular-nums">+{money(price.travelFee)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(price.total)}</dd>
          </div>
          <p className="pt-1 text-[11px] text-faint">Incl. {settings.vat_rate}% VAT · {fmtDuration(price.durationMin)}</p>
        </dl>
      )}
    </aside>
  );
}

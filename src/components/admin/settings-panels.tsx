"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Pencil, Plus, X } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { deleteServiceAction, saveServiceAction, saveSettingsAction } from "@/lib/actions/crm";
import { duration, money } from "@/lib/format";
import { DAY_NAMES } from "@/lib/dates";
import type { BusinessSettings, Service } from "@/lib/types";

const TABS = [
  { value: "business", label: "Business" },
  { value: "booking", label: "Online booking" },
  { value: "services", label: "Services" },
  { value: "pricing", label: "Pricing rules" },
];

export function SettingsPanels({
  settings,
  services,
  saved,
  initialTab,
}: {
  settings: BusinessSettings;
  services: Service[];
  saved: boolean;
  initialTab: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.value === initialTab) ? initialTab : "business";

  function switchTab(next: string) {
    const query = new URLSearchParams(params.toString());
    query.set("tab", next);
    query.delete("saved");
    router.replace(`/settings?${query.toString()}`, { scroll: false });
  }

  return (
    <div className="max-w-4xl space-y-4">
      {saved && (
        <p className="flex items-center gap-2 rounded-[10px] border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
          <Check className="size-4" /> Settings saved.
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-[10px] border border-line bg-raised p-0.5">
        {TABS.map((option) => (
          <button
            key={option.value}
            onClick={() => switchTab(option.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
              tab === option.value ? "bg-brand text-white" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "services" ? (
        <ServicesPanel services={services} />
      ) : (
        <form action={saveSettingsAction} className="space-y-4">
          {/* Every tab posts the full settings object, so hidden fields carry the ones not on screen. */}
          <HiddenSettings settings={settings} tab={tab} />

          {tab === "business" && <BusinessPanel settings={settings} />}
          {tab === "booking" && <BookingPanel settings={settings} />}
          {tab === "pricing" && <PricingPanel settings={settings} />}

          <Button type="submit" size="lg">
            Save settings
          </Button>
        </form>
      )}
    </div>
  );
}

function HiddenSettings({ settings, tab }: { settings: BusinessSettings; tab: string }) {
  const fields: Array<[string, string | number]> = [];
  if (tab !== "business") {
    fields.push(
      ["business_name", settings.business_name],
      ["tagline", settings.tagline],
      ["email", settings.email],
      ["phone", settings.phone],
      ["address", settings.address],
      ["postal_code", settings.postal_code],
      ["city", settings.city],
      ["org_number", settings.org_number],
      ["currency", settings.currency],
    );
  }
  if (tab !== "booking") {
    fields.push(
      ["open_from", settings.open_from],
      ["open_to", settings.open_to],
      ["slot_minutes", settings.slot_minutes],
      ["lead_time_hours", settings.lead_time_hours],
      ["max_days_ahead", settings.max_days_ahead],
    );
  }
  if (tab !== "pricing") {
    fields.push(
      ["vat_rate", settings.vat_rate],
      ["onsite_fee", settings.onsite_fee],
      ["surcharge_dirty", settings.condition_surcharge.dirty],
      ["surcharge_very_dirty", settings.condition_surcharge.very_dirty],
      ["size_small", settings.size_multiplier.small],
      ["size_medium", settings.size_multiplier.medium],
      ["size_large", settings.size_multiplier.large],
      ["size_xl", settings.size_multiplier.xl],
    );
  }

  return (
    <>
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {tab !== "booking" && (
        <>
          {settings.open_days.map((day) => (
            <input key={day} type="hidden" name="open_days" value={day} />
          ))}
          {settings.booking_enabled && <input type="hidden" name="booking_enabled" value="on" />}
          {settings.onsite_enabled && <input type="hidden" name="onsite_enabled" value="on" />}
        </>
      )}
    </>
  );
}

function BusinessPanel({ settings }: { settings: BusinessSettings }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[15px] font-semibold">Business details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name">
          <Input name="business_name" defaultValue={settings.business_name} />
        </Field>
        <Field label="Tagline" hint="Shown on the booking site hero.">
          <Input name="tagline" defaultValue={settings.tagline} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={settings.email} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={settings.phone} />
        </Field>
        <Field label="Street address">
          <Input name="address" defaultValue={settings.address} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Postal code">
            <Input name="postal_code" defaultValue={settings.postal_code} />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={settings.city} />
          </Field>
        </div>
        <Field label="Org. number">
          <Input name="org_number" defaultValue={settings.org_number} />
        </Field>
        <Field label="Currency suffix">
          <Input name="currency" defaultValue={settings.currency} />
        </Field>
      </div>
    </Card>
  );
}

function BookingPanel({ settings }: { settings: BusinessSettings }) {
  return (
    <>
      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Opening hours</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {DAY_NAMES.map((name, index) => (
            <label key={name} className="cursor-pointer">
              <input
                type="checkbox"
                name="open_days"
                value={index}
                defaultChecked={settings.open_days.includes(index)}
                className="peer sr-only"
              />
              <span className="block rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] text-muted transition peer-checked:border-brand/60 peer-checked:bg-brand/15 peer-checked:text-fg">
                {name.slice(0, 3)}
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Opens">
            <Input type="time" name="open_from" defaultValue={settings.open_from} />
          </Field>
          <Field label="Closes">
            <Input type="time" name="open_to" defaultValue={settings.open_to} />
          </Field>
          <Field label="Slot length (min)">
            <Select name="slot_minutes" defaultValue={String(settings.slot_minutes)}>
              {[15, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Booking rules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum notice (hours)" hint="Customers cannot book sooner than this.">
            <Input type="number" name="lead_time_hours" min={0} defaultValue={settings.lead_time_hours} />
          </Field>
          <Field label="Book up to (days ahead)">
            <Input type="number" name="max_days_ahead" min={1} defaultValue={settings.max_days_ahead} />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-[13px]">
            <input type="checkbox" name="booking_enabled" defaultChecked={settings.booking_enabled} className="size-4 accent-[#2563eb]" />
            Accept bookings from the public website
          </label>
          <label className="flex items-center gap-3 text-[13px]">
            <input type="checkbox" name="onsite_enabled" defaultChecked={settings.onsite_enabled} className="size-4 accent-[#2563eb]" />
            Offer mobile detailing at the customer&apos;s address
          </label>
        </div>
      </Card>
    </>
  );
}

function PricingPanel({ settings }: { settings: BusinessSettings }) {
  return (
    <>
      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Charges</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="VAT %">
            <Input type="number" name="vat_rate" min={0} max={100} defaultValue={settings.vat_rate} />
          </Field>
          <Field label="Travel fee" hint="Added to mobile jobs.">
            <Input type="number" name="onsite_fee" min={0} defaultValue={settings.onsite_fee} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Condition surcharge</h2>
        <p className="mb-4 text-[12px] text-muted">Percentage added when the car needs extra work.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dirty %">
            <Input type="number" name="surcharge_dirty" min={0} defaultValue={settings.condition_surcharge.dirty} />
          </Field>
          <Field label="Very dirty %">
            <Input type="number" name="surcharge_very_dirty" min={0} defaultValue={settings.condition_surcharge.very_dirty} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Vehicle size multipliers</h2>
        <p className="mb-4 text-[12px] text-muted">Every service price is multiplied by this factor.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {(["small", "medium", "large", "xl"] as const).map((size) => (
            <Field key={size} label={size === "xl" ? "XL / SUV" : size}>
              <Input type="number" step="0.05" min={0.1} name={`size_${size}`} defaultValue={settings.size_multiplier[size]} />
            </Field>
          ))}
        </div>
      </Card>
    </>
  );
}

function ServicesPanel({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">
          These are the packages customers pick from on the{" "}
          <Link href="/book" className="text-brand hover:text-fg">
            booking site
          </Link>
          .
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> New service
        </Button>
      </div>

      {editing && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{editing === "new" ? "New service" : `Edit ${editing.name}`}</h2>
            <button onClick={() => setEditing(null)} aria-label="Close" className="text-faint hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
          <form action={saveServiceAction.bind(null, editing === "new" ? null : editing.id)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={editing === "new" ? "" : editing.name} />
            </Field>
            <Field label="Category">
              <Input name="category" defaultValue={editing === "new" ? "detailing" : editing.category} />
            </Field>
            <Field label="Base price">
              <Input type="number" name="base_price" min={0} defaultValue={editing === "new" ? 0 : editing.base_price} />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" name="duration_min" min={15} step={15} defaultValue={editing === "new" ? 60 : editing.duration_min} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea name="description" defaultValue={editing === "new" ? "" : editing.description} />
            </Field>
            <Field label="Checklist (one step per line)" className="sm:col-span-2">
              <Textarea
                name="checklist"
                rows={8}
                defaultValue={editing === "new" ? "" : (JSON.parse(editing.checklist || "[]") as string[]).join("\n")}
              />
            </Field>
            <Field label="Sort order">
              <Input type="number" name="sort_order" defaultValue={editing === "new" ? services.length : editing.sort_order} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing === "new" ? true : editing.active === 1}
                className="size-4 accent-[#2563eb]"
              />
              Bookable online
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">Save service</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id} className={cn("p-4", !service.active && "opacity-50")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{service.name}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {money(service.base_price)} · {duration(service.duration_min)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(service)}
                  className="grid size-7 place-items-center rounded-lg text-faint hover:bg-raised hover:text-fg"
                  aria-label={`Edit ${service.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <form action={deleteServiceAction.bind(null, service.id)}>
                  <button
                    type="submit"
                    className="grid size-7 place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
                    aria-label={`Archive ${service.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </form>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[12px] text-muted">{service.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="slate">{service.category}</Badge>
              <Badge tone={service.active ? "green" : "slate"}>{service.active ? "Bookable" : "Hidden"}</Badge>
              <Badge tone="blue">{(JSON.parse(service.checklist || "[]") as string[]).length} steps</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

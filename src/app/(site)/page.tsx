import Link from "next/link";
import {
  ArrowRight, BarChart3, CalendarDays, Camera, Car, CheckCircle2, ClipboardCheck,
  MapPin, MessageSquare, Receipt, ShieldCheck, Star, Timer,
} from "lucide-react";
import { CarSilhouette } from "@/components/car-art";
import { listServices } from "@/lib/repo/services";
import { getSettings } from "@/lib/repo/settings";
import { getDb } from "@/lib/db";
import { duration, money } from "@/lib/format";
import { DAY_NAMES } from "@/lib/dates";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Car, title: "Vehicle profiles", body: "Complete history & details" },
  { icon: CalendarDays, title: "Smart scheduling", body: "Calendar & routing" },
  { icon: Camera, title: "Before & after photos", body: "Document every job" },
  { icon: ClipboardCheck, title: "Checklists", body: "Standardised quality" },
  { icon: Receipt, title: "Invoicing & payments", body: "Get paid faster" },
  { icon: MessageSquare, title: "Customer communication", body: "SMS, email, WhatsApp" },
  { icon: BarChart3, title: "Reports & analytics", body: "Know your business" },
];

const STEPS = [
  { title: "Choose your service", body: "Pick a package and tell us about the car. The price updates as you go." },
  { title: "Pick a time that suits", body: "Live availability from our real calendar — no waiting for a callback." },
  { title: "We take it from there", body: "Your technician works through a checklist and sends before & after photos." },
];

export default async function HomePage() {
  const services = listServices(true);
  const settings = getSettings();
  const db = getDb();

  const completed = (db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status = 'completed'").get() as { n: number }).n;
  const customers = (db.prepare("SELECT COUNT(*) AS n FROM customers").get() as { n: number }).n;
  const openDays = settings.open_days.map((d) => DAY_NAMES[d].slice(0, 3)).join(", ");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[12px] text-muted">
              <span className="size-1.5 rounded-full bg-success" />
              Booking {settings.booking_enabled ? "open" : "paused"} · {openDays} {settings.open_from}–{settings.open_to}
            </p>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
              Your car, detailed
              <br />
              <span className="bg-gradient-to-r from-brand to-cyan bg-clip-text text-transparent">properly.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">{settings.tagline}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-strong px-5 py-3 text-sm font-medium text-white transition hover:bg-brand"
              >
                Book a detail <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#services"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-5 py-3 text-sm font-medium text-muted transition hover:text-fg"
              >
                See packages
              </Link>
            </div>

            <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
              {[
                [`${completed}+`, "Jobs completed"],
                [`${customers}+`, "Regular customers"],
                ["4.9★", "Average rating"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-xl font-semibold tracking-tight">{value}</dt>
                  <dd className="text-[12px] text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-[20px] border border-line bg-gradient-to-br from-[#141d2c] to-[#0b1018] p-8">
              <CarSilhouette body="suv" color="#dbe6f5" />
            </div>
            <div className="absolute -bottom-5 -left-2 flex items-center gap-2.5 rounded-[12px] border border-line bg-panel px-3.5 py-2.5 shadow-xl shadow-black/40 sm:left-6">
              <span className="grid size-8 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-4.5" />
              </span>
              <span>
                <span className="block text-[13px] font-medium">Ceramic coating done</span>
                <span className="block text-[11px] text-muted">Photos sent to the customer</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">Packages</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">What does your car need?</h2>
            </div>
            <p className="max-w-md text-[13px] text-muted">
              Prices are from — the exact figure depends on the size and condition of your car, and you see it before
              you confirm.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/book?service=${service.slug}`}
                className="group flex flex-col rounded-[16px] border border-line bg-panel p-5 transition hover:border-brand/50 hover:bg-[#141b28]"
              >
                <div className="mb-4 h-24 rounded-[12px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] p-3">
                  <CarSilhouette body={service.sort_order % 2 === 0 ? "sedan" : "suv"} color="#c3d1e4" />
                </div>
                <h3 className="text-[15px] font-semibold">{service.name}</h3>
                <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">{service.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[13px]">
                    <span className="text-faint">from </span>
                    <span className="font-semibold">{money(service.base_price)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Timer className="size-3.5" /> {duration(service.duration_min)}
                  </span>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand">
                  Book this <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Booked in about a minute</h2>

          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[16px] border border-line bg-panel p-5">
                <span className="grid size-8 place-items-center rounded-full bg-brand/15 text-[13px] font-semibold text-brand">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: MapPin, title: "We come to you", body: `Mobile detailing across ${settings.city} for ${money(settings.onsite_fee)}.` },
              { icon: ShieldCheck, title: "Insured & careful", body: "pH-neutral chemicals, clean towels, no automatic brushes." },
              { icon: Star, title: "Same technician", body: "Your car keeps its history, so the next visit is faster." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-[14px] border border-line bg-panel p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-raised text-brand">
                  <item.icon className="size-4.5" />
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium">{item.title}</span>
                  <span className="block text-[12.5px] text-muted">{item.body}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-b border-line bg-rail">
        <div className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-faint uppercase">Powerful features</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line bg-panel text-muted">
                  <feature.icon className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{feature.title}</span>
                  <span className="block text-[12px] text-muted">{feature.body}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="relative overflow-hidden rounded-[20px] border border-line bg-gradient-to-br from-[#132038] to-[#0b111b] px-6 py-12 text-center">
            <div className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready when you are</h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] text-muted">
                Pick a slot from our live calendar. You&apos;ll get a booking number straight away and a reminder before
                the day.
              </p>
              <Link
                href="/book"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-strong px-5 py-3 text-sm font-medium text-white transition hover:bg-brand"
              >
                Start booking <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

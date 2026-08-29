import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, CheckCircle2, Clock, MapPin, Phone } from "lucide-react";
import { CarSilhouette } from "@/components/car-art";
import { getJobByNumber, jobServices } from "@/lib/repo/jobs";
import { getSettings } from "@/lib/repo/settings";
import { duration, money } from "@/lib/format";
import { formatDate, stampTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Booking ${number}` };
}

export default async function BookingConfirmationPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const job = getJobByNumber(decodeURIComponent(number));
  if (!job) notFound();

  const settings = getSettings();
  const services = jobServices(job.id);
  const start = `${job.scheduled_at.slice(0, 10).replace(/-/g, "")}T${stampTime(job.scheduled_at).replace(":", "")}00`;
  const endDate = new Date(new Date(job.scheduled_at).getTime() + job.duration_min * 60000);
  const end = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, "0")}${String(endDate.getDate()).padStart(2, "0")}T${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`;

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${services[0]?.name ?? "Car detailing"} — ${settings.business_name}`,
  )}&dates=${start}/${end}&details=${encodeURIComponent(`Booking ${job.job_number}`)}&location=${encodeURIComponent(
    job.location_type === "onsite" ? `${job.address}, ${job.city}` : `${settings.address}, ${settings.city}`,
  )}`;

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-14">
      <div className="rounded-[18px] border border-line bg-panel p-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-success/30 bg-success/12 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Booking confirmed!</h1>
        <p className="mt-2 text-[14px] text-muted">
          Thank you! We have received your booking. You will receive a confirmation email shortly.
        </p>

        <div className="mt-6 rounded-[12px] border border-line bg-raised px-4 py-3">
          <p className="text-[11px] tracking-wide text-faint uppercase">Booking number</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">#{job.job_number}</p>
        </div>

        <div className="mt-5 rounded-[12px] border border-line bg-raised p-4 text-left">
          <div className="flex items-center gap-3">
            <div className="h-14 w-24 shrink-0 rounded-[10px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c] p-1.5">
              <CarSilhouette make={job.vehicle_make} model={job.vehicle_model} color="#cdd9e8" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{services.map((s) => s.name).join(", ")}</p>
              <p className="text-[12.5px] text-muted">
                {job.vehicle_make} {job.vehicle_model} {job.vehicle_year ? `· ${job.vehicle_year}` : ""}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted">
                <Clock className="size-3.5 text-faint" /> When
              </dt>
              <dd className="text-right">
                {formatDate(job.scheduled_at, { weekday: "short", day: "numeric", month: "long" })} ·{" "}
                {stampTime(job.scheduled_at)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-3.5 text-faint" /> Where
              </dt>
              <dd className="text-right">
                {job.location_type === "onsite" ? `${job.address}, ${job.city}` : `${settings.address}, ${settings.city}`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Estimated time</dt>
              <dd>{duration(job.duration_min)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-semibold">
              <dt>Estimated price</dt>
              <dd className="tabular-nums">{money(job.price)}</dd>
            </div>
          </dl>
        </div>

        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] border border-line bg-raised px-4 py-3 text-[13px] font-medium text-fg transition hover:border-brand/50"
        >
          <CalendarPlus className="size-4" /> Add to calendar
        </a>

        <Link
          href="/"
          className="mt-2 flex w-full items-center justify-center rounded-[12px] px-4 py-3 text-[13px] font-medium text-muted transition hover:text-fg"
        >
          Back to home
        </Link>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-faint">
          <Phone className="size-3.5" /> Need to change something? Call {settings.phone}
        </p>
      </div>
    </div>
  );
}

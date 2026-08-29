import Link from "next/link";
import { Suspense } from "react";
import { CalendarX2 } from "lucide-react";
import { BookingWizard } from "@/components/booking/wizard";
import { getServiceBySlug, listServices } from "@/lib/repo/services";
import { getSettings } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book a detail" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service: slug } = await searchParams;
  const settings = getSettings();
  const services = listServices(true);
  const preselected = slug ? getServiceBySlug(slug) : undefined;

  if (!settings.booking_enabled || services.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center px-5 py-24 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-raised text-muted">
          <CalendarX2 className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Online booking is closed</h1>
        <p className="mt-2 text-[14px] text-muted">
          We&apos;re not taking bookings through the website right now. Give us a call on{" "}
          <a href={`tel:${settings.phone}`} className="text-brand hover:text-fg">
            {settings.phone}
          </a>{" "}
          and we&apos;ll sort you out.
        </p>
        <Link href="/" className="mt-6 text-[13px] font-medium text-brand hover:text-fg">
          Back to the homepage
        </Link>
      </div>
    );
  }

  return (
    <Suspense>
      <BookingWizard services={services} settings={settings} initialServiceId={preselected?.id} />
    </Suspense>
  );
}

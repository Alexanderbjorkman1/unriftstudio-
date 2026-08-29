import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";
import { FilterTabs } from "@/components/admin/filters";
import { ReportCharts } from "@/components/admin/report-charts";
import { HBarChart } from "@/components/charts/bar-chart";
import {
  rangeSummary, revenueByMonth, revenueByService, revenueSeries, topCustomers,
} from "@/lib/repo/stats";
import { technicianStats } from "@/lib/repo/users";
import { addDays, dayKey } from "@/lib/dates";
import { duration, money } from "@/lib/format";
import { seqColor } from "@/components/charts/palette";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

const RANGES: Record<string, { label: string; days: number }> = {
  "7": { label: "7 days", days: 7 },
  "30": { label: "30 days", days: 30 },
  "90": { label: "90 days", days: 90 },
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = "30" } = await searchParams;
  const days = RANGES[range]?.days ?? 30;

  const today = new Date();
  const from = `${dayKey(addDays(today, -(days - 1)))}T00:00`;
  const to = `${dayKey(today)}T23:59`;
  const prevFrom = `${dayKey(addDays(today, -(days * 2 - 1)))}T00:00`;
  const prevTo = `${dayKey(addDays(today, -days))}T23:59`;

  const summary = rangeSummary(from, to);
  const previous = rangeSummary(prevFrom, prevTo);
  const services = revenueByService(from, to);
  const technicians = technicianStats(from, to);
  const customers = topCustomers(6);
  const daily = revenueSeries(days);
  const monthly = revenueByMonth(12);

  const cards = [
    { label: "Revenue", value: money(summary.revenue), prev: previous.revenue, now: summary.revenue },
    { label: "Completed jobs", value: String(summary.jobs), prev: previous.jobs, now: summary.jobs },
    { label: "Average ticket", value: money(summary.avg_ticket), prev: previous.avg_ticket, now: summary.avg_ticket },
    { label: "Hours worked", value: duration(summary.minutes), prev: previous.minutes, now: summary.minutes },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          param="range"
          active={range}
          options={Object.entries(RANGES).map(([value, r]) => ({ value, label: r.label }))}
        />
        <p className="ml-auto text-[12px] text-muted">
          {summary.online} of {summary.jobs + summary.cancelled} bookings came from the website ·{" "}
          {summary.repeatCustomers} repeat customers
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const delta = card.prev ? Math.round(((card.now - card.prev) / card.prev) * 100) : 0;
          return (
            <Card key={card.label} className="px-4 py-4">
              <p className="text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">{card.label}</p>
              <p className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums">{card.value}</p>
              <p className={`mt-1.5 text-[12px] ${delta >= 0 ? "text-success" : "text-danger"}`}>
                {delta >= 0 ? "+" : ""}
                {delta}% <span className="text-muted">vs previous {days} days</span>
              </p>
            </Card>
          );
        })}
      </section>

      <ReportCharts daily={daily} monthly={monthly} />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Revenue by service" />
          <div className="px-5 pb-5">
            {services.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">No completed jobs in this range.</p>
            ) : (
              <HBarChart
                data={services.map((service, i) => ({
                  label: `${service.name} · ${service.jobs}×`,
                  value: service.revenue,
                  display: money(service.revenue),
                  color: seqColor(i, services.length),
                }))}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Technician output" />
          <div className="px-5 pb-5">
            <HBarChart
              data={technicians.map((t) => ({
                label: `${t.name} · ${t.jobs} jobs`,
                value: t.revenue,
                display: money(t.revenue),
                color: t.color,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top customers" />
          <div className="px-5 pb-5">
            <ul className="space-y-2.5">
              {customers.map((customer, i) => (
                <li key={customer.id} className="flex items-center gap-3 text-[13px]">
                  <span className="w-4 text-center text-[12px] text-faint tabular-nums">{i + 1}</span>
                  <Link href={`/customers/${customer.id}`} className="min-w-0 flex-1 truncate hover:text-brand">
                    {customer.name}
                  </Link>
                  <span className="shrink-0 text-[12px] text-faint">{customer.jobs} jobs</span>
                  <span className="shrink-0 font-medium tabular-nums">{money(customer.revenue)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}

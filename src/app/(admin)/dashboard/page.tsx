import Link from "next/link";
import { CalendarCheck, CircleDollarSign, ReceiptText, UserPlus } from "lucide-react";
import { Card, CardHeader, CardLink, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/admin/stat-card";
import { RecentJobRow, ScheduleRow } from "@/components/admin/job-row";
import { RevenueOverview } from "@/components/admin/revenue-overview";
import { dashboardStats, revenueThisWeek, revenueSeries } from "@/lib/repo/stats";
import { listJobs } from "@/lib/repo/jobs";
import { dayKey } from "@/lib/dates";
import { money, percentChange } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const stats = dashboardStats();
  const today = dayKey(new Date());

  const todaysJobs = listJobs({ from: `${today}T00:00`, to: `${today}T23:59` }).filter((j) => j.status !== "cancelled");
  const recentJobs = listJobs({ status: "completed", order: "desc", limit: 5 });
  const week = revenueThisWeek();
  const month = revenueSeries(30);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's jobs"
          value={String(stats.jobsToday)}
          icon={<CalendarCheck className="size-4.5" />}
          tone="blue"
          delta={stats.jobsToday - stats.jobsYesterday}
          deltaLabel="from yesterday"
          href="/calendar"
        />
        <StatCard
          label="Revenue today"
          value={money(stats.revenueToday)}
          icon={<CircleDollarSign className="size-4.5" />}
          tone="green"
          delta={percentChange(stats.revenueToday, stats.revenueYesterday)}
          deltaLabel="% from yesterday"
          href="/reports"
        />
        <StatCard
          label="Pending payments"
          value={money(stats.pendingPayments)}
          icon={<ReceiptText className="size-4.5" />}
          tone="amber"
          footnote={`${stats.pendingInvoiceCount} invoice${stats.pendingInvoiceCount === 1 ? "" : "s"} outstanding`}
          href="/invoices?status=sent"
        />
        <StatCard
          label="New customers"
          value={String(stats.newCustomers)}
          icon={<UserPlus className="size-4.5" />}
          tone="violet"
          delta={stats.newCustomers - stats.newCustomersPrev}
          deltaLabel="vs previous 30 days"
          href="/customers"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader title="Today's schedule" action={<CardLink href="/calendar">View calendar</CardLink>} />
          <div className="px-3 pb-3">
            {todaysJobs.length === 0 ? (
              <EmptyState
                title="Nothing booked today"
                description="Enjoy the quiet — or add a job to fill the bay."
                action={
                  <Link href="/jobs/new" className="text-[13px] font-medium text-brand hover:text-fg">
                    Add a job
                  </Link>
                }
              />
            ) : (
              <div className="space-y-0.5">
                {todaysJobs.map((job) => (
                  <ScheduleRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </Card>

        <RevenueOverview week={week} month={month} />

        <Card className="overflow-hidden">
          <CardHeader title="Recent jobs" action={<CardLink href="/jobs">View all</CardLink>} />
          <div className="px-3 pb-3">
            {recentJobs.length === 0 ? (
              <EmptyState title="No completed jobs yet" />
            ) : (
              <div className="space-y-0.5">
                {recentJobs.map((job) => (
                  <RecentJobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

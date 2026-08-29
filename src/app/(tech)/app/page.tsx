import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui";
import { TechJobList } from "@/components/tech/job-list";
import { requireUser } from "@/lib/auth";
import { listJobs } from "@/lib/repo/jobs";
import { dayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "My jobs" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TechHomePage() {
  const user = await requireUser("/app");
  const today = dayKey(new Date());

  // Owners see everything; technicians see the work assigned to them.
  const jobs = listJobs({
    technicianId: user.role === "owner" ? undefined : user.id,
    order: "asc",
    limit: 200,
  }).filter((job) => job.status !== "cancelled");

  const todays = jobs.filter((job) => job.scheduled_at.slice(0, 10) === today);

  return (
    <div className="px-5 pt-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {greeting()}, {user.name.split(" ")[0]} <span className="align-middle">👋</span>
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            You have {todays.length} job{todays.length === 1 ? "" : "s"} today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative grid size-9 place-items-center rounded-[10px] border border-line bg-panel text-muted">
            <Bell className="size-4.5" />
            {todays.some((job) => job.status === "booked") && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-canvas" />
            )}
          </span>
          <Avatar name={user.name} color={user.color} size={36} />
        </div>
      </header>

      <TechJobList jobs={jobs} today={today} />
    </div>
  );
}

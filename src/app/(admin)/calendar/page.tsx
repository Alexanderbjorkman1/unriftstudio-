import { CalendarView } from "@/components/admin/calendar-view";
import { listJobs } from "@/lib/repo/jobs";
import { listTechnicians } from "@/lib/repo/users";
import { getSettings } from "@/lib/repo/settings";
import { addDays, dayKey, monthGrid, parseStamp, startOfWeek } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view = "week", date } = await searchParams;
  const cursor = date ? parseStamp(date) : new Date();
  const settings = getSettings();

  let from: Date;
  let to: Date;
  if (view === "month") {
    const grid = monthGrid(cursor);
    from = grid[0];
    to = grid[grid.length - 1];
  } else if (view === "day") {
    from = cursor;
    to = cursor;
  } else {
    from = startOfWeek(cursor);
    to = addDays(from, 6);
  }

  const jobs = listJobs({ from: `${dayKey(from)}T00:00`, to: `${dayKey(to)}T23:59` });

  return (
    <CalendarView
      jobs={jobs}
      view={(view === "month" || view === "day" ? view : "week") as "month" | "week" | "day"}
      date={dayKey(cursor)}
      technicians={listTechnicians()}
      openFrom={settings.open_from}
      openTo={settings.open_to}
    />
  );
}

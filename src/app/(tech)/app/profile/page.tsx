import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { technicianStats } from "@/lib/repo/users";
import { addDays, dayKey } from "@/lib/dates";
import { duration, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function TechProfilePage() {
  const user = await requireUser("/app/profile");
  const today = new Date();
  const stats = technicianStats(`${dayKey(addDays(today, -30))}T00:00`, `${dayKey(today)}T23:59`).find(
    (row) => row.id === user.id,
  );

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} color={user.color} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-[13px] text-muted">{user.email}</p>
          <div className="mt-1">
            <Badge tone={user.role === "owner" ? "violet" : "blue"}>{user.role}</Badge>
          </div>
        </div>
      </div>

      <h2 className="mt-7 mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Last 30 days</h2>
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Jobs", String(stats?.jobs ?? 0)],
          ["Hours", duration(stats?.minutes ?? 0)],
          ["Revenue", money(stats?.revenue ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[12px] border border-line bg-panel p-3 text-center">
            <dt className="text-[10.5px] tracking-wide text-faint uppercase">{label}</dt>
            <dd className="mt-1 text-[15px] font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 space-y-2">
        {user.role === "owner" && (
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-[12px] border border-line bg-panel p-3.5 text-[13.5px] transition hover:border-brand/40"
          >
            <LayoutDashboard className="size-4.5 text-faint" />
            Open the admin dashboard
          </Link>
        )}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-[12px] border border-line bg-panel p-3.5 text-left text-[13.5px] text-danger transition hover:border-danger/40"
          >
            <LogOut className="size-4.5" />
            Sign out
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[11.5px] text-faint">
        {user.phone || "No phone on file"} · rate {money(user.hourly_rate)}/h
      </p>
    </div>
  );
}

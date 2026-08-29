"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, CalendarDays, Car, FileText, LayoutDashboard, LogOut, Menu, Package,
  Receipt, Settings, Sparkles, Smartphone, Users, Wrench, X,
} from "lucide-react";
import { Avatar, cn } from "@/components/ui";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full w-[232px] flex-col border-r border-line bg-rail">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5" onClick={() => setOpen(false)}>
        <span className="grid size-8 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-brand-strong">
          <Sparkles className="size-4.5 text-white" strokeWidth={2.2} />
        </span>
        <span className="text-[17px] font-semibold tracking-tight">DetailFlow</span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition",
                active
                  ? "bg-brand/15 text-fg shadow-[inset_0_0_0_1px] shadow-brand/20"
                  : "text-muted hover:bg-raised hover:text-fg",
              )}
            >
              <Icon className={cn("size-4.5", active ? "text-brand" : "text-faint")} strokeWidth={1.9} />
              {label}
            </Link>
          );
        })}

        <div className="!mt-4 border-t border-line pt-3">
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-raised hover:text-fg"
          >
            <Smartphone className="size-4.5 text-faint" strokeWidth={1.9} />
            Technician app
          </Link>
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-raised hover:text-fg"
          >
            <Sparkles className="size-4.5 text-faint" strokeWidth={1.9} />
            Booking website
          </Link>
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
          <Avatar name={user.name} color={user.color} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="text-[11px] text-faint capitalize">{user.role}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" title="Sign out" className="rounded-lg p-1.5 text-faint transition hover:bg-raised hover:text-danger">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 grid size-9 place-items-center rounded-[10px] border border-line bg-panel text-muted lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4.5" />
      </button>

      <aside className="hidden shrink-0 lg:block">{content}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-in">
            {content}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 -right-11 grid size-9 place-items-center rounded-[10px] border border-line bg-panel text-muted"
              aria-label="Close navigation"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

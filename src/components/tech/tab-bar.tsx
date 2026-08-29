"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, User, Users } from "lucide-react";
import { cn } from "@/components/ui";

const TABS = [
  { href: "/app", label: "Jobs", icon: ClipboardList },
  { href: "/app/schedule", label: "Calendar", icon: CalendarDays },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/profile", label: "Profile", icon: User },
];

export function TechTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 z-30 w-full max-w-md border-t border-line bg-rail/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition",
                  active ? "text-brand" : "text-faint hover:text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.3 : 1.9} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

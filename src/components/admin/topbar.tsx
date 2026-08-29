"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Plus, Search } from "lucide-react";
import { Button, cn } from "@/components/ui";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/calendar": { title: "Calendar", subtitle: "Plan the week and keep the bays full." },
  "/jobs": { title: "Jobs", subtitle: "Every booking, from request to invoice." },
  "/customers": { title: "Customers", subtitle: "Who they are, what they drive, what they spend." },
  "/vehicles": { title: "Vehicles", subtitle: "Full service history for every car you touch." },
  "/quotes": { title: "Quotes", subtitle: "Send estimates and turn them into jobs." },
  "/invoices": { title: "Invoices", subtitle: "Get paid faster, chase less." },
  "/products": { title: "Products", subtitle: "Chemicals, coatings and consumables." },
  "/employees": { title: "Employees", subtitle: "Your team, their hours and their output." },
  "/reports": { title: "Reports", subtitle: "Know your business." },
  "/settings": { title: "Settings", subtitle: "Business details, hours and booking rules." },
};

interface SearchHit {
  type: string;
  label: string;
  sub: string;
  href: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "warn" | "danger" | "brand";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Topbar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDashboard = pathname === "/dashboard";
  const meta = TITLES[pathname] ?? Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1];

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setNewOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 30);
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setHits(d.results ?? []))
        .catch(() => setHits([]));
    }, 160);
    return () => clearTimeout(t);
  }, [query]);

  // Results belong to the last non-empty query, so hide them once it is cleared.
  const visibleHits = query.trim() ? hits : [];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 px-5 py-4 backdrop-blur-xl lg:px-7">
      <div className="flex items-start gap-4 pl-11 lg:pl-0">
        <div className="min-w-0 flex-1">
          {isDashboard ? (
            <>
              <h1 className="truncate text-[22px] font-semibold tracking-tight lg:text-2xl">
                {greeting()}, {userName.split(" ")[0]}! <span className="align-middle">👋</span>
              </h1>
              <p className="mt-0.5 text-[13px] text-muted">Here&apos;s what&apos;s happening with your business today.</p>
            </>
          ) : (
            <>
              <h1 className="truncate text-[22px] font-semibold tracking-tight lg:text-2xl">{meta?.title ?? "DetailFlow"}</h1>
              <p className="mt-0.5 text-[13px] text-muted">{meta?.subtitle}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            title="Search (⌘K)"
            aria-label="Search"
            className="grid size-9 place-items-center rounded-[10px] text-muted transition hover:bg-raised hover:text-fg"
          >
            <Search className="size-4.5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-[10px] text-muted transition hover:bg-raised hover:text-fg"
            >
              <Bell className="size-4.5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-canvas" />
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-80 animate-in overflow-hidden rounded-[14px] border border-line bg-panel shadow-2xl shadow-black/50">
                  <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">Notifications</div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-muted">You&apos;re all caught up.</p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <Link
                            href={n.href}
                            onClick={() => setNotifOpen(false)}
                            className="flex gap-3 border-b border-line-soft px-4 py-3 transition last:border-0 hover:bg-raised"
                          >
                            <span
                              className={cn(
                                "mt-1.5 size-2 shrink-0 rounded-full",
                                n.tone === "danger" ? "bg-danger" : n.tone === "warn" ? "bg-warn" : "bg-brand",
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block text-[13px] font-medium">{n.title}</span>
                              <span className="block text-[12px] text-muted">{n.body}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <Button onClick={() => setNewOpen((v) => !v)} className="shrink-0">
              <Plus className="size-4" /> New
            </Button>
            {newOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNewOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-48 animate-in overflow-hidden rounded-[12px] border border-line bg-panel py-1 shadow-2xl shadow-black/50">
                  {[
                    ["New job", "/jobs/new"],
                    ["New customer", "/customers/new"],
                    ["New quote", "/quotes/new"],
                    ["New invoice", "/invoices/new"],
                    ["New vehicle", "/vehicles/new"],
                  ].map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setNewOpen(false)}
                      className="block px-4 py-2 text-[13px] text-muted transition hover:bg-raised hover:text-fg"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onClick={() => setSearchOpen(false)}>
          <div
            className="w-full max-w-xl animate-in overflow-hidden rounded-[16px] border border-line bg-panel shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4.5 shrink-0 text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers, jobs, vehicles, invoices…"
                className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-faint"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {visibleHits.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted">
                  {query.trim() ? "No matches." : "Start typing to search everything."}
                </p>
              ) : (
                visibleHits.map((hit) => (
                  <button
                    key={`${hit.type}-${hit.href}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      router.push(hit.href);
                    }}
                    className="flex w-full items-center gap-3 border-b border-line-soft px-4 py-3 text-left transition last:border-0 hover:bg-raised"
                  >
                    <span className="rounded-md border border-line bg-raised px-1.5 py-0.5 text-[10px] tracking-wide text-faint uppercase">
                      {hit.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{hit.label}</span>
                      <span className="block truncate text-[12px] text-muted">{hit.sub}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

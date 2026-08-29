"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/components/ui";

/** Search box that writes straight into the URL so pages stay server-rendered. */
export function SearchInput({ placeholder = "Search…", param = "q" }: { placeholder?: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(param) ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set(param, value.trim());
      else next.delete(param);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[10px] border border-line bg-raised py-2 pr-3 pl-9 text-[13px] text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
    </div>
  );
}

export interface TabOption {
  value: string;
  label: string;
  count?: number;
}

/** Segmented filter rendered as links, so the state lives in the URL. */
export function FilterTabs({
  options,
  active,
  param = "status",
  basePath,
}: {
  options: TabOption[];
  active: string;
  param?: string;
  basePath?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const path = basePath ?? pathname;

  return (
    <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-[10px] border border-line bg-raised p-0.5">
      {options.map((option) => {
        const next = new URLSearchParams(params.toString());
        if (option.value === "all") next.delete(param);
        else next.set(param, option.value);
        const query = next.toString();
        const isActive = active === option.value;
        return (
          <Link
            key={option.value}
            href={query ? `${path}?${query}` : path}
            scroll={false}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
              isActive ? "bg-brand text-white" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("text-[11px]", isActive ? "text-white/75" : "text-faint")}>{option.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function SelectFilter({
  param,
  options,
  placeholder,
}: {
  param: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(param) ?? "";

  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
      className="rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] text-fg focus:border-brand focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

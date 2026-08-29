import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/ui";

/**
 * Page links that preserve the current filters. Rendered server side so the
 * lists stay static-friendly.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  // A short window around the current page keeps the control compact.
  const window = [page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages);
  const numbers = [...new Set([1, ...window, pages])].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-[12px] text-muted tabular-nums">
        {first}–{last} of {total}
      </p>
      <nav className="flex items-center gap-1">
        <PageLink href={href(page - 1)} disabled={page === 1} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageLink>
        {numbers.map((number, index) => (
          <span key={number} className="flex items-center gap-1">
            {index > 0 && number - numbers[index - 1] > 1 && <span className="px-1 text-[12px] text-faint">…</span>}
            <Link
              href={href(number)}
              scroll={false}
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[12.5px] font-medium transition tabular-nums",
                number === page ? "bg-brand text-white" : "border border-line bg-raised text-muted hover:text-fg",
              )}
            >
              {number}
            </Link>
          </span>
        ))}
        <PageLink href={href(page + 1)} disabled={page === pages} label="Next page">
          <ChevronRight className="size-4" />
        </PageLink>
      </nav>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-hidden className="grid size-8 place-items-center rounded-lg border border-line-soft text-faint/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg border border-line bg-raised text-muted transition hover:text-fg"
    >
      {children}
    </Link>
  );
}

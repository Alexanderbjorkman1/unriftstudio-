import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card, cn } from "@/components/ui";

const TILES = {
  blue: "bg-brand/15 text-brand",
  green: "bg-success/15 text-success",
  amber: "bg-warn/15 text-warn",
  violet: "bg-violet/15 text-violet",
  cyan: "bg-cyan/15 text-cyan",
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = "blue",
  delta,
  deltaLabel,
  footnote,
  href,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: keyof typeof TILES;
  delta?: number;
  deltaLabel?: string;
  footnote?: string;
  href?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  const body = (
    <Card className="h-full px-4 py-4 transition hover:border-line/80 hover:bg-[#131926]">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid size-9 place-items-center rounded-[10px]", TILES[tone])}>{icon}</div>
      </div>
      <p className="mt-3 text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">{label}</p>
      <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{value}</p>
      {delta !== undefined ? (
        <p className={cn("mt-2 flex items-center gap-1 text-[12px]", positive ? "text-success" : "text-danger")}>
          {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          <span className="font-medium">
            {positive ? "+" : ""}
            {delta}
            {deltaLabel?.includes("%") ? "%" : ""}
          </span>
          <span className="text-muted">{deltaLabel?.replace("%", "").trim()}</span>
        </p>
      ) : (
        footnote && <p className="mt-2 text-[12px] text-muted">{footnote}</p>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

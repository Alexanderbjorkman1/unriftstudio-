"use client";

import { useState } from "react";
import { Card, cn } from "@/components/ui";
import { LineChart } from "@/components/charts/line-chart";
import { money, moneyShort } from "@/lib/format";
import type { Point } from "@/lib/repo/stats";

/** Revenue card with a week / 30-day toggle. One series, so no legend. */
export function RevenueOverview({ week, month }: { week: Point[]; month: Point[] }) {
  const [range, setRange] = useState<"week" | "month">("week");
  const data = range === "week" ? week : month;
  const total = data.reduce((sum, p) => sum + p.value, 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
        <div>
          <h2 className="text-[15px] font-semibold">Revenue overview</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {money(total)} completed {range === "week" ? "this week" : "in 30 days"}
          </p>
        </div>
        <div className="flex rounded-lg border border-line bg-raised p-0.5">
          {(["week", "month"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                range === value ? "bg-brand text-white" : "text-muted hover:text-fg",
              )}
            >
              {value === "week" ? "This week" : "30 days"}
            </button>
          ))}
        </div>
      </div>
      <div className="px-2 pt-2 pb-3">
        <LineChart
          data={data.map((p) => ({ label: p.label, value: p.value }))}
          height={228}
          formatValue={(v) => money(v)}
          formatTick={(v) => moneyShort(v)}
        />
      </div>
    </Card>
  );
}

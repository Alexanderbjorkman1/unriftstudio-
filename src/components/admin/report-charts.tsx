"use client";

import { Card, CardHeader } from "@/components/ui";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { money, moneyShort } from "@/lib/format";
import type { Point } from "@/lib/repo/stats";

export function ReportCharts({ daily, monthly }: { daily: Point[]; monthly: Point[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Daily revenue" />
        <div className="px-2 pb-4">
          <LineChart
            data={daily.map((p) => ({ label: p.label, value: p.value }))}
            height={240}
            formatValue={(v) => money(v)}
            formatTick={(v) => moneyShort(v)}
          />
        </div>
      </Card>
      <Card>
        <CardHeader title="Revenue by month" />
        <div className="px-2 pb-4">
          <BarChart
            data={monthly.map((p) => ({ label: p.label, value: p.value }))}
            height={240}
            formatValue={(v) => money(v)}
            formatTick={(v) => moneyShort(v)}
          />
        </div>
      </Card>
    </section>
  );
}

"use client";

import { useState } from "react";
import { niceScale, useSize } from "./use-size";
import { AXIS_TEXT, GRID } from "./palette";

export interface Bar {
  label: string;
  value: number;
  color?: string;
  /** Pre-formatted value; lets server components pass strings instead of functions. */
  display?: string;
}

/** Vertical bars with rounded data-ends anchored to the baseline. */
export function BarChart({
  data,
  height = 210,
  color = "#2563EB",
  formatValue = (v: number) => String(v),
  formatTick = (v: number) => String(v),
}: {
  data: Bar[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  formatTick?: (value: number) => string;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padding = { top: 16, right: 8, bottom: 26, left: 42 };
  const innerW = Math.max(0, width - padding.left - padding.right);
  const innerH = height - padding.top - padding.bottom;
  const scale = niceScale(Math.max(...data.map((d) => d.value), 0));
  const slot = data.length ? innerW / data.length : 0;
  const barW = Math.max(6, Math.min(38, slot - 10));

  if (!width) return <div ref={ref} style={{ height }} />;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <svg width={width} height={height} role="img" aria-label="Bar chart">
        {scale.ticks.map((tick) => {
          const y = padding.top + innerH - (tick / scale.max) * innerH;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={padding.left - 10} y={y + 3.5} textAnchor="end" fontSize="10" fill={AXIS_TEXT}>
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = scale.max ? (d.value / scale.max) * innerH : 0;
          const x = padding.left + i * slot + (slot - barW) / 2;
          const y = padding.top + innerH - h;
          return (
            <g key={d.label + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padding.left + i * slot} y={padding.top} width={slot} height={innerH} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, d.value > 0 ? 2 : 0)}
                rx="4"
                fill={d.color ?? color}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line bg-raised px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-fg shadow-lg shadow-black/40"
          style={{
            left: Math.min(Math.max(padding.left + hover * slot + slot / 2, 46), width - 46),
            top: Math.max(padding.top + innerH - (data[hover].value / scale.max) * innerH - 32, 0),
          }}
        >
          {formatValue(data[hover].value)}
          <span className="ml-1.5 font-normal text-muted">{data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal bars with the category name printed on the bar itself, so identity
 * never rests on colour alone.
 */
export function HBarChart({ data }: { data: Bar[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-fg">{d.label}</span>
            <span className="shrink-0 font-medium text-muted tabular-nums">{d.display ?? d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: d.color ?? "#2563EB" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

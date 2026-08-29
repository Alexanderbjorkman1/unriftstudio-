"use client";

import { useMemo, useState } from "react";
import { niceScale, useSize } from "./use-size";
import { AXIS_TEXT, GRID } from "./palette";

export interface Series {
  label: string;
  value: number;
}

/**
 * Single-series revenue line with an area wash, a recessive grid and a
 * crosshair tooltip. One series, so no legend — the card title names it.
 */
export function LineChart({
  data,
  height = 210,
  color = "#3b82f6",
  formatValue = (v: number) => String(v),
  formatTick = (v: number) => String(v),
}: {
  data: Series[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  formatTick?: (value: number) => string;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padding = { top: 18, right: 12, bottom: 26, left: 42 };
  const innerW = Math.max(0, width - padding.left - padding.right);
  const innerH = height - padding.top - padding.bottom;

  const scale = useMemo(() => niceScale(Math.max(...data.map((d) => d.value), 0)), [data]);

  const points = useMemo(() => {
    if (!innerW || data.length === 0) return [];
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    return data.map((d, i) => ({
      ...d,
      x: padding.left + i * stepX,
      y: padding.top + innerH - (d.value / scale.max) * innerH,
    }));
  }, [data, innerW, innerH, scale.max, padding.left, padding.top]);

  if (!points.length) return <div ref={ref} style={{ height }} />;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points.at(-1)!.x},${padding.top + innerH} L${points[0].x},${padding.top + innerH} Z`;
  // Thin out labels and dots so a 90-day series stays legible.
  const labelStep = Math.max(1, Math.ceil(data.length / 9));
  const dotStep = data.length > 40 ? Math.max(1, Math.ceil(data.length / 30)) : 1;
  const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const active = hover ?? peakIndex;
  const activePoint = points[active];

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const stepX = data.length > 1 ? innerW / (data.length - 1) : 1;
          const index = Math.round((x - padding.left) / stepX);
          setHover(Math.min(data.length - 1, Math.max(0, index)));
        }}
        role="img"
        aria-label="Revenue over time"
      >
        <defs>
          <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

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

        <path d={areaPath} fill="url(#line-fill)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {activePoint && (
          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="3 3"
          />
        )}

        {points.map((p, i) => (
          i % dotStep !== 0 && i !== active && i !== points.length - 1 ? null : <circle
            key={p.label + i}
            cx={p.x}
            cy={p.y}
            r={i === active ? 5 : 3.5}
            fill={i === active ? color : "#0b0f17"}
            stroke={color}
            strokeWidth="2"
          />
        ))}

        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <text key={`x-${i}`} x={p.x} y={height - 8} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
              {p.label}
            </text>
          ) : null,
        )}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line bg-raised px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-fg shadow-lg shadow-black/40"
          style={{
            left: Math.min(Math.max(activePoint.x, 44), width - 44),
            top: Math.max(activePoint.y - 34, 0),
          }}
        >
          {formatValue(activePoint.value)}
          <span className="ml-1.5 font-normal text-muted">{activePoint.label}</span>
        </div>
      )}
    </div>
  );
}

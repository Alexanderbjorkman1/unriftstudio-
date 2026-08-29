"use client";

import { SPLIT } from "./palette";

export interface Slice {
  label: string;
  value: number;
  color?: string;
}

/**
 * Two-to-three way split with a centred headline. Every slice is also listed
 * with its name and value, so the colours are a secondary encoding.
 */
export function DonutChart({
  data,
  size = 148,
  centerLabel,
  centerValue,
  formatValue = (v: number) => String(v),
}: {
  data: Slice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;

  // Arc lengths and their running offsets, computed before render.
  const arcs = data.reduce<Array<{ dash: number; offset: number }>>((acc, slice) => {
    const dash = (total ? slice.value / total : 0) * circumference;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ dash, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} role="img" aria-label={centerLabel ?? "Breakdown"}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <circle r={radius} fill="none" stroke="#161d29" strokeWidth="14" />
          {data.map((slice, i) => {
            const { dash, offset } = arcs[i];
            return (
              <circle
                key={slice.label}
                r={radius}
                fill="none"
                stroke={slice.color ?? SPLIT[i % SPLIT.length]}
                strokeWidth="14"
                strokeDasharray={`${Math.max(dash - 3, 0)} ${circumference - Math.max(dash - 3, 0)}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
          })}
        </g>
        {(centerValue || centerLabel) && (
          <>
            <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="18" fontWeight="600" fill="#e8edf5">
              {centerValue}
            </text>
            <text x={size / 2} y={size / 2 + 15} textAnchor="middle" fontSize="10" fill="#8b95a7">
              {centerLabel}
            </text>
          </>
        )}
      </svg>

      <ul className="min-w-[140px] flex-1 space-y-2">
        {data.map((slice, i) => (
          <li key={slice.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: slice.color ?? SPLIT[i % SPLIT.length] }} />
            <span className="flex-1 truncate text-muted">{slice.label}</span>
            <span className="font-medium tabular-nums">{formatValue(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

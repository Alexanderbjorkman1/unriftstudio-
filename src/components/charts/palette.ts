/**
 * Chart palette, validated for the dark chart surface (#10151f) with
 * scripts/validate_palette.js from the dataviz guidance:
 * lightness band, chroma floor, adjacent-pair CVD separation, contrast — all pass
 * in this exact order. Assign slots in order; never cycle or reorder.
 */
export const CATEGORICAL = [
  "#2563EB", // blue
  "#16A34A", // green
  "#9333EA", // purple
  "#D97706", // amber
  "#0891B2", // cyan
  "#DB2777", // pink
] as const;

/** Two-way splits (e.g. online vs in-shop) — validated all-pairs. */
export const SPLIT = ["#2563EB", "#D97706"] as const;

/** Single-hue sequential ramp for magnitude-only breakdowns. */
export const SEQUENTIAL = ["#1e3a8a", "#1d4ed8", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd"] as const;

export const CHART_SURFACE = "#10151f";
export const GRID = "#1e2635";
export const AXIS_TEXT = "#5d6779";

export function seqColor(index: number, total: number) {
  if (total <= 1) return SEQUENTIAL[2];
  const step = Math.round((index / (total - 1)) * (SEQUENTIAL.length - 1));
  return SEQUENTIAL[Math.min(SEQUENTIAL.length - 1, step)];
}

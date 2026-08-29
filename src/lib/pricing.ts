import type { VehicleCondition, VehicleSize } from "./types";

export interface PricingRules {
  onsite_fee: number;
  condition_surcharge: Record<VehicleCondition, number>;
  size_multiplier: Record<VehicleSize, number>;
}

export interface PriceBreakdown {
  base: number;
  sizeAdjustment: number;
  conditionAdjustment: number;
  travelFee: number;
  total: number;
  durationMin: number;
}

/**
 * Pure pricing rules, shared by the booking wizard (client) and the server, so
 * the quote a customer sees is exactly what gets stored on the job.
 */
export function computePrice(
  basePrice: number,
  durationMin: number,
  size: VehicleSize,
  condition: VehicleCondition,
  onsite: boolean,
  rules: PricingRules,
): PriceBreakdown {
  const sized = Math.round(basePrice * (rules.size_multiplier[size] ?? 1));
  const conditionAdjustment = Math.round((sized * (rules.condition_surcharge[condition] ?? 0)) / 100);
  const travelFee = onsite ? rules.onsite_fee : 0;
  const extraMinutes = condition === "very_dirty" ? 60 : condition === "dirty" ? 30 : 0;

  return {
    base: basePrice,
    sizeAdjustment: sized - basePrice,
    conditionAdjustment,
    travelFee,
    total: sized + conditionAdjustment + travelFee,
    durationMin: durationMin + extraMinutes,
  };
}

import { cn } from "./ui";

export type BodyStyle = "sedan" | "suv" | "coupe" | "wagon" | "hatch";

const SUV_MODELS = /xc90|xc60|x5|x3|q7|q5|rav4|model y|model x|ev6|tiguan|gle|glc|suv|touareg|cayenne|kodiaq/i;
const COUPE_MODELS = /911|coupe|\bgt\b|m4|m2|tt|corvette|supra|mustang|cayman|z4/i;
const WAGON_MODELS = /v60|v70|v90|estate|touring|avant|kombi|allroad|passat/i;
const HATCH_MODELS = /golf|polo|fiesta|corsa|yaris|i20|clio|ceed|leaf|zoe|id\.3|cooper|up!/i;

/** Picks a silhouette from the model name so every vehicle gets sensible art. */
export function bodyStyleFor(make?: string | null, model?: string | null): BodyStyle {
  const text = `${make ?? ""} ${model ?? ""}`;
  if (SUV_MODELS.test(text)) return "suv";
  if (WAGON_MODELS.test(text)) return "wagon";
  if (COUPE_MODELS.test(text)) return "coupe";
  if (HATCH_MODELS.test(text)) return "hatch";
  return "sedan";
}

/**
 * Side profiles are generated from a handful of control points rather than
 * hand-drawn paths, so every body style keeps the same proportions and stays
 * readable down to ~40px wide. Drawn in a 220x92 space.
 */
interface Profile {
  noseX: number;      // front bumper
  tailX: number;      // rear bumper
  beltY: number;      // top of the doors / bottom of the glass
  roofY: number;      // roof line
  roofStart: number;  // where the windscreen meets the roof
  roofEnd: number;    // where the roof meets the rear glass
  screenBase: number; // where the windscreen meets the bonnet
  rearBase: number;   // where the rear glass meets the body
  hoodY: number;      // bonnet height
  bootY: number;      // boot height
  wheels: [number, number];
  wheelR: number;
}

const PROFILES: Record<BodyStyle, Profile> = {
  sedan:  { noseX: 8,  tailX: 212, beltY: 48, roofY: 22, roofStart: 90,  roofEnd: 138, screenBase: 62, rearBase: 166, hoodY: 50, bootY: 50, wheels: [58, 162], wheelR: 23 },
  suv:    { noseX: 10, tailX: 210, beltY: 44, roofY: 14, roofStart: 82,  roofEnd: 172, screenBase: 58, rearBase: 186, hoodY: 46, bootY: 44, wheels: [58, 162], wheelR: 26 },
  coupe:  { noseX: 6,  tailX: 214, beltY: 50, roofY: 24, roofStart: 92,  roofEnd: 124, screenBase: 60, rearBase: 186, hoodY: 52, bootY: 50, wheels: [58, 164], wheelR: 23 },
  wagon:  { noseX: 8,  tailX: 212, beltY: 47, roofY: 20, roofStart: 88,  roofEnd: 182, screenBase: 60, rearBase: 196, hoodY: 49, bootY: 46, wheels: [58, 164], wheelR: 23 },
  hatch:  { noseX: 12, tailX: 206, beltY: 48, roofY: 21, roofStart: 86,  roofEnd: 150, screenBase: 58, rearBase: 176, hoodY: 50, bootY: 48, wheels: [56, 158], wheelR: 23 },
};

const FLOOR = 74;

function bodyPath(p: Profile) {
  return [
    `M${p.noseX},${FLOOR}`,
    `L${p.noseX},${p.hoodY + 6}`,
    `Q${p.noseX},${p.hoodY} ${p.noseX + 12},${p.hoodY - 1}`,
    `L${p.screenBase},${p.hoodY - 4}`,
    `L${p.roofStart},${p.roofY + 3}`,
    `Q${p.roofStart + 4},${p.roofY} ${p.roofStart + 10},${p.roofY}`,
    `L${p.roofEnd},${p.roofY}`,
    `Q${p.roofEnd + 6},${p.roofY} ${p.roofEnd + 10},${p.roofY + 4}`,
    `L${p.rearBase},${p.bootY - 4}`,
    `L${p.tailX - 12},${p.bootY - 1}`,
    `Q${p.tailX},${p.bootY} ${p.tailX},${p.bootY + 8}`,
    `L${p.tailX},${FLOOR}`,
    "Z",
  ].join(" ");
}

function glassPaths(p: Profile) {
  const pillar = (p.roofStart + p.roofEnd) / 2;
  return [
    // windscreen + front door glass
    `M${p.screenBase + 6},${p.beltY} L${p.roofStart + 6},${p.roofY + 6} L${pillar - 3},${p.roofY + 6} L${pillar - 3},${p.beltY} Z`,
    // rear door glass + rear screen
    `M${pillar + 3},${p.roofY + 6} L${p.roofEnd + 4},${p.roofY + 6} L${p.rearBase - 6},${p.beltY} L${pillar + 3},${p.beltY} Z`,
  ];
}

export function CarSilhouette({
  make,
  model,
  body,
  color = "#c7d3e3",
  className,
}: {
  make?: string | null;
  model?: string | null;
  body?: BodyStyle;
  color?: string;
  className?: string;
}) {
  const style = body ?? bodyStyleFor(make, model);
  const p = PROFILES[style];
  const uid = `car-${style}-${color.replace("#", "")}`;
  const label = `${make ?? ""} ${model ?? ""}`.trim() || "Vehicle";

  return (
    <svg viewBox="0 4 220 88" className={cn("h-full w-full", className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${uid}-paint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="60%" stopColor={color} stopOpacity="0.82" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <path d={bodyPath(p)} fill={`url(#${uid}-paint)`} />
      {glassPaths(p).map((d, i) => (
        <path key={i} d={d} fill="#0b1220" fillOpacity="0.72" />
      ))}

      {/* Wheel arches carved out of the body, then the wheels themselves. */}
      {p.wheels.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={FLOOR - 2} r={p.wheelR} fill="#080c14" />
          <circle cx={cx} cy={FLOOR - 2} r={p.wheelR - 6} fill="#222c3e" />
          <circle cx={cx} cy={FLOOR - 2} r={p.wheelR - 12} fill="#0c121c" />
        </g>
      ))}

      <rect x={p.noseX} y={FLOOR - 4} width={p.tailX - p.noseX} height="4" fill="#080c14" />
    </svg>
  );
}

const PAINTS: Record<string, string> = {
  black: "#8fa0b6",
  grey: "#b9c6d6",
  gray: "#b9c6d6",
  silver: "#d2dbe7",
  white: "#e9eff7",
  blue: "#7fa9ef",
  red: "#ef8f8f",
  green: "#7fd3a8",
  yellow: "#efd79a",
};

export function paintFor(make?: string | null, model?: string | null, colorName?: string | null) {
  if (colorName && PAINTS[colorName.toLowerCase()]) return PAINTS[colorName.toLowerCase()];
  // Deterministic tint per vehicle so the same car always looks the same.
  const text = `${make ?? ""}${model ?? ""}`;
  const hash = [...text].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7);
  const palette = ["#b9c6d6", "#d2dbe7", "#9fb0c6", "#aec1da", "#e0e8f2"];
  return palette[hash % palette.length];
}

/** Rounded tile with the silhouette on a subtle gradient — used in lists. */
export function VehicleThumb({
  make,
  model,
  color,
  className,
}: {
  make?: string | null;
  model?: string | null;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line bg-gradient-to-br from-[#182131] to-[#0c121c]",
        className ?? "h-11 w-16",
      )}
    >
      <div className="w-[94%] px-0.5">
        <CarSilhouette make={make} model={model} color={color ?? paintFor(make, model)} />
      </div>
    </div>
  );
}

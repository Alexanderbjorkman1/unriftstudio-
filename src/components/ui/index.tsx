import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[14px] border border-line bg-panel", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-4 pb-3", className)}>
      <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
      {action}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-xs font-medium text-brand transition hover:text-fg">
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- Badges */

const TONES = {
  blue: "bg-brand/15 text-brand border-brand/25",
  green: "bg-success/15 text-success border-success/25",
  amber: "bg-warn/15 text-warn border-warn/25",
  red: "bg-danger/15 text-danger border-danger/25",
  violet: "bg-violet/15 text-violet border-violet/25",
  cyan: "bg-cyan/15 text-cyan border-cyan/25",
  slate: "bg-raised text-muted border-line",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/* --------------------------------------------------------------- Buttons */

const BUTTON_VARIANTS = {
  primary: "bg-brand-strong text-white hover:bg-brand shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]",
  success: "bg-success text-[#052e16] hover:brightness-110 font-semibold",
  secondary: "bg-raised text-fg border border-line hover:border-brand/50 hover:bg-[#1b2432]",
  ghost: "text-muted hover:text-fg hover:bg-raised",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-9.5 px-4 text-[13px] rounded-[10px] gap-2",
  lg: "h-11 px-5 text-sm rounded-xl gap-2",
} as const;

type ButtonLook = {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
};

export function buttonClass({ variant = "primary", size = "md" }: ButtonLook = {}) {
  return cn(
    "inline-flex items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
  );
}

export function Button({
  variant,
  size,
  className,
  ...rest
}: ComponentProps<"button"> & ButtonLook) {
  return <button className={cn(buttonClass({ variant, size }), className)} {...rest} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...rest
}: ComponentProps<typeof Link> & ButtonLook) {
  return <Link className={cn(buttonClass({ variant, size }), className)} {...rest} />;
}

/* ---------------------------------------------------------------- Fields */

export const inputClass =
  "w-full rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] text-fg placeholder:text-faint transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-[84px] resize-y", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "appearance-none bg-[right_0.6rem_center] pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

/* ----------------------------------------------------------------- Table */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] border-collapse text-left text-[13px]", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-line px-4 py-2.5 text-[11px] font-medium tracking-wide text-faint uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line-soft px-4 py-3 align-middle text-fg", className)}>{children}</td>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="mb-1 grid size-11 place-items-center rounded-full bg-raised text-muted">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  color = "#3B82F6",
  size = 32,
  className,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  const label = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, ${color}, ${color}99)`,
      }}
    >
      {label}
    </span>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "warn" }) {
  const colors = { brand: "bg-brand", success: "bg-success", warn: "bg-warn" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[11px] font-semibold tracking-[0.14em] text-faint uppercase", className)}>{children}</h3>
  );
}

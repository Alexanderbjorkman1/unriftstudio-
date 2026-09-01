"use client";

import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import { Card, Field, Input } from "@/components/ui";
import { money } from "@/lib/format";
import type { BusinessSettings } from "@/lib/types";
import type { StripeStatus } from "@/lib/payments/stripe";

export function PaymentsSettings({
  settings,
  stripe,
  exampleJobPrice,
}: {
  settings: BusinessSettings;
  stripe: StripeStatus;
  exampleJobPrice: number;
}) {
  const deposit = Math.round((exampleJobPrice * settings.deposit_percent) / 100);

  return (
    <>
      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Card payments</h2>
        <p className="mb-4 text-[12px] text-muted">
          Keys live in environment variables, not here. Without them the booking site simply asks
          people to pay on the day — nothing breaks.
        </p>

        <div className="rounded-[10px] border border-line bg-raised p-4">
          <div className="flex items-center gap-2">
            {stripe.configured ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <XCircle className="size-4 text-faint" />
            )}
            <span className="text-[13.5px] font-medium">Stripe</span>
            {stripe.configured && (
              <span
                className={
                  stripe.mode === "live"
                    ? "rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success"
                    : "rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[11px] text-warn"
                }
              >
                {stripe.mode} mode
              </span>
            )}
            <span className="ml-auto text-[11px] text-faint">{stripe.configured ? "" : "not set up"}</span>
          </div>

          <p className="mt-2 text-[12px] text-muted">{stripe.hint}</p>

          {!stripe.configured && (
            <p className="mt-2 font-mono text-[11px] text-faint">
              STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
            </p>
          )}

          {stripe.configured && !stripe.webhookReady && (
            <p className="mt-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-warn">
              Point a Stripe webhook at <span className="font-mono">/api/stripe/webhook</span> for the
              event <span className="font-mono">checkout.session.completed</span>, then set
              STRIPE_WEBHOOK_SECRET. Without it a customer can pay and the job will still look unpaid.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Deposit</h2>
        <p className="mb-4 text-[12px] text-muted">
          Taken when someone books online. A deposit cuts no-shows on long jobs; set it to 0 to take
          nothing up front.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deposit percentage" hint="0 means no deposit.">
            <Input
              type="number"
              name="deposit_percent"
              min={0}
              max={100}
              defaultValue={settings.deposit_percent}
            />
          </Field>
          <div className="flex items-end pb-2">
            <p className="flex items-center gap-2 text-[12.5px] text-muted">
              <CreditCard className="size-4 text-faint" />
              {settings.deposit_percent > 0 ? (
                <>
                  A {money(exampleJobPrice)} job would take {money(deposit)} up front.
                </>
              ) : (
                <>Customers pay in full on the day.</>
              )}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[12px] text-muted">
          The booking is saved before the card page opens, so a customer who changes their mind at
          checkout still has the slot reserved and shows up in your diary as unpaid.
        </p>
      </Card>
    </>
  );
}

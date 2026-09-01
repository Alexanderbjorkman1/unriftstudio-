"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, Field, Input, cn } from "@/components/ui";
import { sendTestMessageAction } from "@/lib/actions/messages";
import type { BusinessSettings } from "@/lib/types";

export interface ProviderView {
  configured: boolean;
  provider: string;
  hint: string;
}

export function MessagesSettings({
  settings,
  email,
  sms,
}: {
  settings: BusinessSettings;
  email: ProviderView;
  sms: ProviderView;
}) {
  return (
    <>
      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Delivery</h2>
        <p className="mb-4 text-[12px] text-muted">
          Keys live in environment variables, not in this form — anything saved here is readable by
          the public booking page, so secrets stay out of it.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProviderCard
            title="Email"
            status={email}
            envHint="RESEND_API_KEY"
            channel="email"
            defaultTo={settings.owner_alert_email || settings.email}
          />
          <ProviderCard
            title="SMS"
            status={sms}
            envHint="ELKS_API_USERNAME + ELKS_API_PASSWORD"
            channel="sms"
            defaultTo={settings.phone}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">What gets sent</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-[13px]">
            <input
              type="checkbox"
              name="notify_email_enabled"
              defaultChecked={settings.notify_email_enabled}
              className="mt-0.5 size-4 accent-[#2563eb]"
            />
            <span>
              <span className="block font-medium">Email the customer</span>
              <span className="block text-[12px] text-muted">
                Booking confirmation, a reminder before the day, and a note when the car is ready.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-[13px]">
            <input
              type="checkbox"
              name="notify_sms_enabled"
              defaultChecked={settings.notify_sms_enabled}
              className="mt-0.5 size-4 accent-[#2563eb]"
            />
            <span>
              <span className="block font-medium">Text the customer</span>
              <span className="block text-[12px] text-muted">
                Confirmation and reminder by SMS. Costs money per message — worth it for no-shows.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Send email as" hint="Must be a domain you have verified with your email provider.">
            <Input name="email_from" defaultValue={settings.email_from} placeholder="Your Shop <bookings@yourshop.se>" />
          </Field>
          <Field label="SMS sender name" hint="Up to 11 characters, letters and digits.">
            <Input name="sms_sender" defaultValue={settings.sms_sender} maxLength={11} placeholder="YourShop" />
          </Field>
          <Field label="Remind the customer" hint="Hours before the booking.">
            <Input type="number" name="reminder_hours_before" min={1} max={168} defaultValue={settings.reminder_hours_before} />
          </Field>
          <Field label="Alert me at" hint="Where new online bookings are emailed. Leave blank for none.">
            <Input type="email" name="owner_alert_email" defaultValue={settings.owner_alert_email} placeholder="you@yourshop.se" />
          </Field>
        </div>

        <p className="mt-4 text-[12px] text-muted">
          Every message is recorded in the{" "}
          <Link href="/messages" className="text-brand hover:text-fg">
            message log
          </Link>
          , including ones that could not be delivered, so nothing disappears silently.
        </p>
      </Card>
    </>
  );
}

function ProviderCard({
  title,
  status,
  envHint,
  channel,
  defaultTo,
}: {
  title: string;
  status: ProviderView;
  envHint: string;
  channel: "email" | "sms";
  defaultTo: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="rounded-[10px] border border-line bg-raised p-4">
      <div className="flex items-center gap-2">
        {status.configured ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <XCircle className="size-4 text-faint" />
        )}
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className="ml-auto text-[11px] text-faint">
          {status.configured ? status.provider : "not set up"}
        </span>
      </div>

      <p className="mt-2 text-[12px] text-muted">{status.hint}</p>

      {!status.configured && (
        <p className="mt-2 font-mono text-[11px] text-faint">{envHint}</p>
      )}

      {status.configured && (
        <div className="mt-3 flex gap-2">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={channel === "email" ? "you@yourshop.se" : "070-123 45 67"}
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setResult(await sendTestMessageAction(channel, to));
              })
            }
            className="shrink-0 rounded-lg border border-line bg-panel px-3 text-[12.5px] font-medium transition hover:border-brand/50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Send test"}
          </button>
        </div>
      )}

      {result && (
        <p className={cn("mt-2 text-[12px]", result.ok ? "text-success" : "text-danger")}>{result.message}</p>
      )}
    </div>
  );
}

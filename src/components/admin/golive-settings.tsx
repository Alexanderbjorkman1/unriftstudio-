"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Circle, Download, Loader2 } from "lucide-react";
import { Button, Card, Field, Input, cn } from "@/components/ui";
import { clearDemoDataAction, createOwnerAction, disableDemoAccountsAction } from "@/lib/actions/golive";
import type { GoLiveCheck } from "@/lib/actions/golive";
import type { BackupFile } from "@/lib/backup";

type Outcome = { ok: boolean; message: string } | null;

export function GoLiveSettings({ checks, backups }: { checks: GoLiveCheck[]; backups: BackupFile[] }) {
  const done = checks.filter((c) => c.done).length;

  return (
    <>
      <Card className="p-5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Before real customers use this</h2>
          <span className="text-[12px] text-muted tabular-nums">
            {done} of {checks.length} done
          </span>
        </div>
        <p className="mb-4 text-[12px] text-muted">
          Each line is checked against your actual data, not ticked off by hand.
        </p>

        <ul className="space-y-2.5">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-3">
              {check.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-faint" />
              )}
              <span className="min-w-0">
                <span className={cn("block text-[13.5px]", check.done ? "text-muted" : "font-medium text-fg")}>
                  {check.label}
                </span>
                <span className="block text-[12px] text-faint">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <CreateOwner />
      <DisableDemos />
      <ClearDemoData />
      <Backups backups={backups} />
    </>
  );
}

function CreateOwner() {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-[15px] font-semibold">Your own login</h2>
      <p className="mb-4 text-[12px] text-muted">
        Creates a second owner account with a password only you know. Sign in with it, then turn off
        the demo logins below.
      </p>

      <form
        action={(formData) =>
          startTransition(async () => {
            setOutcome(await createOwnerAction(formData));
            router.refresh();
          })
        }
        className="grid gap-4 sm:grid-cols-3"
      >
        <Field label="Your name">
          <Input name="name" required placeholder="Alexander Björkman" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@yourshop.se" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create my account
          </Button>
        </div>
      </form>

      {outcome && <Result outcome={outcome} />}
    </Card>
  );
}

function DisableDemos() {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-[15px] font-semibold">Turn off the demo logins</h2>
      <p className="mb-4 text-[12px] text-muted">
        The three demo accounts and their passwords are written in this project&apos;s README, so
        anyone who finds your address could sign in. This disables them and ends their sessions. It
        refuses to run until you have your own owner account.
      </p>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setOutcome(await disableDemoAccountsAction());
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Disable demo accounts
      </Button>
      {outcome && <Result outcome={outcome} />}
    </Card>
  );
}

function ClearDemoData() {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card className="border-danger/25 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
        <AlertTriangle className="size-4 text-danger" />
        Clear the demo bookings
      </h2>
      <p className="mb-4 text-[12px] text-muted">
        Deletes every invented customer, vehicle, job, invoice, quote and photo, so you start from an
        empty diary. Your services, products, staff and settings are kept. A backup is taken first,
        automatically.
      </p>

      <form
        action={(formData) =>
          startTransition(async () => {
            setOutcome(await clearDemoDataAction(formData));
            router.refresh();
          })
        }
        className="flex flex-wrap items-end gap-3"
      >
        <Field label="Type CLEAR to confirm" className="w-48">
          <Input name="confirm" placeholder="CLEAR" autoComplete="off" />
        </Field>
        <Button type="submit" variant="danger" disabled={pending} className="mb-0.5">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Clear demo data
        </Button>
      </form>

      {outcome && <Result outcome={outcome} />}
    </Card>
  );
}

function Backups({ backups }: { backups: BackupFile[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-1 text-[15px] font-semibold">Backups</h2>
      <p className="mb-4 text-[12px] text-muted">
        A snapshot is taken automatically once a day and the last 14 are kept. Download one now and
        again and keep it somewhere else — a backup on the same machine does not survive that machine
        dying.
      </p>

      {backups.length === 0 ? (
        <p className="text-[13px] text-muted">No snapshots yet. The first is taken within a day of running.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {backups.slice(0, 8).map((backup) => (
            <li key={backup.name} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12px]">{backup.name}</span>
                <span className="block text-[11px] text-faint">
                  {new Date(backup.takenAt).toLocaleString("en-GB")} · {(backup.size / 1024).toFixed(0)} kB
                </span>
              </span>
              <a
                href={`/api/backups/${encodeURIComponent(backup.name)}`}
                download
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-[12.5px] font-medium transition hover:border-brand/50"
              >
                <Download className="size-3.5" /> Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Result({ outcome }: { outcome: NonNullable<Outcome> }) {
  return (
    <p
      className={cn(
        "mt-4 rounded-[10px] border px-3 py-2 text-[13px]",
        outcome.ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {outcome.message}
    </p>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { setInvoiceStatusAction } from "@/lib/actions/billing";
import { setQuoteStatusAction } from "@/lib/actions/billing";
import type { InvoiceStatus, QuoteStatus } from "@/lib/types";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer className="size-4" /> Print / PDF
    </Button>
  );
}

export function InvoiceStatusActions({ id, status }: { id: number; status: InvoiceStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const steps: Array<{ next: InvoiceStatus; label: string; variant: "primary" | "success" | "secondary" }> =
    status === "paid"
      ? [{ next: "sent", label: "Mark unpaid", variant: "secondary" }]
      : status === "draft"
        ? [
            { next: "sent", label: "Send invoice", variant: "primary" },
            { next: "paid", label: "Mark paid", variant: "success" },
          ]
        : [{ next: "paid", label: "Mark paid", variant: "success" }];

  return (
    <>
      {steps.map((step) => (
        <Button
          key={step.next}
          variant={step.variant}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setInvoiceStatusAction(id, step.next);
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {step.label}
        </Button>
      ))}
    </>
  );
}

export function QuoteStatusActions({ id, status }: { id: number; status: QuoteStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const steps: Array<{ next: QuoteStatus; label: string; variant: "primary" | "success" | "secondary" | "danger" }> =
    status === "draft"
      ? [{ next: "sent", label: "Send quote", variant: "primary" }]
      : status === "sent"
        ? [
            { next: "accepted", label: "Mark accepted", variant: "success" },
            { next: "declined", label: "Mark declined", variant: "danger" },
          ]
        : [{ next: "sent", label: "Reopen", variant: "secondary" }];

  return (
    <>
      {steps.map((step) => (
        <Button
          key={step.next}
          variant={step.variant}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setQuoteStatusAction(id, step.next);
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {step.label}
        </Button>
      ))}
    </>
  );
}

export function ConvertQuoteButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="success" disabled={pending} onClick={() => startTransition(async () => void (await action()))}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      Convert to job
    </Button>
  );
}

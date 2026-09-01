"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw, Send, X } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteMessageAction, retryMessageAction, sendNowAction } from "@/lib/actions/messages";

export function SendNowButton({ hasPending }: { hasPending: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState("");
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-[12px] text-muted">{result}</span>}
      <Button
        variant="secondary"
        disabled={pending || !hasPending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await sendNowAction();
            setResult(
              outcome.sent
                ? `Sent ${outcome.sent}.`
                : outcome.skipped
                  ? `${outcome.skipped} waiting on provider keys.`
                  : "Nothing due.",
            );
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send queued now
      </Button>
    </div>
  );
}

export function MessageActions({ id, status }: { id: number; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const retryable = status === "failed" || status === "skipped";

  return (
    <span className="flex justify-end gap-1">
      {retryable && (
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await retryMessageAction(id);
              router.refresh();
            })
          }
          className="grid size-7 place-items-center rounded-lg text-faint transition hover:bg-raised hover:text-brand"
          aria-label="Try sending again"
          title="Try sending again"
        >
          <RotateCw className="size-3.5" />
        </button>
      )}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteMessageAction(id);
            router.refresh();
          })
        }
        className="grid size-7 place-items-center rounded-lg text-faint transition hover:bg-raised hover:text-danger"
        aria-label="Delete message"
        title="Delete"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

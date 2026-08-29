"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

/** Destructive action with an inline confirm step — no dialog library needed. */
export function DeleteButton({
  action,
  label = "Delete",
  confirmLabel = "Confirm delete",
  size = "md",
}: {
  action: () => Promise<void> | void;
  label?: string;
  confirmLabel?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size={size}
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        startTransition(async () => {
          await action();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {armed ? confirmLabel : label}
    </Button>
  );
}

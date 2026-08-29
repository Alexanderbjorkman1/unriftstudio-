"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button, Card, CardHeader, Progress, cn } from "@/components/ui";
import {
  addChecklistItemAction, addNoteAction, removeChecklistItemAction, setJobStatusAction, toggleChecklistAction,
} from "@/lib/actions/jobs";
import type { ChecklistItem, JobNote, JobPhoto, JobStatus } from "@/lib/types";
import { formatDate, stampTime } from "@/lib/dates";

/* --------------------------------------------------------------- Checklist */

export function ChecklistPanel({
  jobId,
  items,
  editable = true,
  compact = false,
}: {
  jobId: number;
  items: ChecklistItem[];
  editable?: boolean;
  compact?: boolean;
}) {
  const [rows, setRows] = useState(items);
  const [label, setLabel] = useState("");
  const [, startTransition] = useTransition();
  const done = rows.filter((r) => r.done).length;

  function toggle(item: ChecklistItem) {
    const next = !item.done;
    setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, done: next ? 1 : 0 } : r)));
    startTransition(() => {
      void toggleChecklistAction(item.id, next, jobId);
    });
  }

  function add() {
    const text = label.trim();
    if (!text) return;
    setLabel("");
    const optimistic: ChecklistItem = { id: Date.now(), job_id: jobId, label: text, done: 0, sort_order: rows.length };
    setRows((prev) => [...prev, optimistic]);
    startTransition(() => {
      void addChecklistItemAction(jobId, text);
    });
  }

  function remove(item: ChecklistItem) {
    setRows((prev) => prev.filter((r) => r.id !== item.id));
    startTransition(() => {
      void removeChecklistItemAction(item.id, jobId);
    });
  }

  return (
    <div className={compact ? "" : "p-5 pt-0"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted">
          {done} of {rows.length} completed
        </span>
        <span className="text-[12px] font-medium tabular-nums">
          {rows.length ? Math.round((done / rows.length) * 100) : 0}%
        </span>
      </div>
      <Progress value={rows.length ? (done / rows.length) * 100 : 0} tone={done === rows.length ? "success" : "brand"} />

      <ul className="mt-3 space-y-1">
        {rows.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-raised">
            <button
              onClick={() => toggle(item)}
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-[6px] border transition",
                item.done ? "border-success bg-success text-[#052e16]" : "border-line bg-raised hover:border-brand",
              )}
              aria-label={item.done ? `Mark ${item.label} not done` : `Mark ${item.label} done`}
            >
              {item.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </button>
            <span className={cn("flex-1 text-[13px]", item.done ? "text-faint line-through" : "text-fg")}>
              {item.label}
            </span>
            {editable && (
              <button
                onClick={() => remove(item)}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label={`Remove ${item.label}`}
              >
                <X className="size-3.5 text-faint hover:text-danger" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <div className="mt-3 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="Add a step…"
            className="flex-1 rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <Button type="button" variant="secondary" onClick={add}>
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Photos */

export function PhotoPanel({
  jobId,
  photos: initial,
  canDelete = true,
}: {
  jobId: number;
  photos: JobPhoto[];
  canDelete?: boolean;
}) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState<"before" | "after" | null>(null);
  const [error, setError] = useState("");
  const beforeInput = useRef<HTMLInputElement>(null);
  const afterInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(kind: "before" | "after", files: FileList | null) {
    if (!files?.length) return;
    setBusy(kind);
    setError("");
    const body = new FormData();
    body.set("kind", kind);
    Array.from(files).forEach((file) => body.append("file", file));
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setPhotos(data.photos);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const groups: Array<["before" | "after", string, React.RefObject<HTMLInputElement | null>]> = [
    ["before", "Before", beforeInput],
    ["after", "After", afterInput],
  ];

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</p>}
      {groups.map(([kind, title, ref]) => {
        const list = photos.filter((p) => p.kind === kind);
        return (
          <div key={kind}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[12px] font-semibold tracking-wide text-muted uppercase">{title}</h4>
              <button
                onClick={() => ref.current?.click()}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand hover:text-fg disabled:opacity-50"
              >
                {busy === kind ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                Add photos
              </button>
              <input
                ref={ref}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => upload(kind, e.target.files)}
              />
            </div>
            {list.length === 0 ? (
              <button
                onClick={() => ref.current?.click()}
                className="grid h-24 w-full place-items-center rounded-[10px] border border-dashed border-line text-[12px] text-faint transition hover:border-brand/50 hover:text-muted"
              >
                No {title.toLowerCase()} photos yet — tap to add
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((photo) => (
                  <div key={photo.id} className="group relative aspect-4/3 overflow-hidden rounded-[10px] border border-line bg-raised">
                    <Image
                      src={`/api/uploads/${photo.filename}`}
                      alt={`${title} photo`}
                      fill
                      sizes="180px"
                      className="object-cover"
                      unoptimized
                    />
                    {canDelete && (
                      <button
                        onClick={() => remove(photo.id)}
                        className="absolute top-1 right-1 grid size-6 place-items-center rounded-md bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- Notes */

export function NotesPanel({ jobId, notes: initial }: { jobId: number; notes: JobNote[] }) {
  const [notes, setNotes] = useState(initial);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    setNotes((prev) => [
      { id: Date.now(), job_id: jobId, author_id: null, body: text, created_at: new Date().toISOString(), author_name: "You" },
      ...prev,
    ]);
    startTransition(() => {
      void addNoteAction(jobId, text);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note for this job…"
          rows={2}
          className="flex-1 resize-y rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] placeholder:text-faint focus:border-brand focus:outline-none"
        />
        <Button type="button" onClick={submit} disabled={pending || !body.trim()}>
          Post
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-[10px] border border-line bg-raised px-3 py-2.5">
              <p className="text-[13px] whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-[11px] text-faint">
                {note.author_name ?? "Someone"} · {formatDate(note.created_at)} {stampTime(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Status actions */

const FLOW: Record<JobStatus, Array<{ next: JobStatus; label: string; variant: "primary" | "success" | "secondary" | "danger" }>> = {
  booked: [
    { next: "confirmed", label: "Confirm booking", variant: "primary" },
    { next: "cancelled", label: "Cancel", variant: "danger" },
  ],
  confirmed: [
    { next: "in_progress", label: "Start job", variant: "primary" },
    { next: "cancelled", label: "Cancel", variant: "danger" },
  ],
  in_progress: [{ next: "completed", label: "Complete job", variant: "success" }],
  completed: [{ next: "in_progress", label: "Reopen", variant: "secondary" }],
  cancelled: [{ next: "booked", label: "Restore", variant: "secondary" }],
};

export function StatusActions({ jobId, status }: { jobId: number; status: JobStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {FLOW[status].map((step) => (
        <Button
          key={step.next}
          variant={step.variant}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setJobStatusAction(jobId, step.next);
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {step.label}
        </Button>
      ))}
    </div>
  );
}

export function PanelCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={action} />
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}

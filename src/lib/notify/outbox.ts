import { getDb } from "../db";
import { addMinutes, parseStamp, toLocalStamp } from "../dates";
import { getSettings } from "../repo/settings";
import { getJob } from "../repo/jobs";
import {
  emailStatus, normalisePhone, sendEmail, sendSms, smsStatus,
} from "./providers";
import {
  bookingConfirmationEmail, bookingConfirmationSms, jobCompletedEmail, ownerAlertEmail,
  reminderEmail, reminderSms,
} from "./templates";
import type { MessageChannel, MessageKind, OutboxMessage } from "../types";

const MAX_ATTEMPTS = 4;

export interface QueueInput {
  channel: MessageChannel;
  kind: MessageKind;
  recipient: string;
  subject?: string;
  body: string;
  jobId?: number | null;
  customerId?: number | null;
  sendAfter?: string;
  dedupeKey?: string;
}

/** Adds a message to the outbox. A repeated dedupeKey is ignored, not duplicated. */
export function queue(input: QueueInput): number | null {
  if (!input.recipient.trim()) return null;

  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO messages
         (job_id, customer_id, channel, kind, recipient, subject, body, send_after, dedupe_key)
       VALUES (@job_id, @customer_id, @channel, @kind, @recipient, @subject, @body, @send_after, @dedupe_key)`,
    )
    .run({
      job_id: input.jobId ?? null,
      customer_id: input.customerId ?? null,
      channel: input.channel,
      kind: input.kind,
      recipient: input.recipient.trim(),
      subject: input.subject ?? "",
      body: input.body,
      send_after: input.sendAfter ?? toLocalStamp(new Date()),
      dedupe_key: input.dedupeKey ?? null,
    });

  return result.changes ? (result.lastInsertRowid as number) : null;
}

/**
 * Sends everything currently due. Safe to call often — it only picks up
 * messages whose send_after has passed and that have attempts left.
 */
export async function processOutbox(limit = 20) {
  const db = getDb();
  const settings = getSettings();
  const now = toLocalStamp(new Date());

  const due = db
    .prepare(
      `SELECT * FROM messages
        WHERE status = 'queued' AND send_after <= ? AND attempts < ?
        ORDER BY send_after LIMIT ?`,
    )
    .all(now, MAX_ATTEMPTS, limit) as OutboxMessage[];

  const email = emailStatus();
  const sms = smsStatus();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const message of due) {
    const providerReady = message.channel === "email" ? email.configured : sms.configured;

    // No provider yet: park it as skipped rather than burning retries. The
    // message stays visible in the log so nothing looks like it vanished.
    if (!providerReady) {
      db.prepare(
        "UPDATE messages SET status = 'skipped', error = ?, provider = 'none' WHERE id = ?",
      ).run(
        message.channel === "email" ? email.hint : sms.hint,
        message.id,
      );
      skipped += 1;
      continue;
    }

    const result =
      message.channel === "email"
        ? await sendEmail({
            to: message.recipient,
            from: settings.email_from || `${settings.business_name} <onboarding@resend.dev>`,
            subject: message.subject,
            text: message.body,
          })
        : await sendSms({
            to: message.recipient,
            from: settings.sms_sender || settings.business_name.slice(0, 11),
            text: message.body,
          });

    if (result.ok) {
      db.prepare(
        "UPDATE messages SET status = 'sent', sent_at = ?, provider = ?, attempts = attempts + 1, error = '' WHERE id = ?",
      ).run(toLocalStamp(new Date()), result.provider, message.id);
      sent += 1;
    } else {
      const attempts = message.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      // Back off: 5, 25, 125 minutes.
      const retryAt = toLocalStamp(addMinutes(new Date(), 5 ** attempts));
      db.prepare(
        `UPDATE messages SET status = ?, attempts = ?, error = ?, provider = ?, send_after = ?
          WHERE id = ?`,
      ).run(
        exhausted ? "failed" : "queued",
        attempts,
        result.error ?? "Unknown error",
        result.provider,
        exhausted ? message.send_after : retryAt,
        message.id,
      );
      failed += 1;
    }
  }

  return { considered: due.length, sent, skipped, failed };
}

/* ------------------------------------------------------- what gets queued */

/** Everything a new booking should trigger: customer confirmation + owner alert. */
export function queueBookingMessages(jobId: number) {
  const job = getJob(jobId);
  if (!job) return;
  const settings = getSettings();

  if (settings.notify_email_enabled && job.customer_email) {
    const composed = bookingConfirmationEmail(job, settings);
    queue({
      channel: "email",
      kind: "booking_confirmation",
      recipient: job.customer_email,
      subject: composed.subject,
      body: composed.body,
      jobId: job.id,
      customerId: job.customer_id,
      dedupeKey: `confirm:email:${job.id}`,
    });
  }

  if (settings.notify_sms_enabled && job.customer_phone) {
    queue({
      channel: "sms",
      kind: "booking_confirmation",
      recipient: normalisePhone(job.customer_phone),
      body: bookingConfirmationSms(job, settings),
      jobId: job.id,
      customerId: job.customer_id,
      dedupeKey: `confirm:sms:${job.id}`,
    });
  }

  if (settings.owner_alert_email) {
    const composed = ownerAlertEmail(job, settings);
    queue({
      channel: "email",
      kind: "owner_alert",
      recipient: settings.owner_alert_email,
      subject: composed.subject,
      body: composed.body,
      jobId: job.id,
      dedupeKey: `owner:${job.id}`,
    });
  }

  queueReminder(jobId);
}

/** Schedules the day-before nudge. No-op if that moment has already passed. */
export function queueReminder(jobId: number) {
  const job = getJob(jobId);
  if (!job || job.status === "cancelled" || job.status === "completed") return;

  const settings = getSettings();
  const sendAt = new Date(parseStamp(job.scheduled_at).getTime() - settings.reminder_hours_before * 3600_000);
  if (sendAt.getTime() <= Date.now()) return;

  const sendAfter = toLocalStamp(sendAt);

  if (settings.notify_email_enabled && job.customer_email) {
    const composed = reminderEmail(job, settings);
    queue({
      channel: "email",
      kind: "reminder",
      recipient: job.customer_email,
      subject: composed.subject,
      body: composed.body,
      jobId: job.id,
      customerId: job.customer_id,
      sendAfter,
      dedupeKey: `reminder:email:${job.id}`,
    });
  }

  if (settings.notify_sms_enabled && job.customer_phone) {
    queue({
      channel: "sms",
      kind: "reminder",
      recipient: normalisePhone(job.customer_phone),
      body: reminderSms(job, settings),
      jobId: job.id,
      customerId: job.customer_id,
      sendAfter,
      dedupeKey: `reminder:sms:${job.id}`,
    });
  }
}

export function queueJobCompleted(jobId: number, total: number) {
  const job = getJob(jobId);
  if (!job) return;
  const settings = getSettings();
  if (!settings.notify_email_enabled || !job.customer_email) return;

  const composed = jobCompletedEmail(job, settings, total);
  queue({
    channel: "email",
    kind: "job_completed",
    recipient: job.customer_email,
    subject: composed.subject,
    body: composed.body,
    jobId: job.id,
    customerId: job.customer_id,
    dedupeKey: `completed:${job.id}`,
  });
}

/** Cancelling or rescheduling should not leave a stale reminder queued. */
export function dropPendingReminders(jobId: number) {
  getDb()
    .prepare("DELETE FROM messages WHERE job_id = ? AND kind = 'reminder' AND status IN ('queued','skipped')")
    .run(jobId);
}

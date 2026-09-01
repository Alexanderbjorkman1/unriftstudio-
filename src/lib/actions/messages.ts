"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import * as messages from "@/lib/repo/messages";
import { processOutbox, queue } from "@/lib/notify/outbox";
import { emailStatus, normalisePhone, smsStatus } from "@/lib/notify/providers";
import { getSettings } from "@/lib/repo/settings";

export async function retryMessageAction(id: number) {
  await requireRole("owner");
  messages.retryMessage(id);
  await processOutbox(5);
  revalidatePath("/messages");
}

export async function retryAllFailedAction() {
  await requireRole("owner");
  messages.retryAllFailed();
  await processOutbox(50);
  revalidatePath("/messages");
}

export async function deleteMessageAction(id: number) {
  await requireRole("owner");
  messages.deleteMessage(id);
  revalidatePath("/messages");
}

export async function sendNowAction() {
  await requireRole("owner");
  const result = await processOutbox(50);
  revalidatePath("/messages");
  return result;
}

/**
 * Sends a real message to the owner so they can confirm delivery works before
 * a customer is on the receiving end.
 */
export async function sendTestMessageAction(channel: "email" | "sms", to: string) {
  await requireRole("owner");
  const settings = getSettings();
  const status = channel === "email" ? emailStatus() : smsStatus();

  if (!status.configured) {
    return { ok: false, message: status.hint };
  }
  if (!to.trim()) {
    return { ok: false, message: channel === "email" ? "Enter an email address to test." : "Enter a phone number to test." };
  }

  queue({
    channel,
    kind: "owner_alert",
    recipient: channel === "sms" ? normalisePhone(to) : to.trim(),
    subject: `Test message from ${settings.business_name}`,
    body:
      `This is a test from ${settings.business_name}.\n\n` +
      `If you are reading this, ${channel === "email" ? "email" : "SMS"} delivery is working ` +
      `and your customers will get their booking confirmations.`,
    dedupeKey: `test:${channel}:${Date.now()}`,
  });

  const result = await processOutbox(5);
  revalidatePath("/messages");

  return result.sent > 0
    ? { ok: true, message: `Sent. Check ${to.trim()}.` }
    : { ok: false, message: "Could not send — open the message log for the provider's error." };
}

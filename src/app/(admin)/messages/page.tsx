import Link from "next/link";
import { MailWarning } from "lucide-react";
import { Badge, Card, EmptyState, Table, Td, Th } from "@/components/ui";
import { FilterTabs } from "@/components/admin/filters";
import { MessageActions, SendNowButton } from "@/components/admin/message-actions";
import { listMessages, messageCounts } from "@/lib/repo/messages";
import { emailStatus, smsStatus } from "@/lib/notify/providers";
import { formatDate, stampTime } from "@/lib/dates";
import type { MessageStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

const TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  sent: "green",
  queued: "amber",
  failed: "red",
  skipped: "slate",
};

const KIND_LABEL: Record<string, string> = {
  booking_confirmation: "Booking confirmation",
  reminder: "Reminder",
  job_completed: "Job completed",
  owner_alert: "New booking alert",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const counts = messageCounts();
  const messages = listMessages(status as MessageStatus | "all", 200);
  const email = emailStatus();
  const sms = smsStatus();

  return (
    <div className="space-y-4">
      {(!email.configured || !sms.configured) && (
        <Card className="border-warn/30 bg-warn/5 p-4">
          <p className="flex items-start gap-2.5 text-[13px]">
            <MailWarning className="mt-0.5 size-4.5 shrink-0 text-warn" />
            <span>
              <span className="font-medium text-fg">Messages are being written but not delivered.</span>{" "}
              <span className="text-muted">
                {!email.configured && email.hint}{" "}
                {!sms.configured && sms.hint}{" "}
                Add the keys in{" "}
                <Link href="/settings?tab=messages" className="text-brand hover:text-fg">
                  Settings → Messages
                </Link>
                , then retry the skipped ones below.
              </span>
            </span>
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          active={status}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "queued", label: "Queued", count: counts.queued },
            { value: "sent", label: "Sent", count: counts.sent },
            { value: "skipped", label: "Not sent", count: counts.skipped },
            { value: "failed", label: "Failed", count: counts.failed },
          ]}
        />
        <div className="ml-auto">
          <SendNowButton hasPending={counts.queued + counts.failed + counts.skipped > 0} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Confirmations and reminders appear here as soon as someone books."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>To</Th>
                <Th>Message</Th>
                <Th>Job</Th>
                <Th>Created</Th>
                <Th>Send after</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id} className="transition hover:bg-raised/60">
                  <Td>
                    <span className="block font-medium">{message.customer_name ?? "—"}</span>
                    <span className="block text-[11px] text-faint">{message.recipient}</span>
                  </Td>
                  <Td>
                    <span className="block">{KIND_LABEL[message.kind] ?? message.kind}</span>
                    <span className="block text-[11px] text-faint uppercase">{message.channel}</span>
                  </Td>
                  <Td className="text-muted">
                    {message.job_id ? (
                      <Link href={`/jobs/${message.job_id}`} className="hover:text-brand">
                        {message.job_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(message.created_at)}</Td>
                  <Td className="whitespace-nowrap text-muted">
                    {formatDate(message.send_after)} <span className="text-faint">{stampTime(message.send_after)}</span>
                  </Td>
                  <Td>
                    <Badge tone={TONE[message.status] ?? "slate"}>{message.status}</Badge>
                    {message.error && (
                      <span className="mt-1 block max-w-[240px] truncate text-[11px] text-faint" title={message.error}>
                        {message.error}
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <MessageActions id={message.id} status={message.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

import { getDb } from "../src/lib/db";
import { saveSettings, getSettings } from "../src/lib/repo/settings";
import { createJob, setJobStatus } from "../src/lib/repo/jobs";
import {
  dropPendingReminders, processOutbox, queueBookingMessages, queueJobCompleted, queueReminder,
} from "../src/lib/notify/outbox";
import { normalisePhone } from "../src/lib/notify/providers";
import { addDays, dayKey, toLocalStamp } from "../src/lib/dates";

const db = getDb();
let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
}

// Phone normalisation for Swedish numbers.
check("phone 070-123 45 67", normalisePhone("070-123 45 67"), "+46701234567");
check("phone already international", normalisePhone("+46701234567"), "+46701234567");
check("phone 0046 prefix", normalisePhone("0046701234567"), "+46701234567");
check("phone empty", normalisePhone(""), "");

saveSettings({
  notify_email_enabled: true,
  notify_sms_enabled: true,
  owner_alert_email: "owner@shop.test",
  reminder_hours_before: 24,
});

// A customer with both an email and a phone.
const customerId = db
  .prepare("INSERT INTO customers (name, email, phone) VALUES ('Test Kund', 'kund@test.se', '070-999 88 77')")
  .run().lastInsertRowid as number;
const vehicleId = db
  .prepare("INSERT INTO vehicles (customer_id, make, model, year, plate, size) VALUES (?, 'Volvo', 'XC60', 2021, 'TST001', 'large')")
  .run(customerId).lastInsertRowid as number;

// Booked three days out, so the day-before reminder is still in the future.
const when = addDays(new Date(), 3);
when.setHours(10, 0, 0, 0);

const { id: jobId } = createJob({
  customer_id: customerId,
  vehicle_id: vehicleId,
  assigned_to: null,
  status: "booked",
  scheduled_at: toLocalStamp(when),
  duration_min: 210,
  location_type: "shop",
  address: "",
  city: "",
  condition: "normal",
  price: 2869,
  notes: "",
  source: "online",
  services: [{ service_id: null, name: "Full Detail", price: 2869, duration_min: 210 }],
  checklist: [],
});

queueBookingMessages(jobId);

const rows = () =>
  db.prepare("SELECT channel, kind, recipient, status, send_after, dedupe_key FROM messages WHERE job_id = ? ORDER BY id").all(jobId) as Array<{
    channel: string; kind: string; recipient: string; status: string; send_after: string; dedupe_key: string;
  }>;

const queued = rows();
// confirmation email + SMS, owner alert, reminder email + SMS
check("five messages queued", queued.length, 5);
check("customer confirmation email", queued[0].recipient, "kund@test.se");
check("confirmation sms normalised", queued[1].recipient, "+46709998877");
check("owner alert queued", queued.find((r) => r.kind === "owner_alert")?.recipient, "owner@shop.test");

const reminder = queued.find((r) => r.kind === "reminder" && r.channel === "email")!;
check("reminder scheduled a day before", reminder.send_after.slice(0, 10), dayKey(addDays(when, -1)));

// Queueing twice must not duplicate — dedupe_key is unique.
const before = rows().length;
queueBookingMessages(jobId);
check("re-queue does not duplicate", rows().length, before);

// With no provider keys, sending must skip rather than lose or hard-fail.
const result = await processOutbox();
check("confirmations attempted", result.considered >= 3, true);
check("nothing reported sent without keys", result.sent, 0);
check("skipped, not failed", result.failed, 0);

const afterSend = rows();
const confirmations = afterSend.filter((r) => r.kind !== "reminder");
check("confirmations marked skipped", confirmations.every((r) => r.status === "skipped"), true);
check("future reminder still queued", afterSend.find((r) => r.kind === "reminder")?.status, "queued");

// Completing the job should mail the customer and clear the reminder.
setJobStatus(jobId, "completed");
queueJobCompleted(jobId, 2869);
dropPendingReminders(jobId);

const afterComplete = rows();
check("completion email queued", afterComplete.some((r) => r.kind === "job_completed"), true);
check("reminders cleared on completion", afterComplete.some((r) => r.kind === "reminder"), false);

// A reminder for a job already in the past should not be scheduled at all.
const past = addDays(new Date(), -2);
const { id: pastJob } = createJob({
  customer_id: customerId, vehicle_id: vehicleId, assigned_to: null, status: "booked",
  scheduled_at: toLocalStamp(past), duration_min: 60, location_type: "shop", address: "", city: "",
  condition: "normal", price: 595, notes: "", source: "admin",
  services: [{ service_id: null, name: "Exterior Wash", price: 595, duration_min: 60 }], checklist: [],
});
queueReminder(pastJob);
const pastRows = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE job_id = ?").get(pastJob) as { n: number };
check("no reminder for a job in the past", pastRows.n, 0);

// Clean up the test rows so the demo data stays tidy.
db.prepare("DELETE FROM jobs WHERE id IN (?, ?)").run(jobId, pastJob);
db.prepare("DELETE FROM customers WHERE id = ?").run(customerId);
saveSettings({ notify_sms_enabled: false, owner_alert_email: "" });

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
console.log("settings round-trip ok:", getSettings().reminder_hours_before === 24);
process.exit(failures === 0 ? 0 : 1);

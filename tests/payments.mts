import { signPayload, verifyWebhookSignature } from "../src/lib/payments/stripe";
import { getDb } from "../src/lib/db";
import { markPaid, recordPending } from "../src/lib/repo/payments";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`,
  );
}

/* ------------------------------------------------- webhook signature checks */

const SECRET = "whsec_test_secret";
const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1" } } });

check(
  "correctly signed payload accepted",
  verifyWebhookSignature(payload, signPayload(payload, SECRET), SECRET).ok,
  true,
);

check(
  "unsigned request rejected",
  verifyWebhookSignature(payload, null, SECRET).ok,
  false,
);

check(
  "garbage signature header rejected",
  verifyWebhookSignature(payload, "not-a-signature", SECRET).ok,
  false,
);

// The signature must cover the body: a tampered amount must not verify.
const tampered = payload.replace("cs_test_1", "cs_test_HACKED");
check(
  "tampered body rejected",
  verifyWebhookSignature(tampered, signPayload(payload, SECRET), SECRET).ok,
  false,
);

check(
  "signature from the wrong secret rejected",
  verifyWebhookSignature(payload, signPayload(payload, "whsec_someone_elses"), SECRET).ok,
  false,
);

// An old but genuinely signed payload must not be replayable.
const oldTimestamp = Math.floor(Date.now() / 1000) - 3600;
check(
  "replayed old payload rejected",
  verifyWebhookSignature(payload, signPayload(payload, SECRET, oldTimestamp), SECRET).ok,
  false,
);

check(
  "no configured secret means nothing is trusted",
  verifyWebhookSignature(payload, signPayload(payload, SECRET), undefined).ok,
  false,
);

/* ------------------------------------------------------ duplicate delivery */

const db = getDb();
const ref = `cs_test_${Date.now()}`;
recordPending({ jobId: null, kind: "deposit", amount: 500, currency: "sek", providerRef: ref });

const first = markPaid(ref);
check("first webhook marks the payment paid", first?.status, "paid");

// Stripe retries deliveries; the second must be a no-op so nothing happens twice.
const second = markPaid(ref);
check("second delivery of the same session is ignored", second, null);

const rows = db.prepare("SELECT COUNT(*) AS n FROM payments WHERE provider_ref = ?").get(ref) as { n: number };
check("still exactly one payment row", rows.n, 1);

db.prepare("DELETE FROM payments WHERE provider_ref = ?").run(ref);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

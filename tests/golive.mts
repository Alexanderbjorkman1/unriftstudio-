import { rateLimit } from "../src/lib/rate-limit";
import { getDb } from "../src/lib/db";
import { listUsers, createUser } from "../src/lib/repo/users";
import { verifyPassword } from "../src/lib/password";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`,
  );
}

/* ------------------------------------------------------------ rate limiting */

const key = `test-${Date.now()}`;
for (let i = 0; i < 5; i++) {
  check(`booking ${i + 1} of 5 allowed`, rateLimit(key, 5, 60_000).allowed, true);
}
const blocked = rateLimit(key, 5, 60_000);
check("sixth booking blocked", blocked.allowed, false);
check("blocked response says when to retry", blocked.retryAfterSeconds > 0, true);

// A different caller is unaffected by the first one's limit.
check("other client unaffected", rateLimit(`${key}-other`, 5, 60_000).allowed, true);

// The window slides: a tiny window frees up immediately.
const shortKey = `short-${Date.now()}`;
rateLimit(shortKey, 1, 1);
await new Promise((r) => setTimeout(r, 10));
check("window slides open again", rateLimit(shortKey, 1, 1).allowed, true);

/* ------------------------------------------------- demo account lockout guard */

const DEMO = ["alex@detailflow.se", "johan@detailflow.se", "emil@detailflow.se"];
const db = getDb();

function realOwners() {
  return listUsers().filter(
    (u) => u.active && u.role === "owner" && !DEMO.includes(u.email.toLowerCase()),
  );
}

// Fresh demo database: the only owner is a demo account, so disabling them
// would lock the shop out of its own admin. The guard must refuse.
check("no real owner on a fresh install", realOwners().length, 0);

const email = `owner-${Date.now()}@test.se`;
createUser({
  name: "Real Owner",
  email,
  phone: "",
  role: "owner",
  color: "#3B82F6",
  hourly_rate: 0,
  active: 1,
  password: "a-real-password",
});

check("real owner now exists", realOwners().length, 1);

const stored = db.prepare("SELECT password_hash FROM users WHERE email = ?").get(email) as {
  password_hash: string;
};
check("password is hashed, not stored as text", stored.password_hash.startsWith("scrypt:"), true);
check("password verifies", verifyPassword("a-real-password", stored.password_hash), true);
check("wrong password rejected", verifyPassword("not-it", stored.password_hash), false);

// Clean up so the demo database is left as it was.
db.prepare("DELETE FROM users WHERE email = ?").run(email);
check("test owner removed", realOwners().length, 0);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

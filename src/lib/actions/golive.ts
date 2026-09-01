"use server";

import { revalidatePath } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import { requireRole } from "@/lib/auth";
import { getDb, uploadsDir } from "@/lib/db";
import { createUser, getUserByEmail, listUsers } from "@/lib/repo/users";
import { takeBackup } from "@/lib/backup";
import { emailStatus } from "@/lib/notify/providers";
import { getSettings } from "@/lib/repo/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";

const DEMO_EMAILS = ["alex@detailflow.se", "johan@detailflow.se", "emil@detailflow.se"];

export interface GoLiveCheck {
  id: string;
  label: string;
  detail: string;
  done: boolean;
}

/** The checklist shown on the Go live tab — each item is a real query. */
export async function goLiveStatus(): Promise<GoLiveCheck[]> {
  await requireRole("owner");
  const db = getDb();
  const settings = getSettings();
  const users = listUsers();

  const demoAccounts = users.filter((u) => u.active && DEMO_EMAILS.includes(u.email.toLowerCase()));
  const realOwners = users.filter(
    (u) => u.active && u.role === "owner" && !DEMO_EMAILS.includes(u.email.toLowerCase()),
  );
  const demoJobs = (db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number }).n;
  const changedBusiness =
    settings.business_name !== DEFAULT_SETTINGS.business_name ||
    settings.org_number !== DEFAULT_SETTINGS.org_number;

  return [
    {
      id: "owner",
      label: "Create your own login",
      detail: realOwners.length
        ? `${realOwners.map((u) => u.email).join(", ")}`
        : "Everything is still running on the demo accounts.",
      done: realOwners.length > 0,
    },
    {
      id: "demo-users",
      label: "Turn off the demo logins",
      detail: demoAccounts.length
        ? `${demoAccounts.length} demo account${demoAccounts.length === 1 ? "" : "s"} still active — their passwords are published in the repository.`
        : "No demo accounts can sign in.",
      done: demoAccounts.length === 0,
    },
    {
      id: "business",
      label: "Put in your business details",
      detail: changedBusiness
        ? `${settings.business_name}, org. nr ${settings.org_number}`
        : "Still showing the example shop on your booking site and invoices.",
      done: changedBusiness,
    },
    {
      id: "demo-data",
      label: "Clear the demo bookings",
      detail: `${demoJobs} job${demoJobs === 1 ? "" : "s"} in the diary.`,
      done: demoJobs === 0,
    },
    {
      id: "email",
      label: "Connect email",
      detail: emailStatus().configured
        ? "Confirmations are being delivered."
        : "Confirmations are queued but not delivered.",
      done: emailStatus().configured,
    },
  ];
}

export async function createOwnerAction(formData: FormData) {
  await requireRole("owner");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { ok: false, message: "Name and email are both needed." };
  if (password.length < 8) return { ok: false, message: "Use at least 8 characters for the password." };
  if (getUserByEmail(email)) return { ok: false, message: "There is already an account with that email." };

  createUser({
    name,
    email,
    phone: "",
    role: "owner",
    color: "#3B82F6",
    hourly_rate: 0,
    active: 1,
    password,
  });

  revalidatePath("/settings");
  revalidatePath("/employees");
  return { ok: true, message: `Account created. Sign in as ${email} from now on.` };
}

/** Deactivates the published demo logins. Refuses if it would lock the owner out. */
export async function disableDemoAccountsAction() {
  await requireRole("owner");
  const db = getDb();

  const realOwners = listUsers().filter(
    (u) => u.active && u.role === "owner" && !DEMO_EMAILS.includes(u.email.toLowerCase()),
  );
  if (realOwners.length === 0) {
    return { ok: false, message: "Create your own owner login first, or you will lock yourself out." };
  }

  const changed = db
    .prepare(
      `UPDATE users SET active = 0
        WHERE lower(email) IN (${DEMO_EMAILS.map(() => "?").join(",")})`,
    )
    .run(...DEMO_EMAILS).changes;

  // Sessions belonging to those accounts should end immediately.
  db.prepare(
    `DELETE FROM sessions WHERE user_id IN (
       SELECT id FROM users WHERE lower(email) IN (${DEMO_EMAILS.map(() => "?").join(",")}))`,
  ).run(...DEMO_EMAILS);

  revalidatePath("/settings");
  revalidatePath("/employees");
  return { ok: true, message: `${changed} demo account${changed === 1 ? "" : "s"} disabled.` };
}

/**
 * Removes the invented customers and bookings, keeping the things worth
 * keeping: services, products, staff and settings. Takes a backup first.
 */
export async function clearDemoDataAction(formData: FormData) {
  await requireRole("owner");

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "CLEAR") {
    return { ok: false, message: 'Type CLEAR to confirm.' };
  }

  const backup = await takeBackup("before-clear");

  const db = getDb();
  const wipe = db.transaction(() => {
    // Children first; foreign keys cascade, but being explicit keeps this readable.
    db.prepare("DELETE FROM messages").run();
    db.prepare("DELETE FROM invoice_items").run();
    db.prepare("DELETE FROM invoices").run();
    db.prepare("DELETE FROM quote_items").run();
    db.prepare("DELETE FROM quotes").run();
    db.prepare("DELETE FROM job_photos").run();
    db.prepare("DELETE FROM job_notes").run();
    db.prepare("DELETE FROM job_checklist").run();
    db.prepare("DELETE FROM job_products").run();
    db.prepare("DELETE FROM job_services").run();
    db.prepare("DELETE FROM jobs").run();
    db.prepare("DELETE FROM vehicles").run();
    db.prepare("DELETE FROM customers").run();
  });
  wipe();

  // Photos belonged to jobs that no longer exist.
  const dir = uploadsDir();
  let removed = 0;
  for (const file of fs.readdirSync(dir)) {
    if (file === ".gitkeep") continue;
    fs.rmSync(path.join(dir, file), { force: true });
    removed += 1;
  }

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath("/customers");
  revalidatePath("/settings");

  return {
    ok: true,
    message: `Demo bookings and customers removed, along with ${removed} photo${removed === 1 ? "" : "s"}. Your services, products, staff and settings were kept. A backup was saved as ${backup}.`,
  };
}

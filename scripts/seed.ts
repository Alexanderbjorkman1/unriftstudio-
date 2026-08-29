/* Rebuilds the demo database from scratch: npm run seed */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "../src/lib/db";
import { seed } from "../src/lib/seed";

const file = path.resolve(process.env.DATABASE_PATH ?? "./data/detailflow.db");
fs.mkdirSync(path.dirname(file), { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  if (fs.existsSync(file + suffix)) fs.rmSync(file + suffix);
}
const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
migrate(db);
seed(db);

const jobs = db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number };
const customers = db.prepare("SELECT COUNT(*) AS n FROM customers").get() as { n: number };
console.log(`Seeded ${file}: ${jobs.n} jobs, ${customers.n} customers.`);
console.log("Login with alex@detailflow.se / demo1234");

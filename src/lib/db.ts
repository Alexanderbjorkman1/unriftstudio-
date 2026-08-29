import Database from "better-sqlite3";
import { seed } from "./seed";
import fs from "node:fs";
import path from "node:path";

/**
 * A single long-lived SQLite connection. In dev, Next.js hot-reloads modules,
 * so the handle is cached on globalThis to avoid opening the file repeatedly.
 */
const globalForDb = globalThis as unknown as { detailflowDb?: Database.Database };

function resolveDbPath() {
  const configured = process.env.DATABASE_PATH ?? "./data/detailflow.db";
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export function uploadsDir() {
  const dir = path.join(path.dirname(resolveDbPath()), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createConnection() {
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.detailflowDb) {
    const db = createConnection();
    migrate(db);
    globalForDb.detailflowDb = db;
    ensureSeeded(db);
  }
  return globalForDb.detailflowDb;
}

/** Schema is created idempotently on first connection. */
export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      email        TEXT NOT NULL UNIQUE,
      phone        TEXT NOT NULL DEFAULT '',
      role         TEXT NOT NULL DEFAULT 'technician',
      password_hash TEXT NOT NULL,
      color        TEXT NOT NULL DEFAULT '#3B82F6',
      hourly_rate  INTEGER NOT NULL DEFAULT 0,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL DEFAULT '',
      phone       TEXT NOT NULL DEFAULT '',
      address     TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      city        TEXT NOT NULL DEFAULT '',
      company     TEXT NOT NULL DEFAULT '',
      notes       TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      make        TEXT NOT NULL,
      model       TEXT NOT NULL,
      year        INTEGER,
      plate       TEXT NOT NULL DEFAULT '',
      color       TEXT NOT NULL DEFAULT '',
      size        TEXT NOT NULL DEFAULT 'medium',
      mileage     INTEGER,
      notes       TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      slug         TEXT NOT NULL UNIQUE,
      description  TEXT NOT NULL DEFAULT '',
      base_price   INTEGER NOT NULL DEFAULT 0,
      duration_min INTEGER NOT NULL DEFAULT 60,
      category     TEXT NOT NULL DEFAULT 'detailing',
      image        TEXT NOT NULL DEFAULT '',
      checklist    TEXT NOT NULL DEFAULT '[]',
      active       INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      sku        TEXT NOT NULL DEFAULT '',
      category   TEXT NOT NULL DEFAULT 'consumable',
      price      INTEGER NOT NULL DEFAULT 0,
      cost       INTEGER NOT NULL DEFAULT 0,
      stock      INTEGER NOT NULL DEFAULT 0,
      reorder_at INTEGER NOT NULL DEFAULT 0,
      unit       TEXT NOT NULL DEFAULT 'pcs',
      active     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number     TEXT NOT NULL UNIQUE,
      customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      vehicle_id     INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      assigned_to    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status         TEXT NOT NULL DEFAULT 'booked',
      scheduled_at   TEXT NOT NULL,
      duration_min   INTEGER NOT NULL DEFAULT 120,
      location_type  TEXT NOT NULL DEFAULT 'shop',
      address        TEXT NOT NULL DEFAULT '',
      city           TEXT NOT NULL DEFAULT '',
      condition      TEXT NOT NULL DEFAULT 'normal',
      price          INTEGER NOT NULL DEFAULT 0,
      notes          TEXT NOT NULL DEFAULT '',
      source         TEXT NOT NULL DEFAULT 'admin',
      started_at     TEXT,
      completed_at   TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_services (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id       INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      service_id   INTEGER REFERENCES services(id) ON DELETE SET NULL,
      name         TEXT NOT NULL,
      price        INTEGER NOT NULL DEFAULT 0,
      duration_min INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS job_products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      name       TEXT NOT NULL,
      price      INTEGER NOT NULL DEFAULT 0,
      qty        INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS job_checklist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      label      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS job_photos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL DEFAULT 'before',
      filename   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT NOT NULL UNIQUE,
      customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      vehicle_id   INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      status       TEXT NOT NULL DEFAULT 'draft',
      valid_until  TEXT NOT NULL,
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      name     TEXT NOT NULL,
      qty      INTEGER NOT NULL DEFAULT 1,
      price    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      job_id         INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
      status         TEXT NOT NULL DEFAULT 'draft',
      issued_at      TEXT NOT NULL,
      due_at         TEXT NOT NULL,
      vat_rate       INTEGER NOT NULL DEFAULT 25,
      paid_at        TEXT,
      payment_method TEXT NOT NULL DEFAULT '',
      notes          TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      qty        INTEGER NOT NULL DEFAULT 1,
      price      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS time_off (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      day     TEXT NOT NULL,
      reason  TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_assigned ON jobs(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
    CREATE INDEX IF NOT EXISTS idx_job_services_job ON job_services(job_id);
  `);
}

function ensureSeeded(db: Database.Database) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (row.n === 0) seed(db);
}

import fs from "node:fs";
import path from "node:path";
import { getDb, resolveDbPath } from "./db";

/**
 * Nightly snapshots of the database.
 *
 * Uses SQLite's own backup API rather than copying the file, which is the only
 * safe way to take a copy while the app is writing — a plain `cp` of a live
 * database can capture a torn page and produce a backup that will not open.
 *
 * Photos are not copied: they are large and immutable, so the honest advice is
 * to copy the whole data folder. Settings says so.
 */

const globalForBackup = globalThis as unknown as { detailflowBackup?: NodeJS.Timeout };

const KEEP = 14;
const INTERVAL_MS = 6 * 60 * 60 * 1000; // check four times a day

export function backupsDir() {
  const dir = path.join(path.dirname(resolveDbPath()), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface BackupFile {
  name: string;
  size: number;
  takenAt: string;
}

export function listBackups(): BackupFile[] {
  return fs
    .readdirSync(backupsDir())
    .filter((f) => f.endsWith(".db"))
    .map((name) => {
      const stat = fs.statSync(path.join(backupsDir(), name));
      return { name, size: stat.size, takenAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

/** Takes a snapshot now. Returns the filename written. */
export async function takeBackup(label = "auto") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `detailflow-${label}-${stamp}.db`;
  const target = path.join(backupsDir(), name);

  await getDb().backup(target);
  prune();
  return name;
}

/** Keeps the most recent KEEP snapshots and deletes the rest. */
function prune() {
  const files = listBackups();
  for (const file of files.slice(KEEP)) {
    fs.rmSync(path.join(backupsDir(), file.name), { force: true });
  }
}

function hoursSinceLastBackup() {
  const [latest] = listBackups();
  if (!latest) return Infinity;
  return (Date.now() - new Date(latest.takenAt).getTime()) / 3_600_000;
}

export function startBackupSchedule() {
  if (globalForBackup.detailflowBackup) return;

  const tick = async () => {
    try {
      // One a day is plenty; the check runs more often so a machine that is
      // asleep overnight still gets a snapshot when it wakes.
      if (hoursSinceLastBackup() >= 24) {
        const name = await takeBackup("auto");
        console.log(`[backup] wrote ${name}`);
      }
    } catch (error) {
      console.error("[backup] failed:", error instanceof Error ? error.message : error);
    }
  };

  globalForBackup.detailflowBackup = setInterval(tick, INTERVAL_MS);
  globalForBackup.detailflowBackup.unref?.();
  void tick();
}

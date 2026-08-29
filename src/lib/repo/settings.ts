import { getDb } from "../db";
import { DEFAULT_SETTINGS } from "../settings-defaults";
import type { BusinessSettings } from "../types";

export function getSettings(): BusinessSettings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      stored[row.key] = JSON.parse(row.value);
    } catch {
      stored[row.key] = row.value;
    }
  }
  return { ...DEFAULT_SETTINGS, ...stored } as BusinessSettings;
}

export function saveSettings(patch: Partial<BusinessSettings>) {
  const db = getDb();
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  const tx = db.transaction((entries: Array<[string, unknown]>) => {
    for (const [key, value] of entries) stmt.run(key, JSON.stringify(value));
  });
  tx(Object.entries(patch));
}

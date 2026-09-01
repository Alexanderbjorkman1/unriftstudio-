/**
 * Runs once when the server starts. Used to bring up the background work the
 * app needs: sending queued customer messages, and taking nightly backups.
 */
export async function register() {
  // Guard: this file is also evaluated for the edge runtime, which has no timers
  // or filesystem access.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startOutboxTicker } = await import("./lib/notify/scheduler");
  const { startBackupSchedule } = await import("./lib/backup");

  startOutboxTicker();
  startBackupSchedule();
}

import { processOutbox } from "./outbox";

/**
 * Drains the outbox on a timer inside the server process.
 *
 * This app runs as a single instance — on the owner's machine or one small
 * container — so an in-process ticker is more dependable than an external cron
 * that has to be configured separately and silently stops working when the host
 * changes. Started once from instrumentation.ts.
 */
const globalForTicker = globalThis as unknown as { detailflowTicker?: NodeJS.Timeout };

const INTERVAL_MS = 60_000;

export function startOutboxTicker() {
  if (globalForTicker.detailflowTicker) return;

  const tick = async () => {
    try {
      const result = await processOutbox();
      if (result.sent || result.failed) {
        console.log(`[outbox] sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`);
      }
    } catch (error) {
      // Never let a bad tick kill the interval.
      console.error("[outbox] tick failed:", error instanceof Error ? error.message : error);
    }
  };

  globalForTicker.detailflowTicker = setInterval(tick, INTERVAL_MS);
  // Don't hold the process open on shutdown.
  globalForTicker.detailflowTicker.unref?.();
  void tick();
}

/** Nudges the outbox immediately, without waiting for the next tick. */
export function flushSoon() {
  setTimeout(() => {
    void processOutbox().catch(() => undefined);
  }, 50);
}

import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { Collector } from "../collectors/collector.js";
import { prisma } from "../db/prisma.js";

function daysToMs(d: number) {
  return d * 24 * 60 * 60 * 1000;
}

async function retentionSweep() {
  const cutoff = new Date(Date.now() - daysToMs(config.HISTORY_RETENTION_DAYS));
  const [mp, sn] = await Promise.all([
    prisma.metricPoint.deleteMany({ where: { ts: { lt: cutoff } } }),
    prisma.snapshot.deleteMany({ where: { ts: { lt: cutoff } } })
  ]);

  logger.info({ cutoff, metricPointsDeleted: mp.count, snapshotsDeleted: sn.count }, "Retention sweep complete");
}

export function startPoller() {
  const collector = new Collector();

  let timer: NodeJS.Timeout | null = null;
  let sweepTimer: NodeJS.Timeout | null = null;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;

    const startedAt = Date.now();
    try {
      const collected = await collector.collectOnce();
      await collector.persist(collected);

      logger.info(
        { tookMs: Date.now() - startedAt, ts: collected.ts.toISOString() },
        "Poll cycle complete"
      );
    } catch (err) {
      logger.error({ err }, "Poll cycle failed");
    }
  };

  // immediate tick + interval
  void tick();
  timer = setInterval(() => void tick(), config.POLL_INTERVAL_MS);

  // daily retention sweep
  sweepTimer = setInterval(() => void retentionSweep(), 24 * 60 * 60 * 1000);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    if (sweepTimer) clearInterval(sweepTimer);
  };
}

import { prisma } from "../db/prisma.js";
import { TTLCache } from "../lib/cache.js";
import { config } from "../lib/config.js";
import { AggregationService } from "./aggregation.service.js";

type Window = "1h" | "6h" | "12h" | "24h" | "7d";
type Step = "15m" | "30m" | "1h" | "2h" | "4h" | "24h";

function windowToMs(w: Window): number {
  switch (w) {
    case "1h": return 60 * 60 * 1000;
    case "6h": return 6 * 60 * 60 * 1000;
    case "12h": return 12 * 60 * 60 * 1000;
    case "24h": return 24 * 60 * 60 * 1000;
    case "7d": return 7 * 24 * 60 * 60 * 1000;
  }
}

function stepToMs(s: Step): number {
  switch (s) {
    case "15m": return 15 * 60 * 1000;
    case "30m": return 30 * 60 * 1000;
    case "1h": return 60 * 60 * 1000;
    case "2h": return 2 * 60 * 60 * 1000;
    case "4h": return 4 * 60 * 60 * 1000;
    case "24h": return 24 * 60 * 60 * 1000;
  }
}

type SeriesResponse = {
  window: Window;
  step: Step;
  labels: string[];
  series: Array<{ key: string; unit?: string; values: number[] }>;
};

const cache = new TTLCache<any>(5_000); // small API cache

export class MetricsService {
  private agg = new AggregationService();

  async getSnapshot() {
    const cached = cache.get("snapshot");
    if (cached) return cached;

    const latest = await prisma.snapshot.findFirst({ orderBy: { ts: "desc" } });

    if (!latest) {
      // In a clean DB, return a sane “empty but structured” shape
      const empty = this.agg.emptySnapshot();
      cache.set("snapshot", empty, 2_000);
      return empty;
    }

    const out = {
      ts: latest.ts.toISOString(),
      network: {
        avgTxPerBlock: latest.avgTxPerBlock,
        avgBlockLoadPct: latest.avgBlockLoadPct,
        avgBlockTimeSec: latest.avgBlockTimeSec,
        peakLoad24hPct: latest.peakLoad24hPct,
        emptyBlocks24hPct: latest.emptyBlocks24hPct,
        avgBlockSizeMb: latest.avgBlockSizeMb
      },
      fees: {
        avgTxFeeMon: latest.avgTxFeeMon,
        medianTxFeeMon: latest.medianTxFeeMon,
        costPerBlockMon: latest.costPerBlockMon,
        feeLevelState: latest.feeLevelState
      },
      economics: {
        parallelEfficiencyPct: latest.parallelEfficiencyPct,
        stateConflictRatePct: latest.stateConflictRatePct,
        effectiveTps: latest.effectiveTps,
        feeFlow: {
          burnPct: latest.feeFlowBurnPct,
          validatorsPct: latest.feeFlowValidatorsPct,
          adjustPct: latest.feeFlowAdjustPct
        }
      },
      txComposition: {
        simpleTransfersPct: latest.simpleTransfersPct,
        contractCallsPct: latest.contractCallsPct,
        microTxPct: latest.microTxPct
      }
    };

    cache.set("snapshot", out, 2_000);
    return out;
  }

  async getNetworkLoadSeries({ window, step }: { window: Window; step: Step }): Promise<SeriesResponse> {
    const key = `series:network:${window}:${step}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { labels, buckets } = this.agg.buildBuckets(windowToMs(window), stepToMs(step));
    const since = new Date(Date.now() - windowToMs(window));

    const points = await prisma.metricPoint.findMany({
      where: {
        seriesKey: { in: ["network.tx_per_block", "network.block_size_mb"] },
        ts: { gte: since }
      },
      orderBy: { ts: "asc" }
    });

    const series = this.agg.bucketize(points, buckets, labels, {
      "network.tx_per_block": { key: "tx_per_block", unit: "tx" },
      "network.block_size_mb": { key: "block_size_mb", unit: "MB" }
    });

    const out: SeriesResponse = { window, step, labels, series };
    cache.set(key, out, 5_000);
    return out;
  }

  async getFeesSeries({ window, step }: { window: Window; step: Step }): Promise<SeriesResponse> {
    const key = `series:fees:${window}:${step}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { labels, buckets } = this.agg.buildBuckets(windowToMs(window), stepToMs(step));
    const since = new Date(Date.now() - windowToMs(window));

    const points = await prisma.metricPoint.findMany({
      where: {
        seriesKey: { in: ["fees.avg_tx_fee_mon", "fees.fee_vs_load_pct"] },
        ts: { gte: since }
      },
      orderBy: { ts: "asc" }
    });

    const series = this.agg.bucketize(points, buckets, labels, {
      "fees.avg_tx_fee_mon": { key: "avg_tx_fee_mon", unit: "MON" },
      "fees.fee_vs_load_pct": { key: "fee_vs_load_pct", unit: "%" }
    });

    const out: SeriesResponse = { window, step, labels, series };
    cache.set(key, out, 5_000);
    return out;
  }

  async getEconomicsSeries({ window, step }: { window: Window; step: Step }): Promise<SeriesResponse> {
    const key = `series:econ:${window}:${step}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { labels, buckets } = this.agg.buildBuckets(windowToMs(window), stepToMs(step));
    const since = new Date(Date.now() - windowToMs(window));

    const points = await prisma.metricPoint.findMany({
      where: {
        seriesKey: { in: ["economics.burn_share", "economics.validators_share", "economics.compute_pressure", "economics.fee_mon"] },
        ts: { gte: since }
      },
      orderBy: { ts: "asc" }
    });

    const series = this.agg.bucketize(points, buckets, labels, {
      "economics.burn_share": { key: "burn_share", unit: "%" },
      "economics.validators_share": { key: "validators_share", unit: "%" },
      "economics.compute_pressure": { key: "compute_pressure", unit: "idx" },
      "economics.fee_mon": { key: "fee_mon", unit: "MON" }
    });

    const out: SeriesResponse = { window, step, labels, series };
    cache.set(key, out, 5_000);
    return out;
  }

  async getTxCompositionSeries({ window, step }: { window: Window; step: Step }): Promise<SeriesResponse> {
    const key = `series:txc:${window}:${step}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { labels, buckets } = this.agg.buildBuckets(windowToMs(window), stepToMs(step));
    const since = new Date(Date.now() - windowToMs(window));

    const points = await prisma.metricPoint.findMany({
      where: {
        seriesKey: { in: ["tx.mix.count"] },
        ts: { gte: since }
      },
      orderBy: { ts: "asc" }
    });

    // dim-based series (transfers / contract_calls / system_misc)
    const out = this.agg.bucketizeDim(points, buckets, labels, "tx.mix.count", {
      transfers: { key: "transfers", unit: "%" },
      contract_calls: { key: "contract_calls", unit: "%" },
      system_misc: { key: "system_misc", unit: "%" }
    });

    cache.set(key, out, 10_000);
    return out;
  }
}

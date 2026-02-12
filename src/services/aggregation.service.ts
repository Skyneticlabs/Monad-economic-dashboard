import { MetricPoint } from "@prisma/client";

function roundLabel(d: Date): string {
  // “HH:MM” for 24h style
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

type SeriesSpec = Record<string, { key: string; unit?: string }>;

export class AggregationService {
  emptySnapshot() {
    return {
      ts: new Date().toISOString(),
      network: {
        avgTxPerBlock: 0,
        avgBlockLoadPct: 0,
        avgBlockTimeSec: 0,
        peakLoad24hPct: 0,
        emptyBlocks24hPct: 0,
        avgBlockSizeMb: 0
      },
      fees: {
        avgTxFeeMon: 0,
        medianTxFeeMon: 0,
        costPerBlockMon: 0,
        feeLevelState: "unknown"
      },
      economics: {
        parallelEfficiencyPct: 0,
        stateConflictRatePct: 0,
        effectiveTps: 0,
        feeFlow: { burnPct: 0, validatorsPct: 0, adjustPct: 0 }
      },
      txComposition: {
        simpleTransfersPct: 0,
        contractCallsPct: 0,
        microTxPct: 0
      }
    };
  }

  buildBuckets(windowMs: number, stepMs: number) {
    const end = new Date();
    const start = new Date(Date.now() - windowMs);

    const buckets: Array<{ start: number; end: number }> = [];
    const labels: string[] = [];

    let t = start.getTime();
    while (t < end.getTime() + 1) {
      const bStart = t;
      const bEnd = t + stepMs;
      buckets.push({ start: bStart, end: bEnd });
      labels.push(roundLabel(new Date(bStart)));
      t = bEnd;
    }

    return { labels, buckets };
  }

  bucketize(
    points: MetricPoint[],
    buckets: Array<{ start: number; end: number }>,
    labels: string[],
    spec: SeriesSpec
  ) {
    const byKey = new Map<string, MetricPoint[]>();
    for (const p of points) {
      const arr = byKey.get(p.seriesKey) ?? [];
      arr.push(p);
      byKey.set(p.seriesKey, arr);
    }

    const series = Object.keys(spec).map((seriesKey) => {
      const pts = byKey.get(seriesKey) ?? [];
      const values = this.bucketAvg(pts, buckets);
      return { key: spec[seriesKey].key, unit: spec[seriesKey].unit, values };
    });

    return series;
  }

  bucketizeDim(
    points: MetricPoint[],
    buckets: Array<{ start: number; end: number }>,
    labels: string[],
    seriesKey: string,
    dims: Record<string, { key: string; unit?: string }>
  ) {
    const filtered = points.filter((p) => p.seriesKey === seriesKey);
    const byDim = new Map<string, MetricPoint[]>();

    for (const p of filtered) {
      const dim = p.dim ?? "unknown";
      const arr = byDim.get(dim) ?? [];
      arr.push(p);
      byDim.set(dim, arr);
    }

    const series = Object.keys(dims).map((dim) => {
      const pts = byDim.get(dim) ?? [];
      const values = this.bucketAvg(pts, buckets);
      return { key: dims[dim].key, unit: dims[dim].unit, values };
    });

    return {
      window: "24h",
      step: "2h",
      labels,
      series
    };
  }

  private bucketAvg(points: MetricPoint[], buckets: Array<{ start: number; end: number }>): number[] {
    const out: number[] = new Array(buckets.length).fill(NaN);

    let i = 0;
    for (let b = 0; b < buckets.length; b++) {
      const { start, end } = buckets[b];
      let sum = 0;
      let n = 0;

      while (i < points.length) {
        const ts = points[i].ts.getTime();
        if (ts < start) {
          i++;
          continue;
        }
        if (ts >= end) break;
        sum += points[i].value;
        n++;
        i++;
      }

      out[b] = n ? sum / n : NaN;
    }

    // forward fill NaN for smoother UX
    for (let k = 0; k < out.length; k++) {
      if (Number.isNaN(out[k]) && k > 0 && !Number.isNaN(out[k - 1])) out[k] = out[k - 1];
      if (Number.isNaN(out[k]) && k === 0) out[k] = 0;
    }

    return out;
  }
}

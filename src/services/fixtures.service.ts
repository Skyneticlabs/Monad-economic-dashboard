import { prisma } from "../db/prisma.js";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function floorToStep(ts: number, stepMs: number) {
  return Math.floor(ts / stepMs) * stepMs;
}

async function seed() {
  const now = Date.now();
  const step = 30 * 60 * 1000; // 30m
  const start = now - 24 * 60 * 60 * 1000;

  // Clean
  await prisma.metricPoint.deleteMany({});
  await prisma.snapshot.deleteMany({});

  // Generate points
  for (let t = floorToStep(start, step); t <= now; t += step) {
    const ts = new Date(t);

    // Network
    await prisma.metricPoint.createMany({
      data: [
        { seriesKey: "network.tx_per_block", ts, value: Math.round(rand(1800, 3000)) },
        { seriesKey: "network.block_size_mb", ts, value: +rand(3.1, 5.4).toFixed(2) }
      ],
      skipDuplicates: true
    });

    // Fees
    await prisma.metricPoint.createMany({
      data: [
        { seriesKey: "fees.avg_tx_fee_mon", ts, value: +rand(0.00022, 0.00055).toFixed(6) },
        { seriesKey: "fees.fee_vs_load_pct", ts, value: Math.round(rand(35, 95)) }
      ],
      skipDuplicates: true
    });

    // Economics
    const burnShare = +rand(0.30, 0.42).toFixed(3);
    const valShare = +(0.92 - burnShare + rand(-0.02, 0.02)).toFixed(3);
    await prisma.metricPoint.createMany({
      data: [
        { seriesKey: "economics.burn_share", ts, value: burnShare * 100 },
        { seriesKey: "economics.validators_share", ts, value: valShare * 100 },
        { seriesKey: "economics.compute_pressure", ts, value: +rand(42, 100).toFixed(1) },
        { seriesKey: "economics.fee_mon", ts, value: +rand(0.00022, 0.00055).toFixed(6) }
      ],
      skipDuplicates: true
    });

    // Tx composition (dim)
    const transfers = Math.round(rand(35, 48));
    const contract = Math.round(rand(40, 55));
    const system = Math.max(0, 100 - transfers - contract);
    await prisma.metricPoint.createMany({
      data: [
        { seriesKey: "tx.mix.count", ts, value: transfers, dim: "transfers" },
        { seriesKey: "tx.mix.count", ts, value: contract, dim: "contract_calls" },
        { seriesKey: "tx.mix.count", ts, value: system, dim: "system_misc" }
      ],
      skipDuplicates: true
    });
  }

  // Latest snapshot (consistent with your UI cards)
  const snapTs = new Date();
  await prisma.snapshot.create({
    data: {
      ts: snapTs,

      avgTxPerBlock: 2380,
      avgBlockLoadPct: 64,
      avgBlockTimeSec: 1.0,
      peakLoad24hPct: 92,
      emptyBlocks24hPct: 1.3,
      avgBlockSizeMb: 4.1,

      avgTxFeeMon: 0.00038,
      medianTxFeeMon: 0.00029,
      costPerBlockMon: 0.92,
      feeLevelState: "stable",

      parallelEfficiencyPct: 78,
      stateConflictRatePct: 6.4,
      effectiveTps: 2250,
      feeFlowBurnPct: 38,
      feeFlowValidatorsPct: 54,
      feeFlowAdjustPct: 8,

      simpleTransfersPct: 41,
      contractCallsPct: 46,
      microTxPct: 57
    }
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
}

if (process.argv.includes("--seed")) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

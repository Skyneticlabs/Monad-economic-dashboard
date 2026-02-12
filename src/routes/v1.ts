import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { MetricsService } from "../services/metrics.service.js";

const qsWindow = z.enum(["1h", "6h", "12h", "24h", "7d"]).default("24h");
const qsStep = z.enum(["15m", "30m", "1h", "2h", "4h", "24h"]).default("2h");

export const v1Routes: FastifyPluginAsync = async (app) => {
  const metrics = new MetricsService();

  app.get("/dashboard/snapshot", {
    schema: {
      description: "Current KPI snapshot for the dashboard cards.",
      tags: ["dashboard"]
    }
  }, async () => {
    return metrics.getSnapshot();
  });

  app.get("/timeseries/network-load", {
    schema: { tags: ["timeseries"] }
  }, async (req) => {
    const window = qsWindow.parse((req.query as any).window);
    const step = qsStep.parse((req.query as any).step);
    return metrics.getNetworkLoadSeries({ window, step });
  });

  app.get("/timeseries/fees", {
    schema: { tags: ["timeseries"] }
  }, async (req) => {
    const window = qsWindow.parse((req.query as any).window);
    const step = qsStep.parse((req.query as any).step);
    return metrics.getFeesSeries({ window, step });
  });

  app.get("/timeseries/economics", {
    schema: { tags: ["timeseries"] }
  }, async (req) => {
    const window = qsWindow.parse((req.query as any).window);
    const step = qsStep.parse((req.query as any).step);
    return metrics.getEconomicsSeries({ window, step });
  });

  app.get("/timeseries/tx-composition", {
    schema: { tags: ["timeseries"] }
  }, async (req) => {
    const window = qsWindow.parse((req.query as any).window);
    const step = qsStep.parse((req.query as any).step);
    return metrics.getTxCompositionSeries({ window, step });
  });
};

import Fastify, { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { logger } from "./lib/logger.js";
import { config } from "./lib/config.js";
import { healthRoutes } from "./routes/health.js";
import { v1Routes } from "./routes/v1.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: 1_000_000
  });

  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Monad Economic Dashboard API",
        version: "1.0.0",
        description: "Backend API for network load, fees, economics and usage analytics."
      }
    }
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list" }
  });

  app.get("/", async () => ({
    service: "monad-economic-dashboard-backend",
    version: "1.0.0",
    docs: "/docs",
    api: "/api/v1"
  }));

  await app.register(healthRoutes);
  await app.register(v1Routes, { prefix: "/api/v1" });

  return app;
}

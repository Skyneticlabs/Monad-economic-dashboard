import { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ ok: true }));

  app.get("/ready", async () => {
    // Basic DB readiness check
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, db: "up" };
  });
};

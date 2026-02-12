import { buildServer } from "./server.js";
import { logger } from "./lib/logger.js";
import { config } from "./lib/config.js";
import { startPoller } from "./jobs/poller.job.js";

async function main() {
  const app = await buildServer();

  // Start polling job (metrics ingestion)
  const stopPoller = startPoller();

  const shutdown = async (signal: string) => {
    try {
      logger.info({ signal }, "Shutting down...");
      stopPoller();
      await app.close();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Shutdown error");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  logger.info({ port: config.PORT }, "HTTP server listening");
}

main().catch((err) => {
  logger.error({ err }, "Fatal bootstrap error");
  process.exit(1);
});

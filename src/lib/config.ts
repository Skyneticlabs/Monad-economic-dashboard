import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().optional().default(8080),

  DATABASE_URL: z.string().min(10),

  MONAD_RPC_URL: z.string().url().default("https://rpc.monad.xyz"),

  POLL_INTERVAL_MS: z.coerce.number().optional().default(15_000),
  HISTORY_RETENTION_DAYS: z.coerce.number().optional().default(14),

  LOG_LEVEL: z.string().optional().default("info"),
  CORS_ORIGIN: z.string().optional().default("*")
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parsed.data.PORT,

  DATABASE_URL: parsed.data.DATABASE_URL,
  MONAD_RPC_URL: parsed.data.MONAD_RPC_URL,

  POLL_INTERVAL_MS: parsed.data.POLL_INTERVAL_MS,
  HISTORY_RETENTION_DAYS: parsed.data.HISTORY_RETENTION_DAYS,

  LOG_LEVEL: parsed.data.LOG_LEVEL,
  CORS_ORIGIN: parsed.data.CORS_ORIGIN
};

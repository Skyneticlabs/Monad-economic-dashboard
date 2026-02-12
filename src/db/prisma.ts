import { PrismaClient } from "@prisma/client";
import { config } from "../lib/config.js";

export const prisma = new PrismaClient({
  datasources: { db: { url: config.DATABASE_URL } }
});

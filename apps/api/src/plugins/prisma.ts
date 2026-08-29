import { FastifyInstance } from "fastify";
import { db } from "@repo/db";
import { env } from "../config/env";

declare module "fastify" {
  interface FastifyRequest {
    db: typeof db;
  }
}

export async function prismaPlugin(fastify: FastifyInstance) {
  fastify.decorate("db", db);

  await db.connect({ url: env.databaseUrl });
}

import { FastifyInstance } from "fastify";
import { db } from "@repo/db";

declare module "fastify" {
  interface FastifyRequest {
    db: typeof db;
  }
}

export async function prismaPlugin(fastify: FastifyInstance) {
  fastify.decorate("db", db);
}

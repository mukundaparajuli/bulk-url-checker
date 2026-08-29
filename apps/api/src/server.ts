import Fastify from "fastify";
import cors from "@fastify/cors";
import { batchRoutes } from "./routes/batch.routes";
import { prismaPlugin } from "./plugins/prisma";
import { env } from "./config/env";

const app = Fastify({
  logger: true,
});

app.register(cors, {
  origin: env.corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

app.register(prismaPlugin);
app.register(batchRoutes, { prefix: "/api" });

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

const start = async () => {
  try {
    await app.listen({
      port: env.port,
      host: env.host,
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

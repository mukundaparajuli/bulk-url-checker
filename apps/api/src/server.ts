import Fastify from "fastify";
import cors from "@fastify/cors";
import { batchRoutes } from "./routes/batch.routes";
import { prismaPlugin } from "./plugins/prisma";

const app = Fastify({
  logger: true,
});

app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
      port: 4000,
      host: "0.0.0.0",
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

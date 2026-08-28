import { FastifyInstance } from "fastify";
import { createBatchController, getBatchesController, getBatchByIdController } from "../controllers/batch.controller";

export async function batchRoutes(fastify: FastifyInstance) {
  fastify.post("/batches", createBatchController);
  fastify.get("/batches", getBatchesController);
  fastify.get("/batches/:id", getBatchByIdController);
}

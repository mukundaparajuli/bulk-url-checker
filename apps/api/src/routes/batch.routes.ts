import { FastifyInstance } from "fastify";
import {
  createBatchController,
  getBatchesController,
  getBatchByIdController,
  cancelBatchController,
  retryFailedController,
  batchEventsController,
} from "../controllers/batch.controller";

export async function batchRoutes(fastify: FastifyInstance) {
  fastify.post("/batches", createBatchController);
  fastify.get("/batches", getBatchesController);
  fastify.get("/batches/:id", getBatchByIdController);
  fastify.post("/batches/:id/cancel", cancelBatchController);
  fastify.post("/batches/:id/retry-failed", retryFailedController);
  fastify.get("/batches/:id/events", batchEventsController);
}

import { FastifyRequest, FastifyReply } from "fastify";
import { createBatch, getBatches, getBatchById } from "../services/batch.service";

export async function createBatchController(request: FastifyRequest, reply: FastifyReply) {
  const { urls } = request.body as { urls: string[] };
  const batch = await createBatch(urls);
  return reply.code(201).send({ id: batch.id });
}

export async function getBatchesController(_request: FastifyRequest, _reply: FastifyReply) {
  const batches = await getBatches();
  return batches;
}

export async function getBatchByIdController(request: FastifyRequest, _reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const batch = await getBatchById(id);
  if (!batch) {
    throw new Error("Batch not found");
  }
  return batch;
}

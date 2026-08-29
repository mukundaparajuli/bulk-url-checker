import { FastifyRequest, FastifyReply } from "fastify";
import {
  createBatch,
  getBatches,
  getBatchById,
  cancelBatch,
  retryFailedUrls,
} from "../services/batch.service";
import { addClient } from "../services/pubsub.service";

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

export async function cancelBatchController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const batch = await cancelBatch(id);
  return { status: batch.status };
}

export async function retryFailedController(request: FastifyRequest, _reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await retryFailedUrls(id);
  return result;
}

export async function batchEventsController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  reply.raw.write(`data: ${JSON.stringify({ type: "connected", batchId: id })}\n\n`);

  addClient(id, reply);

  request.raw.on("close", () => {
    reply.raw.end();
  });
}

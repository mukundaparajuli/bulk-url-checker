import { FastifyRequest, FastifyReply } from "fastify";
import {
  createBatch,
  getBatches,
  getBatchById,
  cancelBatch,
  retryFailedUrls,
} from "../services/batch.service";
import { addClient, removeClient } from "../services/pubsub.service";
import { env } from "../config/env";

export async function createBatchController(request: FastifyRequest, reply: FastifyReply) {
  const { urls } = request.body as { urls: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return reply.code(400).send({ error: "urls must be a non-empty array" });
  }

  if (urls.length > 1000) {
    return reply.code(400).send({ error: "Maximum 1000 URLs per batch" });
  }

  for (const url of urls) {
    if (typeof url !== "string" || url.length === 0) {
      return reply.code(400).send({ error: "Each URL must be a non-empty string" });
    }
  }

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
    "Access-Control-Allow-Origin": env.corsOrigin,
    "Access-Control-Allow-Credentials": "true",
  });

  reply.raw.write(`data: ${JSON.stringify({ type: "connected", batchId: id })}\n\n`);

  addClient(id, reply);

  const heartbeat = setInterval(() => {
    if (reply.raw.writable) {
      reply.raw.write(":keepalive\n\n");
    }
  }, 15_000);

  request.raw.on("close", () => {
    clearInterval(heartbeat);
    removeClient(id, reply);
    if (!reply.raw.destroyed) {
      reply.raw.end();
    }
  });
}

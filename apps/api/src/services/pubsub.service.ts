import Redis from "ioredis";
import { FastifyReply } from "fastify";
import { env } from "../config/env";

const clients = new Map<string, Set<FastifyReply>>();

const subscriber = new Redis(env.redisUrl);

subscriber.subscribe("batch-events");

subscriber.on("message", (_channel, message) => {
  try {
    const event = JSON.parse(message);
    if (event.type === "batch.updated" && event.batchId) {
      const set = clients.get(event.batchId);
      if (set) {
        for (const reply of set) {
          reply.raw.write(`data: ${message}\n\n`);
        }
      }
    }
  } catch {
    // ignore malformed messages
  }
});

export function addClient(batchId: string, reply: FastifyReply) {
  if (!clients.has(batchId)) {
    clients.set(batchId, new Set());
  }
  clients.get(batchId)!.add(reply);

  reply.raw.on("close", () => {
    const set = clients.get(batchId);
    if (set) {
      set.delete(reply);
      if (set.size === 0) {
        clients.delete(batchId);
      }
    }
  });
}

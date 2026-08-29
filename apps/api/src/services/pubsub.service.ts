import Redis from "ioredis";
import { FastifyReply } from "fastify";
import type { BatchUpdatedEvent } from "@repo/shared";
import { env } from "../config/env";

const clients = new Map<string, Set<FastifyReply>>();

const subscriber = new Redis(env.redisUrl);

subscriber.subscribe("batch-events");

subscriber.on("message", (_channel, message) => {
  try {
    const event: BatchUpdatedEvent = JSON.parse(message);
    if (event.type === "batch.updated" && event.batchId) {
      const set = clients.get(event.batchId);
      if (set) {
        for (const reply of set) {
          if (reply.raw.writable) {
            try {
              reply.raw.write(`data: ${message}\n\n`);
            } catch {
              set.delete(reply);
            }
          } else {
            set.delete(reply);
          }
        }
        if (set.size === 0) {
          clients.delete(event.batchId);
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
}

export function removeClient(batchId: string, reply: FastifyReply) {
  const set = clients.get(batchId);
  if (set) {
    set.delete(reply);
    if (set.size === 0) {
      clients.delete(batchId);
    }
  }
}

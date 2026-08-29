export const env = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || "0.0.0.0",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
} as const;

export const env = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
} as const;

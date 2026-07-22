export default () => ({
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  globalPrefix: process.env.API_PREFIX || "api",

  cors: {
    origins: (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  },

  database: {
    type: "postgres" as const,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USERNAME || "puviarasuk",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "wait_less",
    // Never enable in production. Use migrations instead of schema sync.
    synchronize: process.env.DB_SYNCHRONIZE === "true",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? "0", 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresInSeconds: parseInt(
      process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? String(15 * 60),
      10,
    ),
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresInSeconds: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? String(7 * 24 * 60 * 60),
      10,
    ),
  },

  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? "60000", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? "60", 10),
  },
});

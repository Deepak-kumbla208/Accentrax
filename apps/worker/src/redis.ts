/** Shared Redis connection options for BullMQ queues and workers. */
export const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  // BullMQ requires this to be null for blocking commands.
  maxRetriesPerRequest: null as null,
};

/** Queue names. New queues (ocr, email-poll, pdf, notify) are added per phase. */
export const Queues = {
  SYSTEM: 'system',
} as const;

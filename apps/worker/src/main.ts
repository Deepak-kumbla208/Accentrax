import { Queue, Worker, type Job } from 'bullmq';
import { logger } from './logger';
import { Queues, redisConnection } from './redis';

/**
 * Worker bootstrap.
 *
 * Phase 0: a single `system` queue with a `ping` job to prove the
 * Redis → enqueue → process round-trip. Real processors (OCR, email
 * polling, PDF render, notifications) are registered here from Phase 3+.
 */
async function processJob(job: Job): Promise<unknown> {
  logger.info({ name: job.name, id: job.id, data: job.data }, 'processing job');
  if (job.name === 'ping') {
    return { pong: true, at: new Date().toISOString() };
  }
  return null;
}

async function main(): Promise<void> {
  const queue = new Queue(Queues.SYSTEM, { connection: redisConnection });

  const worker = new Worker(Queues.SYSTEM, processJob, { connection: redisConnection });

  worker.on('completed', (job, result) =>
    logger.info({ id: job.id, result }, 'job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error({ id: job?.id, err: err.message }, 'job failed'),
  );

  // Prove the round-trip on boot.
  await queue.add('ping', { hello: 'accentrax' });
  logger.info('worker started; enqueued startup ping');

  const shutdown = async () => {
    logger.info('shutting down worker');
    await worker.close();
    await queue.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

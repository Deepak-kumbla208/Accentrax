import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client wrapped as a Nest provider.
 *
 * Soft-delete middleware is registered here so it applies globally:
 *  - reads exclude soft-deleted rows unless explicitly overridden
 *  - `delete`/`deleteMany` are rewritten to set `deletedAt`
 *
 * Models are added from Phase 1 onward; the middleware is model-agnostic
 * and only acts on models that actually declare a `deletedAt` column.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Models that opt into soft delete (populated as schema grows). */
  private static readonly softDeleteModels = new Set<string>([]);

  constructor() {
    super({ log: ['warn', 'error'] });
    this.registerSoftDelete();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private registerSoftDelete(): void {
    this.$use(async (params, next) => {
      const model = params.model;
      if (!model || !PrismaService.softDeleteModels.has(model)) {
        return next(params);
      }

      // Rewrite hard deletes into soft deletes.
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      } else if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = { ...(params.args.data ?? {}), deletedAt: new Date() };
      }

      // Exclude soft-deleted rows from reads unless caller opts in.
      if (
        (params.action === 'findFirst' ||
          params.action === 'findMany' ||
          params.action === 'count') &&
        params.args?.where?.deletedAt === undefined
      ) {
        params.args = params.args ?? {};
        params.args.where = { ...(params.args.where ?? {}), deletedAt: null };
      }

      return next(params);
    });
  }
}

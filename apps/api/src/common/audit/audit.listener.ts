import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditEvent } from './audit-event';
import { AUDIT_LOG_EVENT } from './audit-event';

/** Persists audit events. The log is append-only — never updated or deleted. */
@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(AUDIT_LOG_EVENT, { async: true })
  async handle(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: event.actorId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          before: event.before === undefined ? undefined : (event.before as object),
          after: event.after === undefined ? undefined : (event.after as object),
          ip: event.ip,
          device: event.device,
        },
      });
    } catch (err) {
      // Audit failures must never break the request that triggered them.
      this.logger.error('Failed to persist audit log', err instanceof Error ? err.stack : err);
    }
  }
}

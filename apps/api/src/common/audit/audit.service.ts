import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AuditEvent } from './audit-event';
import { AUDIT_LOG_EVENT } from './audit-event';

/**
 * Entry point for emitting audit events. Callers (interceptor or services
 * that need richer before/after diffs) emit through here; the AuditListener
 * persists asynchronously — decoupled per the event-driven design.
 */
@Injectable()
export class AuditService {
  constructor(private readonly events: EventEmitter2) {}

  record(event: AuditEvent): void {
    this.events.emit(AUDIT_LOG_EVENT, event);
  }
}

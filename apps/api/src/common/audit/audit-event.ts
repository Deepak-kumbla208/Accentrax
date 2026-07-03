/** Payload emitted on the `audit.log` event; persisted by AuditListener. */
export interface AuditEvent {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before?: unknown;
  after?: unknown;
  ip: string | null;
  device: string | null;
}

export const AUDIT_LOG_EVENT = 'audit.log';

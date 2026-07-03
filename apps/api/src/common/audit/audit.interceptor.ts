import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Baseline audit capture for every mutating request: actor/action/resource/
 * ip/device. Services that need a full before/after diff call AuditService
 * directly with richer detail (e.g. invoice edits) — this interceptor covers
 * the rest so nothing mutating goes unlogged.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();

    if (!MUTATING_METHODS.has(req.method)) {
      return next.handle();
    }

    // Controller-level @Controller('x') path — independent of the global
    // API prefix, so this is stable regardless of how the app is mounted.
    const resourceType: string =
      Reflect.getMetadata(PATH_METADATA, context.getClass()) ?? req.path;
    const resourceId = typeof req.params?.id === 'string' ? req.params.id : null;
    const path = req.route?.path ?? req.path;

    return next.handle().pipe(
      tap((responseBody) => {
        this.audit.record({
          actorId: req.user?.id ?? null,
          action: `${req.method} ${path}`,
          resourceType,
          resourceId,
          after: responseBody,
          ip: req.ip ?? null,
          device: req.headers['user-agent'] ?? null,
        });
      }),
    );
  }
}

import { Global, Module } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AuditListener } from './audit.listener';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [AuditService, AuditListener, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}

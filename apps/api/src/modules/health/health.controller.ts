import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@accentrax/types';
import { Public } from '../../common/auth/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — process is up. */
  @Get()
  health(): HealthResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness — dependencies (DB) reachable. */
  @Get('ready')
  async ready(): Promise<HealthResponse> {
    let db: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'error',
      info: { database: { status: db } },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

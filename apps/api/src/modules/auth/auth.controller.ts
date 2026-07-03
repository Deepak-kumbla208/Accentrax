import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import type { RequestUser } from '../../common/auth/request-user';
import type { Env } from '../../config/env.validation';
import { AuthService, type AuthResult, type RequestMeta } from './auth.service';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { data: this.publicResult(result) };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    const result = await this.auth.refresh(token, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { data: this.publicResult(result) };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    await this.auth.logout(token, this.meta(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { data: { success: true } };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { data: user };
  }

  private meta(req: Request): RequestMeta {
    const userAgent = req.headers['user-agent'];
    return {
      ip: req.ip ?? null,
      device: typeof userAgent === 'string' ? userAgent : null,
    };
  }

  private publicResult(result: AuthResult) {
    return { accessToken: result.accessToken, user: result.user };
  }

  private setRefreshCookie(res: Response, token: string): void {
    const ttlSeconds = this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true });
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      maxAge: ttlSeconds * 1000,
      path: '/',
    });
  }
}

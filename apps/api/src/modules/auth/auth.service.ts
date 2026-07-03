import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../common/auth/password.service';
import { AuditService } from '../../common/audit/audit.service';
import type { Env } from '../../config/env.validation';
import { UsersService } from '../users/users.service';
import { RefreshTokenStore } from './refresh-token.store';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; roles: string[]; permissions: string[] };
}

export interface RequestMeta {
  ip: string | null;
  device: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly refreshTokens: RefreshTokenStore,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.passwords.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.users.touchLastLogin(user.id);

    const profile = this.users.toAuthProfile(user);
    const result = await this.issueTokens(profile);

    this.audit.record({
      actorId: user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
      ip: meta.ip,
      device: meta.device,
    });

    return result;
  }

  async refresh(presentedRefreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(presentedRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const valid = await this.refreshTokens.consume(payload.sub, payload.jti);
    if (!valid) {
      throw new UnauthorizedException('Session has been revoked — please sign in again');
    }

    const user = await this.users.getOrThrow(payload.sub);
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const profile = this.users.toAuthProfile(user);
    const result = await this.issueTokens(profile);

    this.audit.record({
      actorId: user.id,
      action: 'auth.refresh',
      resourceType: 'user',
      resourceId: user.id,
      ip: meta.ip,
      device: meta.device,
    });

    return result;
  }

  async logout(presentedRefreshToken: string | undefined, meta: RequestMeta): Promise<void> {
    if (!presentedRefreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; jti: string }>(
        presentedRefreshToken,
        { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }) },
      );
      await this.refreshTokens.revoke(payload.sub, payload.jti);
      this.audit.record({
        actorId: payload.sub,
        action: 'auth.logout',
        resourceType: 'user',
        resourceId: payload.sub,
        ip: meta.ip,
        device: meta.device,
      });
    } catch {
      // Already invalid/expired — nothing to revoke.
    }
  }

  private async issueTokens(profile: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  }): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync(
      {
        sub: profile.id,
        email: profile.email,
        name: profile.name,
        roles: profile.roles,
        permissions: profile.permissions,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );

    const jti = await this.refreshTokens.issue(profile.id);
    const refreshToken = await this.jwt.signAsync(
      { sub: profile.id, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        roles: profile.roles,
        permissions: profile.permissions,
      },
    };
  }
}

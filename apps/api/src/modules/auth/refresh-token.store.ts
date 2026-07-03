import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import type { Env } from '../../config/env.validation';

const tokenKey = (jti: string) => `refresh:token:${jti}`;
const userSetKey = (userId: string) => `refresh:user:${userId}`;

/**
 * Tracks issued refresh-token ids (jti) in Redis so tokens can be rotated
 * and revoked server-side — the "revocation list" called for in the design.
 * If a jti is presented that isn't in the store, it has already been
 * rotated or revoked; we treat that as possible token theft and revoke
 * every session for that user.
 */
@Injectable()
export class RefreshTokenStore {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService<Env, true>,
  ) {
    this.ttlSeconds = config.get('JWT_REFRESH_TTL_SECONDS', { infer: true });
  }

  async issue(userId: string): Promise<string> {
    const jti = randomUUID();
    await this.redis
      .multi()
      .set(tokenKey(jti), userId, 'EX', this.ttlSeconds)
      .sadd(userSetKey(userId), jti)
      .expire(userSetKey(userId), this.ttlSeconds)
      .exec();
    return jti;
  }

  /** Validates a jti belongs to userId; on mismatch, revokes all of the user's sessions. */
  async consume(userId: string, jti: string): Promise<boolean> {
    const owner = await this.redis.get(tokenKey(jti));
    if (owner !== userId) {
      await this.revokeAll(userId);
      return false;
    }
    await this.redis.multi().del(tokenKey(jti)).srem(userSetKey(userId), jti).exec();
    return true;
  }

  async revoke(userId: string, jti: string): Promise<void> {
    await this.redis.multi().del(tokenKey(jti)).srem(userSetKey(userId), jti).exec();
  }

  async revokeAll(userId: string): Promise<void> {
    const jtis = await this.redis.smembers(userSetKey(userId));
    if (jtis.length > 0) {
      await this.redis.del(...jtis.map(tokenKey), userSetKey(userId));
    }
  }
}

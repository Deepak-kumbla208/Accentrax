import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../../config/env.validation';
import { RefreshTokenStore } from './refresh-token.store';

/** Minimal in-memory stand-in for the subset of ioredis used by RefreshTokenStore. */
function makeFakeRedis() {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  const multi = () => {
    const ops: Array<() => void> = [];
    const chain = {
      set: (key: string, value: string) => {
        ops.push(() => store.set(key, value));
        return chain;
      },
      sadd: (key: string, member: string) => {
        ops.push(() => {
          if (!sets.has(key)) sets.set(key, new Set());
          sets.get(key)!.add(member);
        });
        return chain;
      },
      srem: (key: string, member: string) => {
        ops.push(() => sets.get(key)?.delete(member));
        return chain;
      },
      del: (key: string) => {
        ops.push(() => {
          store.delete(key);
          sets.delete(key);
        });
        return chain;
      },
      expire: () => chain,
      exec: async () => {
        ops.forEach((op) => op());
      },
    };
    return chain;
  };

  return {
    multi,
    get: async (key: string) => store.get(key) ?? null,
    smembers: async (key: string) => [...(sets.get(key) ?? [])],
    del: async (...keys: string[]) => {
      keys.forEach((k) => {
        store.delete(k);
        sets.delete(k);
      });
    },
  };
}

describe('RefreshTokenStore', () => {
  let redis: ReturnType<typeof makeFakeRedis>;
  let store: RefreshTokenStore;

  beforeEach(() => {
    redis = makeFakeRedis();
    const config = { get: () => 604_800 } as unknown as ConfigService<Env, true>;
    store = new RefreshTokenStore(redis as any, config);
  });

  it('issues a jti that can be consumed exactly once', async () => {
    const jti = await store.issue('user-1');
    expect(await store.consume('user-1', jti)).toBe(true);
    expect(await store.consume('user-1', jti)).toBe(false); // already consumed
  });

  it('revokes all sessions for a user when a stale/unknown jti is presented (theft response)', async () => {
    const jti1 = await store.issue('user-1');
    await store.issue('user-1');

    // Simulate a stolen/already-used token being replayed.
    const ok = await store.consume('user-1', 'not-a-real-jti');
    expect(ok).toBe(false);

    // The legitimate token issued earlier should now also be revoked.
    expect(await store.consume('user-1', jti1)).toBe(false);
  });

  it('revoke() removes a single session without affecting others', async () => {
    const jti1 = await store.issue('user-1');
    const jti2 = await store.issue('user-1');

    await store.revoke('user-1', jti1);

    // Check the untouched session first: consume() on an invalid jti (jti1,
    // checked below) triggers the theft-response cascade above, which would
    // otherwise wipe jti2 too and make this assertion order-dependent.
    expect(await store.consume('user-1', jti2)).toBe(true);
    expect(await store.consume('user-1', jti1)).toBe(false);
  });
});

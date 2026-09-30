import { createClient, type RedisClientType } from 'redis';

let redisClientPromise: Promise<RedisClientType | null> | null = null;
let lastFailureAt: number | null = null;

// Bounded reconnection: without this, node-redis retries an unreachable server
// forever and queued commands never settle — callers (the chat route) hang.
export const REDIS_FAILURE_COOLDOWN_MS = 60_000;

export function getRedisUrl() {
  return process.env.REDIS_URL?.trim() || null;
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) return null;

  if (lastFailureAt && Date.now() - lastFailureAt < REDIS_FAILURE_COOLDOWN_MS) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({
        url,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: (retries) =>
            retries < 3 ? Math.min(100 * 2 ** retries, 400) : false,
        },
      });

      client.on('error', (error) => {
        console.error('Redis client error:', error);
      });

      await client.connect();
      lastFailureAt = null;
      return client as RedisClientType;
    })().catch((error) => {
      redisClientPromise = null;
      lastFailureAt = Date.now();
      console.error('Redis connection error:', error);
      return null;
    });
  }

  return redisClientPromise;
}

/** Clears the cached promise and failure cooldown — test isolation only. */
export function __resetRedisStateForTests() {
  redisClientPromise = null;
  lastFailureAt = null;
}

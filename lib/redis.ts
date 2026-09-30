import { createClient, type RedisClientType } from 'redis';

let redisClientPromise: Promise<RedisClientType | null> | null = null;
let lastFailureAt: number | null = null;

// Bounded reconnection: without this, node-redis retries an unreachable server
// forever and queued commands never settle — callers (the chat route) hang.
export const REDIS_FAILURE_COOLDOWN_MS = 60_000;

export function getRedisUrl() {
  return process.env.REDIS_URL?.trim() || null;
}

/**
 * Terminal-error handler for the live client. A mid-flight outage (Redis dies
 * after a successful connect) leaves the client permanently closed once the
 * bounded reconnects give up — without this, the dead client stays cached and
 * caching is silently disabled until the process restarts even after Redis
 * returns. Dropping the cached client + starting the cooldown lets the next
 * caller re-enter the normal retry cycle.
 */
export function __handleRedisClientError(error: unknown) {
  redisClientPromise = null;
  lastFailureAt = Date.now();
  console.error('Redis client error:', error);
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

      client.on('error', __handleRedisClientError);

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

/** Simulates a successful connect — test setup for mid-flight error paths. */
export function __setRedisClientForTests(client: RedisClientType) {
  redisClientPromise = Promise.resolve(client);
  lastFailureAt = null;
}

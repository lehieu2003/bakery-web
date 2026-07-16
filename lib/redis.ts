import { createClient, type RedisClientType } from 'redis';

let redisClientPromise: Promise<RedisClientType | null> | null = null;

export function getRedisUrl() {
  return process.env.REDIS_URL?.trim() || null;
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) return null;

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({ url });

      client.on('error', (error) => {
        console.error('Redis client error:', error);
      });

      await client.connect();
      return client as RedisClientType;
    })().catch((error) => {
      redisClientPromise = null;
      console.error('Redis connection error:', error);
      return null;
    });
  }

  return redisClientPromise;
}

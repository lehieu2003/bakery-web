import test from 'node:test';
import assert from 'node:assert/strict';

test('getRedisClient resolves null within 2s when Redis is unreachable', async () => {
  process.env.REDIS_URL = 'redis://127.0.0.1:59999'; // closed port, nothing listens
  const { getRedisClient, __resetRedisStateForTests } = await import('@/lib/redis');
  __resetRedisStateForTests();
  const started = Date.now();
  const client = await Promise.race([
    getRedisClient(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('getRedisClient hung')), 2000),
    ),
  ]);
  assert.equal(client, null);
  assert.ok(Date.now() - started < 2000);
});

test('calls within the cooldown window return null instantly', async () => {
  process.env.REDIS_URL = 'redis://127.0.0.1:59999';
  const { getRedisClient, __resetRedisStateForTests, REDIS_FAILURE_COOLDOWN_MS } =
    await import('@/lib/redis');
  __resetRedisStateForTests();
  await getRedisClient(); // first call fails, starts cooldown
  const started = Date.now();
  const second = await getRedisClient();
  assert.equal(second, null);
  assert.ok(Date.now() - started < 100, 'cooldown hit must not reconnect');
  assert.ok(REDIS_FAILURE_COOLDOWN_MS >= 30_000);
});

test('no REDIS_URL resolves null immediately', async () => {
  delete process.env.REDIS_URL;
  const { getRedisClient, __resetRedisStateForTests } = await import('@/lib/redis');
  __resetRedisStateForTests();
  assert.equal(await getRedisClient(), null);
});

test('a terminal mid-flight error drops the cached dead client', async () => {
  process.env.REDIS_URL = 'redis://127.0.0.1:59999';
  const mod = await import('@/lib/redis');
  mod.__resetRedisStateForTests();
  // Simulate a client that connected successfully, then died mid-flight
  // (what the real client looks like after its bounded reconnects give up).
  const deadClient = { isReady: false, isOpen: false };
  mod.__setRedisClientForTests(deadClient as never);
  // The 'error' event the real client emits mid-flight must drop the cached
  // dead client and start the cooldown — otherwise caching stays dead until
  // the process restarts even after Redis comes back.
  mod.__handleRedisClientError(new Error('Connection closed'));
  const started = Date.now();
  const client = await mod.getRedisClient();
  assert.equal(client, null);
  assert.ok(Date.now() - started < 100, 'must re-enter cooldown, not reuse the dead client');
});

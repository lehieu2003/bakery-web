import test from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonLdString } from '@/lib/json-ld';

test('safeJsonLdString escapes </script> breakout payloads', () => {
  const value = { a: '</script><script>alert(1)</script>' };
  const output = safeJsonLdString(value);

  assert.ok(!output.includes('</script>'));
  assert.deepEqual(JSON.parse(output), value);
});

test('safeJsonLdString escapes every < as \\u003c', () => {
  const value = { a: '<', b: { c: ['x<y', 1, true, null] } };
  const output = safeJsonLdString(value);

  assert.equal(output, JSON.stringify(value).replace(/</g, '\\u003c'));
  assert.deepEqual(JSON.parse(output), value);
});

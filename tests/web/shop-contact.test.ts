import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { SHOP_PHONE } from '@/lib/shop-contact';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
  });
}

const files = ['app', 'components'].flatMap((dir) =>
  sourceFiles(path.join(process.cwd(), dir)),
);

test('the hotline display and tel forms are the same number', () => {
  assert.equal(SHOP_PHONE.display.replace(/\s/g, ''), SHOP_PHONE.tel);
});

test('pages take the phone number from lib/shop-contact, never hard-coded', () => {
  // A hand-typed tel: link once dialled 19007799 (two digits short), and the
  // store page showed a second, different number.
  const offenders = files.filter((file) => {
    const source = readFileSync(file, 'utf8');
    return /tel:\d/.test(source) || /978[\s.]?780[\s.]?176|1900[\s.]?779907/.test(source);
  });
  assert.deepEqual(offenders.map((file) => path.relative(process.cwd(), file)), []);
});

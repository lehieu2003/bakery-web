import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// In CIELAB the relative luminance Y depends on L* alone, so contrast between
// two tokens follows exactly from their L* values.
const css = readFileSync(path.join(process.cwd(), 'styles/globals.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));

function lightness(token: string): number {
  const match = rootBlock.match(new RegExp(`--${token}:\\s*lab\\(([\\d.]+)%`));
  assert.ok(match, `--${token} is not a lab() color`);
  return Number(match[1]);
}

function luminance(l: number): number {
  const fy = (l + 16) / 116;
  return l > 8 ? fy ** 3 : l / 903.3;
}

function contrast(a: number, b: number): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('button text on the brand pink meets WCAG AA (4.5:1)', () => {
  assert.ok(contrast(lightness('primary'), lightness('primary-foreground')) >= 4.5);
});

test('brand pink text on the page background meets WCAG AA (4.5:1)', () => {
  assert.ok(contrast(lightness('primary'), lightness('background')) >= 4.5);
  assert.ok(contrast(lightness('primary'), lightness('card')) >= 4.5);
});

test('focus ring and deep pink stay the same brand pink', () => {
  assert.equal(lightness('ring'), lightness('primary'));
  assert.equal(lightness('pink-deep'), lightness('primary'));
});

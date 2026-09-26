import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { palette, paletteTokens } from '../src/lib/brand-palette';

const css = readFileSync('src/styles/global.css', 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')));

describe('brand palette', () => {
  it.each(Object.entries(paletteTokens))('%s sama dengan token %s di global.css', (key, token) => {
    const match = root.match(new RegExp(`\\n\\s*${token}:\\s*(#[0-9a-f]{6})\\b`, 'i'));
    expect(match?.[1]?.toLowerCase()).toBe(palette[key as keyof typeof palette]);
  });
});

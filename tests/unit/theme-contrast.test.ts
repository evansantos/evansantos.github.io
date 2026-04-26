import { test } from 'poku';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_THEMES } from '../../src/terminal/themes/unlocks.js';

const STYLES_DIR = new URL('../../src/terminal/themes/styles/', import.meta.url);

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = hexToLuminance(a);
  const l2 = hexToLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function parseVars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(--t-fg|--t-bg|--t-accent):\s*(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/gm;
  for (const m of css.matchAll(re)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

for (const theme of ALL_THEMES) {
  test(`theme "${theme}": fg/bg contrast >= 4.5 (WCAG AA body text)`, () => {
    const css = readFileSync(new URL(`${theme}.css`, STYLES_DIR), 'utf8');
    const vars = parseVars(css);
    assert.ok(vars['--t-fg'], `${theme}: --t-fg not found`);
    assert.ok(vars['--t-bg'], `${theme}: --t-bg not found`);
    const ratio = contrastRatio(vars['--t-fg'], vars['--t-bg']);
    assert.ok(
      ratio >= 4.5,
      `${theme}: fg ${vars['--t-fg']} on bg ${vars['--t-bg']} = ${ratio.toFixed(2)} (need >= 4.5)`,
    );
  });

  test(`theme "${theme}": accent/bg contrast >= 3.0 (WCAG AA large text)`, () => {
    const css = readFileSync(new URL(`${theme}.css`, STYLES_DIR), 'utf8');
    const vars = parseVars(css);
    assert.ok(vars['--t-accent'], `${theme}: --t-accent not found`);
    assert.ok(vars['--t-bg'], `${theme}: --t-bg not found`);
    const ratio = contrastRatio(vars['--t-accent'], vars['--t-bg']);
    assert.ok(
      ratio >= 3.0,
      `${theme}: accent ${vars['--t-accent']} on bg ${vars['--t-bg']} = ${ratio.toFixed(2)} (need >= 3.0)`,
    );
  });
}

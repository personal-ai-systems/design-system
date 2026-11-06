// Cross-adapter parity tests.
//
// The claim this file defends: one canonical source, two adapters, no drift.
// Values may be *expressed* differently (rem vs number, unitless ratio vs px),
// but the underlying numbers must be identical.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, loadMappings, loadModel } from '../scripts/lib/tokens.mjs';

const { core, registry } = loadModel();
const mappings = loadMappings();
const ROOT_FONT = mappings.web.rootFontSizePx;

const webCss = readFileSync(join(PATHS.dist, 'web', 'variables.css'), 'utf8');
const native = await import(pathToFileURL(join(PATHS.dist, 'native', 'theme.js')).href);

test('documented native styles use real roles and omit platform-default font metadata', () => {
  for (const platform of ['ios', 'android']) {
    const typography = native.typographyFor(platform);
    const title = { ...typography['heading-1'], color: native.themeColors('light')['on-surface'] };
    assert.equal(typeof title.fontSize, 'number');
    assert.match(title.color, /^#[0-9a-f]{6}$/i);
    for (const style of Object.values(typography)) {
      assert.equal('fontFamilyKey' in style, false);
      assert.notEqual(style.fontFamily, null);
      assert.ok(['400', '500', '600'].includes(style.fontWeight));
    }
    assert.equal('fontFamily' in typography.body, false);
    assert.equal(typeof typography.code.fontFamily, 'string');
  }
  assert.throws(() => native.typographyFor('web'), /unsupported platform/);
});

function declarationsFor(themeName) {
  const clean = webCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(clean))) {
    const selector = match[1].trim();
    if (!selector.includes(`[data-${core.meta.namespace}-theme="${themeName}"]`)) continue;
    const map = new Map();
    for (const line of match[2].split(';')) {
      const index = line.indexOf(':');
      if (index === -1) continue;
      map.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
    }
    return map;
  }
  throw new Error(`no CSS block for theme "${themeName}"`);
}

function rootVariables() {
  const clean = webCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = clean.indexOf(':root {');
  const end = clean.indexOf('}', start);
  const map = new Map();
  for (const line of clean.slice(start + 7, end).split(';')) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    map.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return map;
}

const root = rootVariables();
const remToPx = (value) => {
  if (value === '0') return 0;
  const match = String(value).match(/^([\d.]+)rem$/);
  assert.ok(match, `expected a rem value, got ${value}`);
  return Number(match[1]) * ROOT_FONT;
};

test('both adapters publish the same colour values for every role and theme', () => {
  for (const entry of registry.themes) {
    const css = declarationsFor(entry.name);
    const colors = native.themeColors(entry.name);
    for (const role of core.requirements.colorRoles) {
      const fromCss = css.get(`--${core.meta.namespace}-color-${role}`);
      assert.equal(fromCss, colors[role], `${entry.name}/${role}`);
    }
  }
});

test('every web rem size maps onto the native numeric size', () => {
  for (const role of core.requirements.typographyRoles) {
    const style = native.typography[role];
    const webSize = remToPx(root.get(`--${core.meta.namespace}-font-${role}-size`));
    assert.equal(webSize, style.fontSize, `${role} fontSize`);
    const webLeading = Number(root.get(`--${core.meta.namespace}-font-${role}-leading`));
    assert.equal(
      style.lineHeight,
      Math.round(style.fontSize * webLeading),
      `${role} lineHeight is not round(fontSize x ratio)`
    );
  }
});

test('letter spacing is 0 in both adapters', () => {
  for (const role of core.requirements.typographyRoles) {
    assert.equal(native.typography[role].letterSpacing, 0, `${role} native letterSpacing`);
    assert.equal(
      root.get(`--${core.meta.namespace}-font-${role}-tracking`),
      '0',
      `${role} web tracking`
    );
  }
});

test('spacing, borders and durations convert without rounding drift', () => {
  for (const [key, dimension] of Object.entries(native.spacing)) {
    const cssKey = `--${core.meta.namespace}-space-${key}`;
    if (!root.has(cssKey)) continue; // roles are asserted separately
    assert.equal(remToPx(root.get(cssKey)), dimension, `space ${key}`);
  }
  for (const [key, value] of Object.entries(native.border)) {
    const css = root.get(`--${core.meta.namespace}-border-${key}`);
    assert.equal(Number(String(css).replace('px', '')), value, `border ${key}`);
  }
  for (const [key, value] of Object.entries(native.motion.duration)) {
    const css = root.get(`--${core.meta.namespace}-motion-${key}`);
    assert.equal(Number(String(css).replace('ms', '')), value, `duration ${key}`);
  }
});

test('easing is the same curve, described in each platform idiom', () => {
  const { x1, y1, x2, y2 } = native.motion.easing.standard;
  assert.equal(
    root.get(`--${core.meta.namespace}-motion-easing`),
    `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
  );
});

test('elevation layers agree on offsets, blur and spread', () => {
  const cssLength = (value) => (value === 0 ? '0' : `${value}px`);
  for (const [key, layers] of Object.entries(native.elevation)) {
    const css = root.get(`--${core.meta.namespace}-elevation-${key}`);
    if (!layers.length) {
      assert.equal(css, 'none');
      continue;
    }
    assert.equal(css.split(', ').length, layers.length, `${key} layer count`);
    for (const [index, layer] of layers.entries()) {
      const expected = `${cssLength(layer.offsetX)} ${cssLength(layer.offsetY)} ${cssLength(
        layer.blur
      )} ${cssLength(layer.spread)} ${layer.color}`;
      assert.equal(css.split(', ')[index], expected, `${key} layer ${index}`);
    }
  }
});

test('the native adapter carries no web-only unit or function', () => {
  const code = readFileSync(join(PATHS.dist, 'native', 'theme.js'), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  for (const forbidden of ['rem', 'px', 'var(--', 'cubic-bezier', 'box-shadow']) {
    assert.equal(code.includes(forbidden), false, `native output contains ${forbidden}`);
  }
});

test('native cannot silently lose the shadow spread limitation', () => {
  assert.ok(native.unsupportedFields.some((item) => /spread/i.test(item)));
  assert.ok(native.futureAdapters.some((item) => /SwiftUI/i.test(item)));
  assert.match(native.meta.scope, /not a mobile component library/i);
});

test('web-only concerns stay out of the canonical core', () => {
  // Descriptions may *mention* a web concept; token values may not carry one.
  // The value-level rule is enforced by typeProblems() in contract.test.mjs.
  const coreText = readFileSync(PATHS.core, 'utf8');
  for (const forbidden of ['cubic-bezier(', 'font-family:', '"rem"', '"ch"']) {
    assert.equal(coreText.includes(forbidden), false, `core contains ${forbidden}`);
  }
});

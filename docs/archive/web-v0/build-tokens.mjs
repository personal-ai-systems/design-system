#!/usr/bin/env node
// Generate styles/tokens.css from tokens/*.json.
//
// Output must be byte-identical across runs: no timestamps, no randomness, no
// environment data. Run scripts/check-tokens.mjs to verify that invariant.

import { writeFileSync } from 'node:fs';
import { CSS_PATH, ROOT, entries, loadTokens, resolve, themeColors } from './lib/tokens.mjs';
import { relative } from 'node:path';

const { foundation, themes } = loadTokens();
const ns = foundation.meta.namespace || 'pas';
const scope = { ...foundation.reference, ...foundation };
const REQUIRED = foundation.requirements.colorRoles;
const THEME_NAMES = foundation.requirements.themes;

const warnings = [];

function resolveDeep(node, prefix = '') {
  const out = [];
  for (const [key, value] of entries(node)) {
    const name = prefix ? `${prefix}-${key}` : key;
    if (value && typeof value === 'object') out.push(...resolveDeep(value, name));
    else out.push([name, resolve(value, scope)]);
  }
  return out;
}

const lines = [];
lines.push('/*');
lines.push(' * Personal AI Systems design tokens');
lines.push(` * version ${foundation.meta.version} (${foundation.meta.status})`);
lines.push(' *');
lines.push(' * GENERATED FILE — DO NOT EDIT.');
lines.push(' * Source: tokens/foundation.json, tokens/themes.json');
lines.push(' * Regenerate: node scripts/build-tokens.mjs');
lines.push(' *');
lines.push(' * Only semantic roles are published. Reference ramps and their values stay');
lines.push(' * inside the token source, so a palette change never touches components.');
lines.push(' */');
lines.push('');

// --- theme-independent semantics --------------------------------------
lines.push(':root {');
for (const [group, prefix] of [
  ['font', 'font'],
  ['space', 'space'],
  ['size', 'size'],
]) {
  if (!foundation.semantic[group]) continue;
  lines.push(`  /* ${group} */`);
  for (const [name, value] of resolveDeep(foundation.semantic[group])) {
    lines.push(`  --${ns}-${prefix}-${name}: ${value};`);
  }
}
// Structural values are semantic too: components must not hard-code them.
lines.push('  /* structure */');
for (const [group, prefix] of [
  ['radius', 'radius'],
  ['border', 'border'],
  ['motion', 'motion'],
  ['elevation', 'elevation'],
  ['measure', 'measure'],
]) {
  for (const [name, value] of entries(foundation.reference[group])) {
    lines.push(`  --${ns}-${prefix}-${name}: ${value};`);
  }
}
lines.push('}');
lines.push('');

// --- colour roles per theme -------------------------------------------
for (const name of THEME_NAMES) {
  const colors = themeColors(foundation, themes, name);
  const missing = REQUIRED.filter((role) => !colors[role]);
  const extra = Object.keys(colors).filter((role) => !REQUIRED.includes(role));
  for (const role of missing) warnings.push(`theme "${name}" is missing required role "${role}"`);
  for (const role of extra) warnings.push(`theme "${name}" defines undeclared role "${role}"`);

  const selector =
    name === THEME_NAMES[0]
      ? ':root,\n[data-' + ns + '-theme="' + name + '"]'
      : '[data-' + ns + '-theme="' + name + '"]';
  lines.push(`/* ${themes.themes[name].label || name} theme */`);
  lines.push(`${selector} {`);
  for (const [role, value] of entries(colors)) {
    lines.push(`  --${ns}-color-${role}: ${value};`);
  }
  lines.push('}');
  lines.push('');
}

// Follow the operating system when no explicit theme is set.
const darkName = THEME_NAMES.includes('dark') ? 'dark' : null;
if (darkName) {
  const colors = themeColors(foundation, themes, darkName);
  lines.push(`@media (prefers-color-scheme: ${darkName}) {`);
  lines.push(`  :root:not([data-${ns}-theme]) {`);
  for (const [role, value] of entries(colors)) {
    lines.push(`    --${ns}-color-${role}: ${value};`);
  }
  lines.push('  }');
  lines.push('}');
  lines.push('');
}

lines.push('@media (prefers-reduced-motion: reduce) {');
lines.push('  :root {');
lines.push(`    --${ns}-motion-fast: 1ms;`);
lines.push(`    --${ns}-motion-base: 1ms;`);
lines.push(`    --${ns}-motion-slow: 1ms;`);
lines.push('  }');
lines.push('}');
lines.push('');

const css = lines.join('\n');
writeFileSync(CSS_PATH, css, 'utf8');

console.log(`generated ${relative(ROOT, CSS_PATH)} (${css.length} bytes, ${css.split('\n').length - 1} lines)`);
for (const warning of warnings) console.warn(`warning: ${warning}`);
if (warnings.length) process.exitCode = 1;

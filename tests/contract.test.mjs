// Contract tests for the canonical token source.
//
// These assert the *rules*, not the current values: a brand change must not
// break them, and a broken alias, unit, type or cycle must.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PATHS,
  ROOT,
  collect,
  loadModel,
  platformNeutralModel,
  resolveAll,
  themeFileAudit,
  typeProblems,
} from '../scripts/lib/tokens.mjs';

const { core, registry, themes } = loadModel();

test('every core token has a supported type and resolves', () => {
  const map = collect(core);
  const supported = new Set(core.meta.supportedTypes);
  for (const [path, token] of map) {
    assert.ok(token.type, `${path} has no $type`);
    assert.ok(supported.has(token.type), `${path} uses unsupported type ${token.type}`);
  }
  const { problems } = resolveAll(map);
  assert.deepEqual(problems, []);
});

test('aliases report cycles instead of looping', () => {
  const map = new Map([
    ['a', { path: 'a', type: 'string', value: '{b}' }],
    ['b', { path: 'b', type: 'string', value: '{c}' }],
    ['c', { path: 'c', type: 'string', value: '{a}' }],
  ]);
  const { problems } = resolveAll(map);
  assert.equal(problems.length, 3);
  assert.match(problems.join('\n'), /alias cycle/);
});

test('a dangling alias is an error, not an empty value', () => {
  const map = new Map([['x', { path: 'x', type: 'color', value: '{missing.token}' }]]);
  const { problems } = resolveAll(map);
  assert.match(problems[0], /does not exist/);
});

test('an alias declared with a different type than its target is rejected', () => {
  const map = new Map([
    ['size', { path: 'size', type: 'dimension', value: { value: 8, unit: 'px' } }],
    ['colour', { path: 'colour', type: 'color', value: '{size}' }],
  ]);
  const { problems } = resolveAll(map);
  assert.match(problems.join('\n'), /alias type mismatch/);
});

test('dimension units are limited to px and rem, and the core uses px only', () => {
  assert.match(typeProblems('dimension', { value: 4, unit: 'em' })[0], /unsupported dimension unit/);
  assert.deepEqual(typeProblems('dimension', { value: 4, unit: 'px' }), []);
  assert.deepEqual(typeProblems('dimension', { value: 1.5, unit: 'rem' }), []);

  const map = collect(core);
  const { resolved } = resolveAll(map);
  for (const [path, token] of resolved) {
    if (token.type !== 'dimension') continue;
    assert.equal(token.value.unit, 'px', `${path} must be logical px, found ${token.value.unit}`);
  }
});

test('CSS-only syntax is rejected where a platform-neutral value is required', () => {
  assert.match(typeProblems('string', 'cubic-bezier(0.2, 0, 0.2, 1)')[0], /CSS-only/);
  assert.match(typeProblems('string', 'system-ui, sans-serif; color: red')[0], /CSS-only/);
  assert.deepEqual(typeProblems('string', 'system-sans'), []);
});

test('shadow tokens are structured, and each layer is fully typed', () => {
  const map = collect(core);
  const { resolved } = resolveAll(map);
  const raised = resolved.get('elevation.raised').value;
  assert.ok(Array.isArray(raised) && raised.length === 2);
  for (const layer of raised) {
    assert.match(layer.color, /^#[0-9a-f]{8}$/i);
    for (const field of ['offsetX', 'offsetY', 'blur', 'spread']) {
      assert.equal(typeof layer[field].value, 'number');
      assert.equal(layer[field].unit, 'px');
    }
  }
});

test('letter spacing is 0 everywhere by decision', () => {
  const { resolved } = resolveAll(collect(core));
  for (const [path, token] of resolved) {
    if (!/tracking|letterSpacing/i.test(path)) continue;
    assert.equal(token.value.value, 0, `${path} is not 0`);
    assert.equal(token.value.unit, 'px');
  }
});

test('both themes are complete, provisional and free of undeclared roles', () => {
  assert.deepEqual(themeFileAudit(registry), []);
  for (const entry of themes) {
    assert.equal(entry.doc.meta.status, 'provisional');
    assert.equal(entry.doc.meta.brandApproval, 'pending');
    const roles = Object.keys(entry.doc.color).filter((key) => !key.startsWith('$')).sort();
    assert.deepEqual(roles, [...core.requirements.colorRoles].sort(), `${entry.name} roles`);
  }
});

test('the platform-neutral model exposes every required role', () => {
  const model = platformNeutralModel(core, themes);
  for (const role of core.requirements.typographyRoles) {
    const style = model.typography[role];
    assert.equal(typeof style.fontSize.value, 'number');
    assert.equal(style.fontSize.unit, 'px');
    assert.equal(style.letterSpacing.value, 0);
    assert.equal(typeof style.lineHeight, 'number');
    assert.match(style.fontFamily, /^system-(sans|mono)$/);
  }
  assert.equal(model.meta.brandApproval, 'pending');
  assert.equal(Object.keys(model.themes).length, registry.themes.length);
});

test('generation is deterministic across two runs', () => {
  const targets = [
    join(PATHS.dist, 'web', 'variables.css'),
    join(PATHS.dist, 'native', 'theme.js'),
    join(PATHS.dist, 'tokens.json'),
    join(PATHS.dist, 'index.js'),
  ];
  const hash = () =>
    targets.map((path) => createHash('sha256').update(readFileSync(path)).digest('hex'));
  const run = () =>
    execFileSync(process.execPath, [join(ROOT, 'scripts', 'build.mjs')], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  run();
  const first = hash();
  run();
  assert.deepEqual(hash(), first);
});

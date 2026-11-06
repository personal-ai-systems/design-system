// Packaging tests: what a consumer actually receives.
//
// `npm pack` runs from the repository, the tarball is unpacked into a throwaway
// consumer's node_modules, and every public entry point is imported from there.
// Nothing here touches a network, a registry or the machine's global state.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../scripts/lib/tokens.mjs';

const PACKAGE_NAME = '@personal-ai-systems/design-system';

function packInto(directory) {
  execFileSync('npm', ['pack', '--pack-destination', directory], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const tarball = readdirSync(directory).find((name) => name.endsWith('.tgz'));
  assert.ok(tarball, 'npm pack produced no tarball');
  return join(directory, tarball);
}

function installInto(consumerRoot, tarball) {
  const target = join(consumerRoot, 'node_modules', ...PACKAGE_NAME.split('/'));
  mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '-C', target, '--strip-components=1']);
  writeFileSync(
    join(consumerRoot, 'package.json'),
    `${JSON.stringify({ name: 'pas-consumer-fixture', private: true, type: 'module' }, null, 2)}\n`
  );
  return target;
}

test('a packed tarball imports from an isolated consumer', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'pas-ds-pack-'));
  const consumerRoot = join(workspace, 'consumer');
  mkdirSync(consumerRoot, { recursive: true });

  try {
    const tarball = packInto(workspace);
    const installed = installInto(consumerRoot, tarball);

    // --- what the tarball contains -----------------------------------
    const packaged = readdirSync(installed).sort();
    assert.ok(packaged.includes('dist'), 'dist missing from tarball');
    assert.ok(packaged.includes('adapters'), 'adapters missing from tarball');
    assert.ok(packaged.includes('tokens'), 'tokens missing from tarball');
    assert.ok(packaged.includes('themes'), 'themes missing from tarball');
    assert.equal(packaged.includes('tests'), false, 'tests must not ship');
    assert.equal(packaged.includes('scripts'), false, 'build scripts must not ship');
    assert.equal(packaged.includes('showcase'), false, 'showcase must not ship');
    assert.equal(packaged.includes('.git'), false, 'git metadata must not ship');
    assert.equal(packaged.includes('docs'), false, 'historical inputs must not ship');
    assert.equal(existsSync(join(installed, 'tokens', 'foundation.json')), false);
    assert.equal(existsSync(join(installed, 'tokens', 'themes.json')), false);

    // --- package surface ---------------------------------------------
    const pkg = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
    assert.equal(pkg.name, PACKAGE_NAME);
    assert.equal(pkg.private, true, 'package must not be publishable yet');
    assert.equal(pkg.dependencies, undefined, 'the package must have zero runtime dependencies');
    assert.equal(pkg.peerDependencies, undefined, 'the package must have zero peer dependencies');
    assert.equal(pkg.license, 'UNLICENSED', 'no legal licence may be chosen implicitly');

    // --- imports from outside the source checkout --------------------
    const script = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

import { tokens, themes, themeColors, meta, defaultThemeName } from '${PACKAGE_NAME}';
import * as native from '${PACKAGE_NAME}/native';

const require = createRequire(import.meta.url);

assert.equal(meta.version, '${pkg.version}');
assert.equal(meta.brandApproval, 'pending');
assert.ok(tokens.typography.body);

const light = themeColors('light');
assert.match(light.surface, /^#[0-9a-f]{6}$/i);
assert.notEqual(light.surface, themeColors('dark').surface);
assert.equal(themes.light.status, 'provisional');
assert.equal(defaultThemeName, 'light');

assert.equal(typeof native.typography.body.fontSize, 'number');
assert.equal(native.typography.body.letterSpacing, 0);
assert.ok(native.unsupportedFields.length > 0);

// CSS is exported as a file path, so a bundler or a plain <link> can use it.
const variablesCss = require.resolve('${PACKAGE_NAME}/web/variables.css');
const css = readFileSync(variablesCss, 'utf8');
assert.ok(css.includes(':root'), 'variables.css has no :root block');
assert.ok(css.includes('[data-pas-theme="dark"]'), 'variables.css has no dark theme');
assert.equal(/^\\s*(html|body)\\s*{/m.test(css), false, 'variables.css must not style elements');

for (const subpath of ['web/base.css', 'web/components.css']) {
  const path = require.resolve('${PACKAGE_NAME}/' + subpath);
  assert.ok(readFileSync(path, 'utf8').length > 0, subpath + ' is empty');
}

const tokensJson = JSON.parse(readFileSync(require.resolve('${PACKAGE_NAME}/tokens'), 'utf8'));
assert.equal(tokensJson.meta.brandApproval, 'pending');

const coreJson = JSON.parse(readFileSync(require.resolve('${PACKAGE_NAME}/tokens/core'), 'utf8'));
assert.ok(coreJson.requirements.colorRoles.length > 0);

console.log('consumer imports ok: root, native, tokens, tokens/core, web/*.css');
`;
    writeFileSync(join(consumerRoot, 'consumer-check.mjs'), script);
    const output = execFileSync(process.execPath, ['consumer-check.mjs'], {
      cwd: consumerRoot,
      encoding: 'utf8',
    });
    assert.match(output, /consumer imports ok/);

    // --- the shipped native fixture runs against the installed package
    const fixture = join(ROOT, 'examples', 'native', 'theme-fixture.mjs');
    assert.ok(existsSync(fixture), 'native fixture is missing');
    const fixtureOutput = execFileSync(process.execPath, [fixture], {
      cwd: consumerRoot,
      encoding: 'utf8',
      env: { ...process.env, PAS_CONSUMER_ROOT: consumerRoot },
    });
    assert.match(fixtureOutput, /native fixture ok/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test('the source checkout has no leftover duplicated styles directory', () => {
  // One owner per file: adapters/web owns the hand-written CSS, dist owns generated output.
  assert.equal(existsSync(join(ROOT, 'styles')), false, 'a stray styles/ directory has returned');
});

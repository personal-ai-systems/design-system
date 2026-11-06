#!/usr/bin/env node
// Native consumer fixture.
//
// Proves the native adapter is usable from an installed package by a plain
// React Native project: numeric style objects, no CSS strings, no bundler
// plugin, no react-native import in the package itself.
//
// Run inside a project that has the package installed:
//   node examples/native/theme-fixture.mjs
// Or point it at any consumer root:
//   PAS_CONSUMER_ROOT=/path/to/app node examples/native/theme-fixture.mjs

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const consumerRoot = process.env.PAS_CONSUMER_ROOT || process.cwd();
const require = createRequire(join(consumerRoot, 'package.json'));

const entry = require.resolve('@personal-ai-systems/design-system/native');
const native = await import(pathToFileURL(entry).href);

const packageJsonPath = require.resolve('@personal-ai-systems/design-system/package.json');
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// 1. Style objects must be numbers, because React Native has no rem/px.
const style = native.typography.body;
assert.equal(typeof style.fontSize, 'number', 'fontSize must be numeric');
assert.equal(typeof style.lineHeight, 'number', 'lineHeight must be numeric');
assert.equal(typeof style.letterSpacing, 'number', 'letterSpacing must be numeric');
assert.equal(style.letterSpacing, 0, 'letter spacing is 0 in this version');

// 2. A platform font is never a CSS stack.
for (const [role, value] of Object.entries(native.typography)) {
  if (value.fontFamily === null) continue;
  assert.equal(typeof value.fontFamily, 'string', `${role} fontFamily`);
  assert.equal(
    /,/.test(value.fontFamily),
    false,
    `${role} fontFamily must be a single family, not a CSS stack`
  );
}

// 3. Colours are plain hex strings usable by React Native directly.
const colors = native.themeColors('light');
assert.match(colors.surface, /^#[0-9a-f]{6}$/i);
assert.notEqual(colors.surface, native.themeColors('dark').surface);

// 4. The mono family is resolved per platform instead of pretending one name fits both.
assert.equal(native.typographyFor('ios').code.fontFamily, native.platformFonts.ios.mono);
assert.equal(native.typographyFor('android').code.fontFamily, native.platformFonts.android.mono);

// 5. The adapter states what it cannot express, rather than dropping it silently.
assert.ok(native.unsupportedFields.length > 0);
assert.ok(native.futureAdapters.some((item) => /SwiftUI/i.test(item)));
assert.equal(native.meta.brandApproval, 'pending');

console.log(
  `native fixture ok — @personal-ai-systems/design-system ${version}, ` +
    `${Object.keys(native.typography).length} typography roles, ` +
    `${Object.keys(native.spacing).length} spacing tokens, brand approval ${native.meta.brandApproval}`
);

#!/usr/bin/env node
// Gate the token contract, the generated adapters and the package surface.
//
// Groups, in order:
//   1. contract    — supported types, value shapes, alias/type/unit/cycle failures
//   2. themes      — required roles, no extras, provisional labelling
//   3. policy      — letter spacing is 0; no CSS-only syntax in the core
//   4. determinism — two builds, byte-identical output, and no drift on disk
//   5. parity      — web and native agree on colours and documented conversions
//   6. native      — numeric-only theme.js, documented unsupported fields
//   7. web css     — opt-in layering, token-only colours, a11y affordances retained
//   8. contrast    — declared pairs meet their minimum ratio
//   9. package     — exports resolve to real files inside the published set
//  10. showcase    — displays roles and both themes, states brand approval pending
//
// Exit code is non-zero on any failure, so this gates a commit.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  PATHS,
  ROOT,
  collect,
  contrastRatio,
  loadMappings,
  loadModel,
  platformNeutralModel,
  readJson,
  resolveAll,
  themeFileAudit,
  typeProblems,
} from './lib/tokens.mjs';

const failures = [];
let group = 'misc';
const inGroup = (name) => {
  group = name;
};
const ok = (message) => console.log(`ok    ${message}`);
const fail = (message) => {
  failures.push({ group, message });
  console.error(`FAIL  ${message}`);
};

const { core, registry, themes } = loadModel();
const mappings = loadMappings();
const ns = core.meta.namespace || 'pas';
const REQUIRED = core.requirements.colorRoles;
const ROOT_FONT = mappings.web.rootFontSizePx || 16;

// --- 1. contract ------------------------------------------------------

inGroup('contract');
const SUPPORTED = new Set(core.meta.supportedTypes || []);
const map = collect(core);
let contractProblems = 0;

for (const [path, token] of map) {
  if (!token.type) {
    fail(`${path}: token has no $type`);
    contractProblems += 1;
  } else if (!SUPPORTED.has(token.type)) {
    fail(`${path}: $type "${token.type}" is outside the declared supported subset`);
    contractProblems += 1;
  }
}

const { resolved, problems } = resolveAll(map);
for (const problem of problems) {
  if (/alias cycle/.test(problem)) inGroup('contract');
  fail(problem);
  contractProblems += 1;
}
if (!contractProblems) ok(`${map.size} core tokens resolve with supported types`);

// Cycles must actually be detected, not merely survive because none exist.
inGroup('contract');
const cycleProbe = new Map([
  ['a', { path: 'a', type: 'string', value: '{b}' }],
  ['b', { path: 'b', type: 'string', value: '{a}' }],
]);
const cycleResult = resolveAll(cycleProbe);
if (!cycleResult.problems.some((item) => /alias cycle/.test(item))) {
  fail('a two-token alias cycle was not reported');
} else {
  ok('alias cycles are detected');
}

const danglingProbe = new Map([['x', { path: 'x', type: 'color', value: '{nope.missing}' }]]);
if (!resolveAll(danglingProbe).problems.some((item) => /does not exist/.test(item))) {
  fail('a dangling alias was not reported');
} else {
  ok('dangling aliases are detected');
}

const typeMismatchProbe = new Map([
  ['n', { path: 'n', type: 'number', value: 1 }],
  ['c', { path: 'c', type: 'color', value: '{n}' }],
]);
if (!resolveAll(typeMismatchProbe).problems.some((item) => /type mismatch/.test(item))) {
  fail('an alias declared with the wrong type was not reported');
} else {
  ok('alias type mismatches are detected');
}

const badUnitProbe = typeProblems('dimension', { value: 4, unit: 'em' });
const cssyProbe = typeProblems('string', 'cubic-bezier(0.2, 0, 0.2, 1)');
if (!badUnitProbe.length || !cssyProbe.length) {
  fail('invalid units or CSS-only strings would pass validation');
} else {
  ok('invalid units and CSS-only strings are rejected');
}

// --- 2. themes --------------------------------------------------------

inGroup('themes');
for (const problem of themeFileAudit(registry)) fail(problem);

for (const entry of themes) {
  const declared = entry.doc.meta || {};
  if (declared.status !== 'provisional') {
    fail(`theme "${entry.name}" is not marked provisional (status: ${declared.status})`);
  }
  if (declared.brandApproval !== 'pending') {
    fail(`theme "${entry.name}" does not record brand approval as pending`);
  }
  const roles = Object.keys(entry.doc.color || {}).filter((key) => !key.startsWith('$'));
  const missing = REQUIRED.filter((role) => !roles.includes(role));
  const extra = roles.filter((role) => !REQUIRED.includes(role));
  if (missing.length) fail(`theme "${entry.name}" missing roles: ${missing.join(', ')}`);
  if (extra.length) fail(`theme "${entry.name}" has undeclared roles: ${extra.join(', ')}`);
}
if (!failures.some((item) => item.group === 'themes')) {
  ok(`both themes define all ${REQUIRED.length} colour roles and are marked provisional`);
}

for (const role of core.requirements.typographyRoles) {
  if (!resolved.has(`semantic.typography.${role}.letterSpacing`)) {
    fail(`typography role "${role}" has no letterSpacing token`);
  }
}
for (const role of core.requirements.spaceRoles) {
  if (!resolved.has(`semantic.space.${role}`)) fail(`space role "${role}" has no token`);
}
ok(`required typography (${core.requirements.typographyRoles.length}) and space roles are present`);

if (!registry.meta?.approvalPending?.some((item) => /colour/i.test(item))) {
  fail('registry.json does not record that brand colour approval is pending');
}

// --- 3. policy --------------------------------------------------------

inGroup('policy');
const nonZeroTracking = [...resolved.entries()].filter(
  ([path, token]) =>
    /tracking|letterSpacing/i.test(path) && token.value && token.value.value !== 0
);
if (nonZeroTracking.length) {
  for (const [path, token] of nonZeroTracking) {
    fail(`${path} is ${JSON.stringify(token.value)} but letter spacing must be 0`);
  }
} else {
  ok('every letter-spacing token is 0');
}

const nonPxDimensions = [...resolved.entries()].filter(
  ([, token]) => token.type === 'dimension' && token.value.unit !== 'px'
);
if (nonPxDimensions.length) {
  for (const [path, token] of nonPxDimensions) {
    fail(`${path} uses unit "${token.value.unit}"; the core records logical px only`);
  }
} else {
  ok('every core dimension is expressed in logical px');
}

const cssLeaks = [...resolved.entries()].filter(
  ([, token]) =>
    token.type === 'string' &&
    /rem|ch\b|cubic-bezier|rgba?\(|box-shadow|var\(--/i.test(token.value)
);
if (cssLeaks.length) {
  for (const [path, token] of cssLeaks) fail(`${path} carries platform syntax: "${token.value}"`);
} else {
  ok('no core string token carries web-only syntax');
}

// --- 4. determinism ---------------------------------------------------

inGroup('determinism');
const build = () =>
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'build.mjs')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const watch = [
  join(PATHS.dist, 'web', 'variables.css'),
  join(PATHS.dist, 'native', 'theme.js'),
  join(PATHS.dist, 'native', 'theme.d.ts'),
  join(PATHS.dist, 'tokens.json'),
  join(PATHS.dist, 'index.js'),
  join(PATHS.dist, 'index.d.ts'),
  join(PATHS.dist, 'themes', 'light.json'),
  join(PATHS.dist, 'themes', 'dark.json'),
];

build();
const first = new Map(watch.map((path) => [path, readFileSync(path, 'utf8')]));
build();
const second = new Map(watch.map((path) => [path, readFileSync(path, 'utf8')]));

let drift = 0;
for (const path of watch) {
  if (first.get(path) !== second.get(path)) {
    fail(`${relative(ROOT, path)} is not byte-identical across two builds`);
    drift += 1;
  }
}
if (!drift) ok(`${watch.length} generated files are byte-identical across two builds`);

for (const path of watch) {
  const text = second.get(path);
  if (/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) fail(`${relative(ROOT, path)} embeds a timestamp`);
  if (/\/Users\/[a-z]/i.test(text)) fail(`${relative(ROOT, path)} embeds an absolute home path`);
}
ok('generated output contains no timestamps or machine paths');

// --- 5. parity --------------------------------------------------------

inGroup('parity');
const model = platformNeutralModel(core, themes);
const nativeTheme = await import(`${join(PATHS.dist, 'native', 'theme.js')}?t=${Date.now()}`);
const webCss = second.get(join(PATHS.dist, 'web', 'variables.css'));

/** Pull `--pas-*: value;` declarations out of named selector blocks. */
function cssBlocks(text) {
  const blocks = new Map();
  // Comments inside a block would otherwise be glued onto the first declaration
  // name, so strip them before splitting on declarations.
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(clean))) {
    const selector = match[1].trim();
    const declarations = new Map();
    for (const line of match[2].split(';')) {
      const [name, value] = line.split(':');
      if (!name || !value) continue;
      declarations.set(name.trim(), value.trim());
    }
    // Keep the FIRST block for a selector: a later media block (for example the
    // reduced-motion override) must not replace the base values we compare here.
    if (!blocks.has(selector)) blocks.set(selector, declarations);
  }
  return blocks;
}

const blocks = cssBlocks(webCss);
function declarationsFor(themeName) {
  for (const [selector, declarations] of blocks) {
    if (selector.includes(`[data-${ns}-theme="${themeName}"]`)) return declarations;
  }
  return new Map();
}

let parityIssues = 0;
const note = (message) => {
  fail(message);
  parityIssues += 1;
};

for (const entry of registry.themes) {
  const cssVars = declarationsFor(entry.name);
  const nativeColors = nativeTheme.themeColors(entry.name);
  const json = readJson(join(PATHS.dist, 'themes', `${entry.name}.json`));
  for (const role of REQUIRED) {
    const fromCss = cssVars.get(`--${ns}-color-${role}`);
    if (!fromCss) note(`web CSS has no --${ns}-color-${role} for theme "${entry.name}"`);
    if (fromCss && fromCss !== nativeColors[role]) {
      note(`theme "${entry.name}" role "${role}": web ${fromCss} vs native ${nativeColors[role]}`);
    }
    if (json.colors[role] !== nativeColors[role]) {
      note(`theme "${entry.name}" role "${role}": dist JSON ${json.colors[role]} vs native ${nativeColors[role]}`);
    }
  }
}
if (!parityIssues) ok(`web CSS, native theme and theme JSON agree on all ${REQUIRED.length} roles in both themes`);

const remToPx = (value) => {
  if (value === '0' || value === 0) return 0;
  const match = String(value).match(/^([\d.]+)rem$/);
  if (!match) return null;
  return Number(match[1]) * ROOT_FONT;
};

let conversionIssues = 0;
const noteConversion = (message) => {
  fail(message);
  conversionIssues += 1;
};

const rootBlock = blocks.get(':root') || new Map();
for (const role of core.requirements.typographyRoles) {
  const native = nativeTheme.typography[role];
  const webSize = remToPx(rootBlock.get(`--${ns}-font-${role}-size`));
  if (webSize === null) noteConversion(`${role}: web size is not a rem value`);
  else if (webSize !== native.fontSize) {
    noteConversion(`${role}: web ${webSize}px vs native ${native.fontSize}`);
  }
  const webLeading = Number(rootBlock.get(`--${ns}-font-${role}-leading`));
  if (webLeading !== model.typography[role].lineHeight) {
    noteConversion(`${role}: web leading ${webLeading} differs from the model`);
  }
  if (native.lineHeight !== Math.round(native.fontSize * webLeading)) {
    noteConversion(`${role}: native lineHeight ${native.lineHeight} is not round(fontSize * leading)`);
  }
  if (native.letterSpacing !== 0) noteConversion(`${role}: native letterSpacing is ${native.letterSpacing}`);
  if (rootBlock.get(`--${ns}-font-${role}-tracking`) !== '0') {
    noteConversion(`${role}: web tracking is not 0`);
  }
}
for (const key of Object.keys(model.space)) {
  const web = remToPx(rootBlock.get(`--${ns}-space-${key}`));
  if (web !== nativeTheme.spacing[key]) {
    noteConversion(`space ${key}: web ${web}px vs native ${nativeTheme.spacing[key]}`);
  }
}
for (const key of Object.keys(model.border)) {
  const web = Number(String(rootBlock.get(`--${ns}-border-${key}`)).replace('px', ''));
  if (web !== nativeTheme.border[key]) {
    noteConversion(`border ${key}: web ${web}px vs native ${nativeTheme.border[key]}`);
  }
}
for (const key of Object.keys(model.motion.duration)) {
  const web = Number(String(rootBlock.get(`--${ns}-motion-${key}`)).replace('ms', ''));
  if (web !== nativeTheme.motion.duration[key]) {
    noteConversion(`duration ${key}: web ${web}ms vs native ${nativeTheme.motion.duration[key]}`);
  }
}
if (!conversionIssues) {
  ok('web/native agree on sizes, leading, spacing, borders and durations after documented conversion');
}

const easing = nativeTheme.motion.easing.standard;
const expectedEasing = `cubic-bezier(${easing.x1}, ${easing.y1}, ${easing.x2}, ${easing.y2})`;
if (rootBlock.get(`--${ns}-motion-easing`) !== expectedEasing) {
  fail(`easing parity: web "${rootBlock.get(`--${ns}-motion-easing`)}" vs native ${JSON.stringify(easing)}`);
} else {
  ok('easing serialises from the same cubic-bezier numbers on both platforms');
}
// --- 6. native --------------------------------------------------------

inGroup('native');
const nativeJs = second.get(join(PATHS.dist, 'native', 'theme.js'));
const nativeCode = nativeJs
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n');
for (const forbidden of ['rem', 'px', 'var(--', 'cubic-bezier', 'ch;', 'box-shadow']) {
  if (nativeCode.includes(forbidden)) fail(`native theme.js contains CSS-only token "${forbidden}"`);
}
ok('native theme.js is free of CSS-only units and functions');

const numericFields = [
  ['typography.display.fontSize', nativeTheme.typography.display.fontSize],
  ['typography.display.lineHeight', nativeTheme.typography.display.lineHeight],
  ['typography.body.letterSpacing', nativeTheme.typography.body.letterSpacing],
  ['spacing.100', nativeTheme.spacing['100']],
  ['radius.lg', nativeTheme.radius.lg],
  ['border.hairline', nativeTheme.border.hairline],
  ['sizes.control', nativeTheme.sizes.control],
  ['motion.duration.base', nativeTheme.motion.duration.base],
];
const nonNumeric = numericFields.filter(([, value]) => typeof value !== 'number');
if (nonNumeric.length) {
  for (const [path, value] of nonNumeric) fail(`${path} is ${JSON.stringify(value)}, not a number`);
} else {
  ok(`native style fields are numeric (${numericFields.length} sampled)`);
}

if (!nativeTheme.unsupportedFields.some((item) => /spread/i.test(item))) {
  fail('native mapping does not declare the shadow spread limitation');
} else {
  ok('unsupported shadow spread and multi-layer limits are declared, not silently dropped');
}
if (!nativeTheme.futureAdapters.some((item) => /SwiftUI/i.test(item))) {
  fail('future SwiftUI/Compose adapters are not documented as unimplemented');
}
if (/component library/i.test(nativeTheme.meta.scope) === false) {
  fail('native meta does not state that this is not a component library');
} else {
  ok('native scope states token support only, not a component kit or device QA');
}

// --- 7. web css -------------------------------------------------------

inGroup('web-css');
const variablesCss = second.get(join(PATHS.dist, 'web', 'variables.css'));
if (/^\s*(\*|html|body|h1|p|a)\b/m.test(variablesCss)) {
  fail('variables.css resets or styles elements; it must be variables only');
} else {
  ok('web variables.css declares variables and themes only');
}
if (!/@media \(prefers-reduced-motion: reduce\)/.test(variablesCss)) {
  fail('web variables do not honour prefers-reduced-motion');
}

const baseCss = readFileSync(join(ROOT, 'adapters', 'web', 'base.css'), 'utf8');
const componentsCss = readFileSync(join(ROOT, 'adapters', 'web', 'components.css'), 'utf8');
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FN = /\b(rgba?|hsla?|oklch|lab|lch|color-mix)\(/;
const HUE_CLASS = /\.(pas-)?(blue|red|green|burgundy|purple|orange|yellow|teal|pink|indigo)\b/i;

for (const [name, text] of [
  ['base.css', baseCss],
  ['components.css', componentsCss],
]) {
  text.split('\n').forEach((line, index) => {
    const body = line.trim();
    if (!body || body.startsWith('/*') || body.startsWith('*')) return;
    if (HEX.test(body) || COLOR_FN.test(body)) {
      fail(`adapters/web/${name}:${index + 1} literal colour outside the token layer: ${body}`);
    }
  });
  if (HUE_CLASS.test(text)) fail(`adapters/web/${name} uses a hue-named class`);
}
if (!failures.some((item) => item.group === 'web-css')) {
  ok('base.css and components.css use tokens only, with no hue-named classes');
}

for (const token of ['color-primary', 'color-on-surface', 'color-outline', 'color-focus']) {
  if (!`${baseCss}${componentsCss}`.includes(`--${ns}-${token}`)) {
    fail(`no opt-in style consumes --${ns}-${token}`);
  }
}

// Every custom property the opt-in CSS consumes must actually be generated.
const defined = new Set();
for (const declarations of blocks.values()) {
  for (const name of declarations.keys()) defined.add(name);
}
const used = new Set(
  [...`${baseCss}${componentsCss}`.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1])
);
const undefinedVars = [...used].filter((name) => !defined.has(name));
if (undefinedVars.length) {
  fail(`opt-in CSS references variables that are never generated: ${undefinedVars.join(', ')}`);
} else {
  ok(`all ${used.size} custom properties used by base/components are generated`);
}

// Media queries cannot use custom properties, so they must match the mapping.
const mappedBreakpoints = Object.values(mappings.web.breakpoint).map((item) => item.value);
const mediaQueries = [...`${baseCss}${componentsCss}`.matchAll(/min-width:\s*([\d.]+)rem/g)].map(
  (match) => Number(match[1]) * ROOT_FONT
);
const unmatched = mediaQueries.filter((value) => !mappedBreakpoints.includes(value));
if (unmatched.length) {
  fail(`hand-written media queries do not match adapters/web/mapping.json: ${[...new Set(unmatched)].join(', ')}px`);
} else {
  ok(`${new Set(mediaQueries).size} media-query breakpoints match the web mapping`);
}

// Accessibility affordances that must survive any refactor.
const a11y = [
  [':focus-visible', `${baseCss}${componentsCss}`, 'keyboard focus styling'],
  ['prefers-reduced-motion', baseCss, 'reduced-motion handling'],
  ['overflow-wrap', baseCss, 'long-word text fit'],
];
for (const [needle, text, label] of a11y) {
  if (!text.includes(needle)) fail(`base/components CSS lost ${label} (${needle})`);
}
if (!a11y.some(([needle, text]) => !text.includes(needle))) {
  ok('keyboard focus, reduced motion and long-word text fit are present');
}

// --- 8. contrast ------------------------------------------------------

inGroup('contrast');
const pairs = registry.contrast?.pairs || [];
if (!pairs.length) fail('registry.json declares no contrast pairs');
let contrastIssues = 0;
for (const pair of pairs) {
  const colors = nativeTheme.themeColors(pair.theme);
  const fg = colors[pair.foreground];
  const bg = colors[pair.background];
  if (!fg || !bg) {
    fail(`contrast pair references an unknown role: ${pair.foreground} / ${pair.background}`);
    contrastIssues += 1;
    continue;
  }
  const ratio = contrastRatio(fg, bg);
  if (ratio + 1e-9 < pair.min) {
    fail(`${pair.theme} ${pair.foreground} on ${pair.background} = ${ratio.toFixed(2)}:1 (min ${pair.min})`);
    contrastIssues += 1;
  }
}
if (!contrastIssues) ok(`all ${pairs.length} declared contrast pairs meet their minimum ratio`);

// --- 9. package -------------------------------------------------------

inGroup('package');
const pkg = readJson(join(ROOT, 'package.json'));
if (pkg.name !== '@personal-ai-systems/design-system') fail(`unexpected package name "${pkg.name}"`);
if (pkg.version !== core.meta.version) {
  fail(`package version ${pkg.version} differs from token version ${core.meta.version}`);
}
if (pkg.private !== true) fail('package must stay private until publication is decided');
if (pkg.license && pkg.license !== 'UNLICENSED') {
  fail(`a legal licence was chosen without approval: ${pkg.license}`);
}

const exportTargets = [];
for (const [key, value] of Object.entries(pkg.exports || {})) {
  const targets = typeof value === 'string' ? [value] : Object.values(value);
  for (const target of targets) {
    if (target.includes('*')) continue;
    exportTargets.push([key, target]);
    if (!existsSync(join(ROOT, target))) fail(`export "${key}" points at missing ${target}`);  }
}
ok(`${exportTargets.length} explicit export targets exist on disk`);

const requiredExports = [
  './tokens',
  './web/variables.css',
  './web/base.css',
  './web/components.css',
  './native',
];
for (const key of requiredExports) {
  if (!pkg.exports?.[key]) fail(`package exports have no "${key}" entry`);
}
if (pkg.exports?.['./web/variables.css'] && pkg.exports['./web/base.css']) {
  ok('web variables are exported independently of the opt-in base/components styles');
}

const filesAllow = pkg.files || [];
const ALWAYS_INCLUDED = new Set(['package.json', 'README.md', 'LICENSE']);
const covered = (path) =>
  ALWAYS_INCLUDED.has(path) || filesAllow.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
for (const [, target] of exportTargets) {
  if (!covered(target.replace(/^\.\//, ''))) {
    fail(`export target ${target} is outside the published "files" list`);
  }
}
if (!filesAllow.length) fail('package.json declares no files list');
else ok(`all export targets are inside the published files list (${filesAllow.join(', ')})`);

// Nothing private may reach a published tarball.
const PRIVATE = ['moltis', 'personal-vault/raw', '.moltis', 'handoff', 'confidential', 'checkpoint'];
for (const rel of ['index.html', 'package.json', 'README.md'].map((name) => name).filter(Boolean)) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8').toLowerCase();
  for (const term of PRIVATE) {
    if (text.includes(term)) fail(`${rel} contains private term "${term}"`);
  }
}

// --- 10. showcase -----------------------------------------------------

inGroup('showcase');
const showcasePath = join(ROOT, 'showcase', 'index.html');
const showcase = readFileSync(showcasePath, 'utf8');
for (const needle of [
  '../dist/web/variables.css',
  '../adapters/web/base.css',
  '../adapters/web/components.css',
]) {
  if (!showcase.includes(needle)) fail(`showcase/index.html does not link ${needle}`);
}
const remote = /(?:src|href)\s*=\s*"https?:\/\//i.exec(showcase);
if (remote) fail(`showcase/index.html loads a remote asset: ${remote[0]}`);
if (/fonts\.googleapis|cdn\./i.test(showcase)) fail('showcase/index.html references a remote font or CDN');

const missingRoles = REQUIRED.filter((role) => !showcase.includes(`--${ns}-color-${role}`));
if (missingRoles.length) fail(`showcase does not display roles: ${missingRoles.join(', ')}`);

for (const entry of registry.themes) {
  if (!showcase.includes(`data-${ns}-theme="${entry.name}"`)) {
    fail(`showcase cannot demonstrate theme "${entry.name}"`);
  }
}
if (!/pending/i.test(showcase) || !/provisional/i.test(showcase)) {
  fail('showcase does not state that palette and typefaces are provisional and awaiting approval');
}
if (!/letter spac/i.test(showcase)) {
  fail('showcase does not state the letter-spacing decision');
}
ok('showcase links local styles only, shows every role and both themes, and states approval is pending');

// --- summary ---------------------------------------------------------

console.log('');
if (failures.length) {
  const tally = new Map();
  for (const item of failures) tally.set(item.group, (tally.get(item.group) || 0) + 1);
  console.error(`summary ${[...tally.entries()].map(([name, count]) => `${name}=${count}`).join(' ')}`);
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('all design-system checks passed');

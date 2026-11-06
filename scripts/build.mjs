#!/usr/bin/env node
// Generate every adapter output from the one canonical token source.
//
// Deterministic by construction: sorted keys, no timestamps, no environment
// data, no locale-dependent formatting. scripts/validate.mjs re-runs this file
// and compares bytes, so a non-deterministic edit fails the build.
//
// Outputs (all generated, never edited):
//   dist/web/variables.css     semantic CSS custom properties for both themes
//   dist/native/theme.js|.d.ts numeric React Native style objects
//   dist/tokens.json           resolved platform-neutral model
//   dist/themes/<name>.json    resolved colour roles per theme
//   dist/index.js|.d.ts        package root for JS consumers

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PATHS, ROOT, loadModel, loadMappings, platformNeutralModel } from './lib/tokens.mjs';

const { core, registry, themes } = loadModel();
const mappings = loadMappings();
const model = platformNeutralModel(core, themes);
const ns = core.meta.namespace || 'pas';
const ROOT_FONT = mappings.web.rootFontSizePx || 16;

const written = [];
function emit(path, contents) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  written.push({ path: relative(ROOT, path), bytes: Buffer.byteLength(contents) });
}

const sortedKeys = (object) =>
  Object.keys(object).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a < b ? -1 : a > b ? 1 : 0;
  });

// --- unit conversion --------------------------------------------------

function round(value, places = 5) {
  return Number(value.toFixed(places));
}

function remValue(px) {
  if (px === 0) return '0';
  return `${round(px / ROOT_FONT)}rem`;
}

function pxValue(px) {
  if (px === 0) return '0';
  return `${round(px)}px`;
}

/** A dimension becomes rem or px in CSS according to the adapter's unit policy. */
function cssDimension(dimension, group) {
  if (!dimension) throw new Error(`missing dimension for group "${group}"`);
  if (dimension.value === 0) return '0';
  const policy = mappings.web.unitPolicy?.groups?.[group] || mappings.web.unitPolicy?.default || 'rem';
  if (policy === 'px') return pxValue(dimension.value);
  if (dimension.unit !== 'px') {
    throw new Error(`unexpected unit "${dimension.unit}" in ${group}; core must be px`);
  }
  return remValue(dimension.value);
}

function cssDuration(duration) {
  const ms = duration.unit === 's' ? duration.value * 1000 : duration.value;
  return `${round(ms, 3)}ms`;
}

function cssShadow(layers) {
  if (!Array.isArray(layers) || layers.length === 0) return 'none';
  return layers
    .map(
      (layer) =>
        `${pxValue(layer.offsetX.value)} ${pxValue(layer.offsetY.value)} ${pxValue(layer.blur.value)} ${pxValue(
          layer.spread.value
        )} ${layer.color}`
    )
    .join(', ');
}

function cssFontFamily(key) {
  const stack = mappings.web.fontFamily[key];
  if (!stack) throw new Error(`no web font family mapped for "${key}"`);
  return stack;
}

// --- web: variables.css ----------------------------------------------

const css = [];
css.push('/*');
css.push(' * Personal AI Systems design system — web variables');
css.push(` * version ${core.meta.version} (${core.meta.status}, brand approval pending)`);
css.push(' *');
css.push(' * GENERATED FILE — DO NOT EDIT.');
css.push(' * Source: tokens/core.tokens.json + themes/*.tokens.json + adapters/web/mapping.json');
css.push(' * Regenerate: node scripts/build.mjs');
css.push(' *');
css.push(' * This file is variables only. It resets nothing and styles nothing:');
css.push(' * base.css and components.css are separate opt-in imports.');
css.push(' */');
css.push('');

css.push(':root {');
css.push('  /* typography roles */');
for (const role of core.requirements.typographyRoles) {
  const style = model.typography[role];
  css.push(`  --${ns}-font-${role}-family: ${cssFontFamily(style.fontFamily)};`);
  css.push(`  --${ns}-font-${role}-size: ${cssDimension(style.fontSize, 'font')};`);
  css.push(`  --${ns}-font-${role}-weight: ${style.fontWeight};`);
  css.push(`  --${ns}-font-${role}-leading: ${style.lineHeight};`);
  css.push(`  --${ns}-font-${role}-tracking: ${cssDimension(style.letterSpacing, 'font')};`);
}
css.push('');
css.push('  /* spacing primitives */');
for (const key of sortedKeys(model.space)) {
  css.push(`  --${ns}-space-${key}: ${cssDimension(model.space[key], 'space')};`);
}
css.push('');
css.push('  /* spacing roles */');
for (const role of core.requirements.spaceRoles) {
  css.push(`  --${ns}-space-${role}: ${cssDimension(model.spaceRoles[role], 'space')};`);
}
css.push('');
css.push('  /* geometry */');
for (const key of sortedKeys(model.radius)) {
  css.push(`  --${ns}-radius-${key}: ${cssDimension(model.radius[key], 'radius')};`);
}
for (const key of sortedKeys(model.border)) {
  css.push(`  --${ns}-border-${key}: ${cssDimension(model.border[key], 'border')};`);
}
for (const key of sortedKeys(model.size)) {
  css.push(`  --${ns}-size-${key}: ${cssDimension(model.size[key], 'size')};`);
}
css.push('');
css.push('  /* opacity */');
for (const key of sortedKeys(model.opacity)) {
  css.push(`  --${ns}-opacity-${key}: ${model.opacity[key]};`);
}
css.push('');
css.push('  /* motion */');
for (const key of sortedKeys(model.motion.duration)) {
  css.push(`  --${ns}-motion-${key}: ${cssDuration(model.motion.duration[key])};`);
}
for (const key of sortedKeys(model.motion.easing)) {
  const [x1, y1, x2, y2] = model.motion.easing[key];
  // One easing curve is the semantic default, so it keeps the short name the
  // hand-written CSS already consumes; further curves are namespaced.
  const name = key === 'standard' ? 'easing' : `easing-${key}`;
  css.push(`  --${ns}-motion-${name}: cubic-bezier(${x1}, ${y1}, ${x2}, ${y2});`);
}
css.push('');
css.push('  /* elevation */');
for (const key of sortedKeys(model.elevation)) {
  css.push(`  --${ns}-elevation-${key}: ${cssShadow(model.elevation[key])};`);
}
css.push('');
css.push('  /* web-only measures: no native equivalent, so they live in the mapping */');
for (const key of sortedKeys(mappings.web.measure)) {
  css.push(`  --${ns}-measure-${key}: ${mappings.web.measure[key]};`);
}
css.push('}');
css.push('');

const defaultTheme = registry.themes.find((entry) => entry.default);
for (const entry of registry.themes) {
  const theme = model.themes[entry.name];
  const selector =
    entry.name === defaultTheme.name
      ? `:root,\n[data-${ns}-theme="${entry.name}"]`
      : `[data-${ns}-theme="${entry.name}"]`;
  css.push(`/* ${theme.label} theme — ${theme.status}, brand approval ${theme.brandApproval} */`);
  css.push(`${selector} {`);
  for (const role of core.requirements.colorRoles) {
    css.push(`  --${ns}-color-${role}: ${theme.colors[role]};`);
  }
  css.push('}');
  css.push('');
}

const darkEntry = registry.themes.find((entry) => entry.name === 'dark');
if (darkEntry) {
  css.push('/* Follow the operating system when no explicit theme is set. */');
  css.push('@media (prefers-color-scheme: dark) {');
  css.push(`  :root:not([data-${ns}-theme]) {`);
  for (const role of core.requirements.colorRoles) {
    css.push(`    --${ns}-color-${role}: ${model.themes[darkEntry.name].colors[role]};`);
  }
  css.push('  }');
  css.push('}');
  css.push('');
}

css.push('/* Honour a reduced-motion preference without changing any consumer markup. */');
css.push('@media (prefers-reduced-motion: reduce) {');
css.push('  :root {');
for (const key of sortedKeys(model.motion.duration)) {
  css.push(`    --${ns}-motion-${key}: 1ms;`);
}
css.push('  }');
css.push('}');
css.push('');

emit(join(PATHS.dist, 'web', 'variables.css'), css.join('\n'));

// --- native: theme.js --------------------------------------------------

const nativeNumber = (dimension) => {
  if (!dimension) throw new Error('missing dimension');
  return round(dimension.value, 3);
};

const nativeDuration = (duration) =>
  round(duration.unit === 's' ? duration.value * 1000 : duration.value, 3);

function hexAlpha(hex) {
  const value = hex.replace('#', '');
  if (value.length !== 8) return 1;
  return round(parseInt(value.slice(6, 8), 16) / 255, 3);
}

const nativeTypography = {};
for (const role of core.requirements.typographyRoles) {
  const style = model.typography[role];
  const familyKey = style.fontFamily;
  const familyMap = mappings.native.fontFamily[familyKey];
  if (!familyMap) throw new Error(`no native font mapping for "${familyKey}"`);
  const fontSize = nativeNumber(style.fontSize);
  nativeTypography[role] = {
    // null means "no single cross-platform family": leave fontFamily unset for the
    // platform default, or resolve the mono role through typographyFor(platform).
    fontFamily: null,
    fontSize,
    fontWeight: String(style.fontWeight),
    lineHeight: Math.round(fontSize * style.lineHeight),
    letterSpacing: nativeNumber(style.letterSpacing),
    fontFamilyKey: familyKey,
  };
}

const nativeBody = {
  meta: {
    name: core.meta.name,
    version: core.meta.version,
    status: core.meta.status,
    brandApproval: 'pending',
    platform: 'native',
    target: mappings.native.meta.target,
    scope: mappings.native.meta.scope,
    generatedFrom: 'tokens/core.tokens.json',
    letterSpacingPolicy: core.meta.letterSpacingPolicy,
  },
  defaultThemeName: defaultTheme.name,
  themes: Object.fromEntries(
    registry.themes.map((entry) => [
      entry.name,
      {
        name: entry.name,
        label: entry.label,
        status: model.themes[entry.name].status,
        brandApproval: model.themes[entry.name].brandApproval,
        colors: model.themes[entry.name].colors,
      },
    ])
  ),
  typography: nativeTypography,
  spacing: Object.fromEntries(
    [...sortedKeys(model.space).map((key) => [key, nativeNumber(model.space[key])]),
     ...core.requirements.spaceRoles.map((role) => [role, nativeNumber(model.spaceRoles[role])])]
  ),
  radius: Object.fromEntries(sortedKeys(model.radius).map((key) => [key, nativeNumber(model.radius[key])])),
  border: Object.fromEntries(sortedKeys(model.border).map((key) => [key, nativeNumber(model.border[key])])),
  sizes: Object.fromEntries(sortedKeys(model.size).map((key) => [key, nativeNumber(model.size[key])])),
  opacity: Object.fromEntries(sortedKeys(model.opacity).map((key) => [key, model.opacity[key]])),
  motion: {
    duration: Object.fromEntries(
      sortedKeys(model.motion.duration).map((key) => [key, nativeDuration(model.motion.duration[key])])
    ),
    easing: Object.fromEntries(
      sortedKeys(model.motion.easing).map((key) => {
        const [x1, y1, x2, y2] = model.motion.easing[key];
        return [key, { x1, y1, x2, y2 }];
      })
    ),
  },
  elevation: Object.fromEntries(
    sortedKeys(model.elevation).map((key) => [
      key,
      model.elevation[key].map((layer) => ({
        color: layer.color,
        opacity: hexAlpha(layer.color),
        offsetX: nativeNumber(layer.offsetX),
        offsetY: nativeNumber(layer.offsetY),
        blur: nativeNumber(layer.blur),
        spread: nativeNumber(layer.spread),
      })),
    ])
  ),
  platformFonts: {
    ios: { mono: mappings.native.fontFamily['system-mono'].byPlatform.ios },
    android: { mono: mappings.native.fontFamily['system-mono'].byPlatform.android },
  },
  unsupportedFields: mappings.native.meta.unsupportedFields,
  futureAdapters: mappings.native.meta.futureAdapters,
};

const nativeHeader = [
  '// GENERATED FILE — DO NOT EDIT.',
  '// Regenerate: node scripts/build.mjs',
  '//',
  `// ${core.meta.name} — native theme, version ${core.meta.version} (${core.meta.status}).`,
  '// Colours and typefaces are PROVISIONAL and awaiting brand approval.',
  '//',
  '// Numeric-only by design: no CSS var(), no rem/px/ch strings, no cubic-bezier().',
  '// See adapters/native/mapping.json for the documented conversion rules.',
  '',
];

const nativeJs = [
  ...nativeHeader,
  `export const meta = ${JSON.stringify(nativeBody.meta, null, 2)};`,
  '',
  `export const defaultThemeName = ${JSON.stringify(nativeBody.defaultThemeName)};`,
  '',
  `export const themes = ${JSON.stringify(nativeBody.themes, null, 2)};`,
  '',
  `export const typography = ${JSON.stringify(nativeBody.typography, null, 2)};`,
  '',
  `export const spacing = ${JSON.stringify(nativeBody.spacing, null, 2)};`,
  '',
  `export const radius = ${JSON.stringify(nativeBody.radius, null, 2)};`,
  '',
  `export const border = ${JSON.stringify(nativeBody.border, null, 2)};`,
  '',
  `export const sizes = ${JSON.stringify(nativeBody.sizes, null, 2)};`,
  '',
  `export const opacity = ${JSON.stringify(nativeBody.opacity, null, 2)};`,
  '',
  `export const motion = ${JSON.stringify(nativeBody.motion, null, 2)};`,
  '',
  `export const elevation = ${JSON.stringify(nativeBody.elevation, null, 2)};`,
  '',
  `export const platformFonts = ${JSON.stringify(nativeBody.platformFonts, null, 2)};`,
  '',
  `export const unsupportedFields = ${JSON.stringify(nativeBody.unsupportedFields, null, 2)};`,
  '',
  `export const futureAdapters = ${JSON.stringify(nativeBody.futureAdapters, null, 2)};`,
  '',
  '/** Colour roles for one theme. Unknown names throw rather than fall back silently. */',
  'export function themeColors(name = defaultThemeName) {',
  '  const found = themes[name];',
  '  if (!found) throw new Error(`unknown theme "${name}"`);',
  '  return found.colors;',
  '}',
  '',
  '/** Typography with a concrete platform mono family resolved for the given platform. */',
  'export function typographyFor(platform) {',
  '  if (!Object.hasOwn(platformFonts, platform)) throw new Error(`unsupported platform "${platform}"`);',
  '  const mono = platform === "android" ? platformFonts.android.mono : platformFonts.ios.mono;',
  '  const out = {};',
  '  for (const [role, style] of Object.entries(typography)) {',
  '    const resolved = { ...style };',
  '    delete resolved.fontFamilyKey;',
  '    if (resolved.fontFamily === null) delete resolved.fontFamily;',
  '    if (style.fontFamilyKey === "system-mono") resolved.fontFamily = mono;',
  '    out[role] = resolved;',
  '  }',
  '  return out;',
  '}',
  '',
];
emit(join(PATHS.dist, 'native', 'theme.js'), nativeJs.join('\n'));

// --- native: theme.d.ts ------------------------------------------------

const roleUnion = core.requirements.typographyRoles.map((role) => JSON.stringify(role)).join(' | ');
const themeUnion = registry.themes.map((entry) => JSON.stringify(entry.name)).join(' | ');

const dts = `// GENERATED FILE — DO NOT EDIT. Regenerate: node scripts/build.mjs

export type ThemeName = ${themeUnion};

export type ColorRole =
${core.requirements.colorRoles.map((role) => `  | ${JSON.stringify(role)}`).join('\n')};

export type TypographyRole = ${roleUnion};

export interface NativeTypographyStyle {
  /** null means "use the platform UI font"; never a CSS font stack. */
  fontFamily: string | null;
  fontSize: number;
  fontWeight: '400' | '500' | '600';
  lineHeight: number;
  letterSpacing: number;
  fontFamilyKey: string;
}

export interface ShadowLayer {
  color: string;
  /** Alpha extracted from the colour, for shadowOpacity on iOS. */
  opacity: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  /** Reported because React Native cannot express it; see unsupportedFields. */
  spread: number;
}

export interface ThemeRecord {
  name: ThemeName;
  label: string;
  status: string;
  brandApproval: string;
  colors: Record<ColorRole, string>;
}

export declare const meta: {
  name: string;
  version: string;
  status: string;
  brandApproval: string;
  platform: string;
  target: string;
  scope: string;
  generatedFrom: string;
  letterSpacingPolicy: number;
};

export declare const defaultThemeName: ThemeName;
export declare const themes: Record<ThemeName, ThemeRecord>;
export declare const typography: Record<TypographyRole, NativeTypographyStyle>;
export declare const spacing: Record<string, number>;
export declare const radius: Record<string, number>;
export declare const border: Record<string, number>;
export declare const sizes: Record<string, number>;
export declare const opacity: Record<string, number>;
export declare const motion: {
  duration: Record<string, number>;
  easing: Record<string, { x1: number; y1: number; x2: number; y2: number }>;
};
export declare const elevation: Record<string, ShadowLayer[]>;
export declare const platformFonts: { ios: { mono: string }; android: { mono: string } };
export declare const unsupportedFields: string[];
export declare const futureAdapters: string[];

export declare function themeColors(name?: ThemeName): Record<ColorRole, string>;
export declare function typographyFor(platform: 'ios' | 'android'): Record<TypographyRole, Omit<NativeTypographyStyle, 'fontFamilyKey' | 'fontFamily'> & { fontFamily?: string }>;
`;
emit(join(PATHS.dist, 'native', 'theme.d.ts'), dts);

// --- resolved platform-neutral model ---------------------------------

const neutral = {
  ...model,
  meta: {
    ...model.meta,
    generatedFrom: ['tokens/core.tokens.json', 'themes/*.tokens.json'],
  },
};
emit(join(PATHS.dist, 'tokens.json'), `${JSON.stringify(neutral, null, 2)}\n`);

for (const entry of registry.themes) {
  const theme = model.themes[entry.name];
  emit(
    join(PATHS.dist, 'themes', `${entry.name}.json`),
    `${JSON.stringify(
      {
        name: theme.name,
        label: theme.label,
        status: theme.status,
        brandApproval: theme.brandApproval,
        note: 'PROVISIONAL colour mapping. Not an approved brand palette.',
        colors: theme.colors,
      },
      null,
      2
    )}\n`
  );
}

// --- package root ----------------------------------------------------

const indexJs = `// GENERATED FILE — DO NOT EDIT. Regenerate: node scripts/build.mjs
//
// Package root for JavaScript consumers that want the platform-neutral model.
// Web consumers normally import the CSS files; native consumers import ./native.

export const tokens = ${JSON.stringify(neutral, null, 2)};

export const meta = tokens.meta;

export const themes = Object.fromEntries(
  Object.entries(tokens.themes).map(([name, theme]) => [name, { ...theme }])
);

export const defaultThemeName = ${JSON.stringify(defaultTheme.name)};

export function themeColors(name = defaultThemeName) {
  const found = themes[name];
  if (!found) throw new Error(\`unknown theme "\${name}"\`);
  return found.colors;
}
`;
emit(join(PATHS.dist, 'index.js'), indexJs);

const indexDts = `// GENERATED FILE — DO NOT EDIT. Regenerate: node scripts/build.mjs

export type ThemeName = ${themeUnion};
export type ColorRole = ${core.requirements.colorRoles.map((role) => JSON.stringify(role)).join(' | ')};
export type TypographyRole = ${roleUnion};

export interface Dimension {
  value: number;
  unit: 'px' | 'rem';
}

export interface Duration {
  value: number;
  unit: 'ms' | 's';
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: Dimension;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: Dimension;
}

export interface ShadowLayerValue {
  color: string;
  offsetX: Dimension;
  offsetY: Dimension;
  blur: Dimension;
  spread: Dimension;
}

export declare const tokens: {
  meta: {
    name: string;
    namespace: string;
    version: string;
    status: string;
    format: string;
    brandApproval: string;
    referenceUnit: string;
    letterSpacingPolicy: number;
    generatedFrom: string[];
  };
  typography: Record<TypographyRole, TypographyStyle>;
  space: Record<string, Dimension>;
  spaceRoles: Record<string, Dimension>;
  radius: Record<string, Dimension>;
  border: Record<string, Dimension>;
  size: Record<string, Dimension>;
  opacity: Record<string, number>;
  motion: { duration: Record<string, Duration>; easing: Record<string, number[]> };
  elevation: Record<string, ShadowLayerValue[]>;
  themes: Record<ThemeName, { name: ThemeName; label: string; status: string; brandApproval: string; colors: Record<ColorRole, string> }>;
};

export declare const meta: typeof tokens.meta;
export declare const themes: typeof tokens.themes;
export declare const defaultThemeName: ThemeName;
export declare function themeColors(name?: ThemeName): Record<ColorRole, string>;
`;
emit(join(PATHS.dist, 'index.d.ts'), indexDts);

// A stale file from an older layout would be silently published; clear it.
rmSync(join(PATHS.dist, '.gitkeep'), { force: true });

console.log(`built ${written.length} file(s) from tokens/core.tokens.json`);
for (const item of written) console.log(`  ${item.path}  ${item.bytes} bytes`);

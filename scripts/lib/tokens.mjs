// Token loading, PAS-profile validation, alias resolution and contrast maths.
//
// Node standard library only: no build framework, no Style Dictionary.
// Supported subset is declared in tokens/core.tokens.json meta.supportedTypes;
// anything outside it is a failure rather than a silent pass-through.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PATHS = {
  core: join(ROOT, 'tokens', 'core.tokens.json'),
  themesDir: join(ROOT, 'themes'),
  registry: join(ROOT, 'themes', 'registry.json'),
  webMapping: join(ROOT, 'adapters', 'web', 'mapping.json'),
  nativeMapping: join(ROOT, 'adapters', 'native', 'mapping.json'),
  webCss: join(ROOT, 'adapters', 'web', 'base.css'),
  componentsCss: join(ROOT, 'adapters', 'web', 'components.css'),
  dist: join(ROOT, 'dist'),
};

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Load the canonical core, the registry and every theme file the registry names. */
export function loadModel() {
  const core = readJson(PATHS.core);
  const registry = readJson(PATHS.registry);
  const themes = registry.themes.map((entry) => {
    const doc = readJson(join(PATHS.themesDir, entry.file));
    return { ...entry, doc };
  });
  return { core, registry, themes };
}

export function loadMappings() {
  return { web: readJson(PATHS.webMapping), native: readJson(PATHS.nativeMapping) };
}

/** Every theme file on disk must be registered, and every registration must exist. */
export function themeFileAudit(registry) {
  const problems = [];
  const registered = new Set(registry.themes.map((entry) => entry.file));
  const onDisk = readdirSync(PATHS.themesDir).filter(
    (name) => name.endsWith('.tokens.json')
  );
  for (const name of onDisk) {
    if (!registered.has(name)) problems.push(`theme file "${name}" is not in registry.json`);
  }
  for (const entry of registry.themes) {
    if (!existsSync(join(PATHS.themesDir, entry.file))) {
      problems.push(`registry names "${entry.file}", which does not exist`);
    }
  }
  const defaults = registry.themes.filter((entry) => entry.default);
  if (defaults.length !== 1) {
    problems.push(`registry must mark exactly one default theme, found ${defaults.length}`);
  }
  return problems;
}

// --- collection -------------------------------------------------------

const ALIAS = /^\{([A-Za-z0-9_.-]+)\}$/;
const SKIP_ROOT_KEYS = new Set(['meta', 'requirements']);

/**
 * Flatten a token document into `path -> { path, type, value }`.
 * Group-level `$type` is inherited, as the DTCG format describes.
 */
export function collect(doc, { prefix = '', into = new Map(), problems = [] } = {}) {
  const walk = (node, path, inheritedType) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    const type = typeof node.$type === 'string' ? node.$type : inheritedType;
    if (Object.prototype.hasOwnProperty.call(node, '$value')) {
      const key = path.join('.');
      if (into.has(key)) problems.push(`duplicate token path "${key}"`);
      into.set(key, { path: key, type, value: node.$value, description: node.$description });
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      if (path.length === 0 && SKIP_ROOT_KEYS.has(key)) continue;
      walk(value, [...path, key], type);
    }
  };
  walk(doc, prefix ? [prefix] : [], undefined);
  return into;
}

// --- type checking ----------------------------------------------------

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_ONLY = /(^|\s)(cubic-bezier|rgba?|hsla?|var|calc)\(|\b\d+(\.\d+)?(px|rem|em|ch|vh|vw|ms|s)\b|;/i;

const DIMENSION_UNITS = new Set(['px', 'rem']);
const DURATION_UNITS = new Set(['ms', 's']);

function isDimension(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value) &&
    typeof value.unit === 'string'
  );
}

/** Return a list of problems for one token's resolved value, given its type. */
export function typeProblems(type, value) {
  const problems = [];
  if (!type) return ['token has no $type and inherits none'];
  switch (type) {
    case 'color':
      if (typeof value !== 'string' || !HEX.test(value)) problems.push(`not a hex colour: ${JSON.stringify(value)}`);
      break;
    case 'dimension':
      if (!isDimension(value)) problems.push(`not a dimension object {value,unit}: ${JSON.stringify(value)}`);
      else if (!DIMENSION_UNITS.has(value.unit)) problems.push(`unsupported dimension unit "${value.unit}"`);
      break;
    case 'duration':
      if (!isDimension(value)) problems.push(`not a duration object {value,unit}: ${JSON.stringify(value)}`);
      else if (!DURATION_UNITS.has(value.unit)) problems.push(`unsupported duration unit "${value.unit}"`);
      break;
    case 'string':
      if (typeof value !== 'string') problems.push(`not a string: ${JSON.stringify(value)}`);
      else if (CSS_ONLY.test(value)) problems.push(`string carries CSS-only syntax: "${value}"`);
      break;
    case 'fontWeight':
      if (typeof value === 'number') {
        if (!(value >= 1 && value <= 1000)) problems.push(`fontWeight out of range: ${value}`);
      } else if (typeof value !== 'string' || !/^(normal|bold|[1-9]00)$/.test(value)) {
        problems.push(`invalid fontWeight: ${JSON.stringify(value)}`);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) problems.push(`not a finite number: ${JSON.stringify(value)}`);
      break;
    case 'cubicBezier':
      if (!Array.isArray(value) || value.length !== 4 || value.some((n) => typeof n !== 'number')) {
        problems.push(`cubicBezier must be four numbers: ${JSON.stringify(value)}`);
      } else if (value[0] < 0 || value[0] > 1 || value[2] < 0 || value[2] > 1) {
        problems.push(`cubicBezier x values must be within 0..1: ${JSON.stringify(value)}`);
      }
      break;
    case 'shadow':
      if (!Array.isArray(value)) {
        problems.push('shadow must be an array of layers');
        break;
      }
      value.forEach((layer, index) => {
        const at = `layer ${index}`;
        if (!layer || typeof layer !== 'object') {
          problems.push(`${at} is not an object`);
          return;
        }
        if (typeof layer.color !== 'string' || !HEX.test(layer.color)) problems.push(`${at} colour is not hex`);
        for (const field of ['offsetX', 'offsetY', 'blur', 'spread']) {
          if (!isDimension(layer[field])) problems.push(`${at}.${field} is not a dimension`);
          else if (layer[field].unit !== 'px') problems.push(`${at}.${field} must use px`);
        }
      });
      break;
    default:
      problems.push(`unsupported $type "${type}"`);
  }
  return problems;
}

// --- alias resolution -------------------------------------------------

/**
 * Resolve an alias chain. Returns `{ value, type }` where value has no aliases.
 * Throws on a dangling name, a cycle, or a declared-type mismatch.
 */
export function resolveToken(token, map, stack = []) {
  if (token.type === undefined) throw new Error(`token "${token.path}" has no type`);
  if (typeof token.value !== 'string') return { value: token.value, type: token.type };
  const match = token.value.match(ALIAS);
  if (!match) {
    if (token.value.includes('{') || token.value.includes('}')) {
      throw new Error(`malformed alias "${token.value}"`);
    }
    return { value: token.value, type: token.type };
  }
  const ref = match[1];
  if (stack.includes(ref)) throw new Error(`alias cycle: ${[...stack, ref].join(' -> ')}`);
  const target = map.get(ref);
  if (!target) throw new Error(`alias "{${ref}}" does not exist`);
  const resolved = resolveToken(target, map, [...stack, ref]);
  if (resolved.type !== token.type) {
    throw new Error(
      `alias type mismatch at "${token.path}": declared ${token.type}, target "${ref}" is ${resolved.type}`
    );
  }
  return resolved;
}

/** Resolve every token; returns Map path -> {value,type} plus a problem list. */
export function resolveAll(map) {
  const out = new Map();
  const problems = [];
  for (const [path, token] of map) {
    try {
      const resolved = resolveToken(token, map);
      for (const problem of typeProblems(resolved.type, resolved.value)) {
        problems.push(`${path}: ${problem}`);
      }
      out.set(path, { ...resolved, path });
    } catch (error) {
      problems.push(`${path}: ${error.message}`);
    }
  }
  return { resolved: out, problems };
}

// --- contrast ---------------------------------------------------------

function channelToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function parseHex(hex) {
  let value = hex.trim().replace('#', '');
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  if (value.length === 8) value = value.slice(0, 6); // alpha is ignored for contrast maths
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
}

export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex).map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}

// --- model helpers ----------------------------------------------------

/** Resolved colour roles for one theme, e.g. { primary: '#14539a', ... }. */
export function themeColors(core, themeDoc) {
  const map = collect(core);
  collect(themeDoc, { into: map });
  const { resolved, problems } = resolveAll(map);
  if (problems.length) throw new Error(problems.join('; '));
  const colors = {};
  for (const role of core.requirements.colorRoles) {
    const token = resolved.get(`color.${role}`);
    if (token) colors[role] = token.value;
  }
  return colors;
}

/** Platform-neutral resolved model shared by both adapters. */
export function platformNeutralModel(core, themeDocs) {
  const map = collect(core);
  const { resolved, problems } = resolveAll(map);
  if (problems.length) throw new Error(problems.join('; '));

  const get = (path) => {
    const token = resolved.get(path);
    return token ? token.value : undefined;
  };

  const typography = {};
  for (const role of core.requirements.typographyRoles) {
    typography[role] = {
      fontFamily: get(`semantic.typography.${role}.fontFamily`),
      fontSize: get(`semantic.typography.${role}.fontSize`),
      fontWeight: get(`semantic.typography.${role}.fontWeight`),
      lineHeight: get(`semantic.typography.${role}.lineHeight`),
      letterSpacing: get(`semantic.typography.${role}.letterSpacing`),
    };
  }

  const space = {};
  for (const key of Object.keys(core.space)) space[key] = get(`space.${key}`);
  const spaceRoles = {};
  for (const role of core.requirements.spaceRoles) spaceRoles[role] = get(`semantic.space.${role}`);

  const pick = (groupPath) => {
    const node = groupPath.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), core);
    const out = {};
    for (const key of Object.keys(node || {})) {
      if (key.startsWith('$')) continue;
      out[key] = get(`${groupPath}.${key}`);
    }
    return out;
  };

  const themes = {};
  for (const entry of themeDocs) {
    themes[entry.name] = {
      name: entry.name,
      label: entry.label,
      status: entry.doc.meta?.status || 'provisional',
      brandApproval: entry.doc.meta?.brandApproval || 'pending',
      colors: themeColors(core, entry.doc),
    };
  }

  return {
    meta: {
      name: core.meta.name,
      namespace: core.meta.namespace,
      version: core.meta.version,
      status: core.meta.status,
      format: core.meta.format,
      brandApproval: 'pending',
      referenceUnit: core.meta.referenceUnit,
      letterSpacingPolicy: core.meta.letterSpacingPolicy,
    },
    colorReference: Object.fromEntries(
      Object.keys(core.color.reference)
        .filter((key) => !key.startsWith('$'))
        .map((ramp) => [
          ramp,
          Object.fromEntries(
            Object.keys(core.color.reference[ramp])
              .filter((step) => !step.startsWith('$'))
              .map((step) => [step, get(`color.reference.${ramp}.${step}`)])
          ),
        ])
    ),
    typography,
    space,
    spaceRoles,
    radius: pick('radius'),
    border: pick('border'),
    size: pick('size'),
    opacity: pick('opacity'),
    motion: {
      duration: pick('motion.duration'),
      easing: pick('motion.easing'),
    },
    elevation: pick('elevation'),
    themes,
  };
}

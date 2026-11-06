import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { contrastRatio } from './lib/tokens.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = join(root, 'previews', 'creator-flow');
const themes = JSON.parse(readFileSync(join(preview, 'themes.json'), 'utf8'));
const canonical = readFileSync(join(preview, 'index.html'), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const assets = {
  'variables.css': 'dist/web/variables.css',
  'base.css': 'adapters/web/base.css',
  'components.css': 'adapters/web/components.css',
};
mkdirSync(join(preview, 'vendor'), { recursive: true });
const manifest = { package: pkg.name, version: pkg.version, status: 'provisional', files: {} };
for (const [filename, source] of Object.entries(assets)) {
  const bytes = readFileSync(join(root, source));
  copyFileSync(join(root, source), join(preview, 'vendor', filename));
  manifest.files[filename] = { source, bytes: bytes.length, sha256: hash(bytes) };
}
writeFileSync(join(preview, 'vendor', 'VERSION.json'), JSON.stringify(manifest, null, 2) + '\n');

const paletteCss = ['/* Generated preview-only colour proposals; core brand tokens are unchanged. */', ':root {',
  '  --preview-on-image: #ffffff;', '  --preview-image-shade: #00130f40;', '  --preview-image-shadow: #00130f99;',
  ...Object.entries(themes).map(([key, theme]) => `  --preview-${key}-swatch: ${theme.roles.primary};`), '}'];
for (const [key, theme] of Object.entries(themes)) {
  for (const [a, b] of [['primary','on-primary'],['surface','on-surface'],['surface','on-surface-muted'],['primary-container','on-primary-container'],['surface','tertiary']]) {
    if (contrastRatio(theme.roles[a], theme.roles[b]) < 4.5) throw new Error(`${key}: ${a}/${b} contrast below 4.5`);
  }
  paletteCss.push(`[data-preview-theme="${key}"] {`, ...Object.entries(theme.roles).map(([role, value]) => `  --pas-color-${role}: ${value};`), '}');
  if (key !== 'studio') {
    const html = canonical.replace('data-preview-theme="studio"', `data-preview-theme="${key}"`)
      .replace('Creator Flow — Studio / Personal AI Systems', `Creator Flow — ${theme.label} / Personal AI Systems`)
      .replace('/ 01 · Studio', `/ ${theme.number} · ${theme.label}`);
    writeFileSync(join(preview, theme.file), html);
  }
}
writeFileSync(join(preview, 'palettes.css'), paletteCss.join('\n') + '\n');

for (const theme of Object.values(themes)) {
  const html = readFileSync(join(preview, theme.file), 'utf8');
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error('Expected one H1');
  for (const [, path] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^(mailto:|https?:)/.test(path)) continue;
    if (!existsSync(join(preview, path))) throw new Error(`Missing asset ${path}`);
  }
  if (/action="https?:|<script[^>]+src="https?:|<link[^>]+href="https?:/.test(html)) throw new Error('Unexpected external dependency');
  if (!html.includes('does not send or store')) throw new Error('Missing prototype form notice');
}
const js = readFileSync(join(preview, 'preview.js'), 'utf8');
if (/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document.cookie/.test(js)) throw new Error('Demo must not transmit or persist user data');
if (/letter-spacing:\s*(?!0)[\d.-]/.test(readFileSync(join(preview, 'preview.css'), 'utf8'))) throw new Error('Unexpected letter spacing');

const outputArg = process.argv.indexOf('--output');
if (outputArg !== -1) {
  if (!process.argv[outputArg + 1]) throw new Error('Missing output directory');
  const output = resolve(root, process.argv[outputArg + 1]);
  if (output === root || output.startsWith(preview)) throw new Error('Output must be a separate directory');
  mkdirSync(output, { recursive: true });
  const files = ['index.html','signal.html','after-hours.html','preview.css','palettes.css','preview.js','themes.json'];
  for (const name of files) copyFileSync(join(preview, name), join(output, name));
  for (const name of ['assets', 'vendor']) cpSync(join(preview, name), join(output, name), { recursive: true });
  writeFileSync(join(output, '.nojekyll'), '');
  console.log(`Prepared static Pages artifact: ${output}`);
}
console.log(`Preview checks passed: ${Object.keys(themes).length} directions; local assets; role contrast; no data transmission/storage.`);

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { contrastRatio } from './lib/tokens.mjs';
import { renderSitePage } from './lib/site-metadata.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = join(root, 'previews', 'creator-flow');
const themes = JSON.parse(readFileSync(join(preview, 'themes.json'), 'utf8'));
// The default preview consumes the canonical package palette, not a second copy.
themes.studio.roles = JSON.parse(readFileSync(join(root, 'dist/themes/light.json'), 'utf8')).colors;
const canonical = readFileSync(join(preview, 'index.html'), 'utf8');
const siteConfig = JSON.parse(readFileSync(join(preview, 'site.config.json'), 'utf8'));
const rendered = new Map();
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

const paletteCss = ['/* Generated: canonical default and reviewer-only alternatives. */', ':root {',
  ...Object.entries(themes).map(([key, theme]) => `  --preview-${key}-swatch: ${theme.roles.primary};`), '}'];
for (const [key, theme] of Object.entries(themes)) {
  theme.roles = { ...themes.studio.roles, ...theme.roles };
  for (const [a, b] of [['primary','on-primary'],['surface','on-surface'],['surface','on-surface-muted'],['primary-container','on-primary-container'],['surface','tertiary']]) {
    if (contrastRatio(theme.roles[a], theme.roles[b]) < 4.5) throw new Error(`${key}: ${a}/${b} contrast below 4.5`);
  }
  paletteCss.push(`[data-preview-theme="${key}"] {`, ...Object.entries(theme.roles).map(([role, value]) => `  --pas-color-${role}: ${value};`), '}');
  let html = renderSitePage(canonical, siteConfig, 'index.html').replace('data-preview-theme="studio"', `data-preview-theme="${key}"`);
  if (key !== 'studio') html = html.replace('content="index, follow"', 'content="noindex, follow"');
  rendered.set(theme.file, html);
  if (key !== 'studio') writeFileSync(join(preview, theme.file), html);
}
writeFileSync(join(preview, 'palettes.css'), paletteCss.join('\n') + '\n');

for (const theme of Object.values(themes)) {
  const html = rendered.get(theme.file);
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error('Expected one H1');
  for (const [, path] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^(mailto:|https?:)/.test(path)) continue;
    if (!existsSync(join(preview, path.split('?')[0]))) throw new Error(`Missing asset ${path}`);
  }
  if (/action="https?:|<script[^>]+src="https?:|<link[^>]+rel="stylesheet"[^>]+href="https?:/.test(html)) throw new Error('Unexpected external dependency');
  if (!html.includes('does not send or store') || !html.includes('Prepare enquiry email')) throw new Error('Missing honest enquiry contract');
  if (!/<aside class="review-strip" hidden/.test(html)) throw new Error('Reviewer controls must be hidden by default');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, id] of html.matchAll(/href="#([^"]*)"/g)) {
    if (!id || !ids.has(id)) throw new Error(`Broken anchor #${id}`);
  }
}
const js = readFileSync(join(preview, 'preview.js'), 'utf8');
if (/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document.cookie/.test(js)) throw new Error('Demo must not transmit or persist user data');
if (/letter-spacing:\s*(?!0)[\d.-]/.test(readFileSync(join(preview, 'preview.css'), 'utf8'))) throw new Error('Unexpected letter spacing');

const outputArg = process.argv.indexOf('--output');
if (outputArg !== -1) {
  if (!process.argv[outputArg + 1]) throw new Error('Missing output directory');
  const output = resolve(root, process.argv[outputArg + 1]);
  if (output !== join(root, '.pages-site')) throw new Error('Output must be the repository-owned .pages-site directory');
  // Rebuild from nothing. Copying into an existing directory leaves assets from
  // an earlier concept beside the current page, so a retired demo clip stays
  // reachable at a public URL and no longer matches what the page claims.
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  const files = ['preview.css','palettes.css','preview.js','themes.json'];
  for (const name of files) copyFileSync(join(preview, name), join(output, name));
  for (const [name, html] of rendered) writeFileSync(join(output, name), html);
  writeFileSync(join(output, 'product-brief.html'), renderSitePage(readFileSync(join(preview, 'product-brief.html'), 'utf8'), siteConfig, 'product-brief.html'));
  writeFileSync(join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteConfig.url}sitemap.xml\n`);
  writeFileSync(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteConfig.url}</loc></url><url><loc>${siteConfig.url}product-brief.html</loc></url></urlset>\n`);
  for (const name of ['assets', 'vendor']) cpSync(join(preview, name), join(output, name), { recursive: true });
  writeFileSync(join(output, '.nojekyll'), '');
  console.log(`Prepared static Pages artifact: ${output}`);
}
console.log(`Preview checks passed: ${Object.keys(themes).length} directions; local assets; role contrast; no data transmission/storage.`);

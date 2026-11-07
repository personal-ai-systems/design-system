import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { siteMetadata, renderSitePage } from '../scripts/lib/site-metadata.mjs';
import { contrastRatio } from '../scripts/lib/tokens.mjs';

const read = (name) => readFileSync(new URL('../previews/creator-flow/' + name, import.meta.url), 'utf8');
const html = read('index.html');
const brief = read('product-brief.html');
const config = JSON.parse(read('site.config.json'));
const core = JSON.parse(readFileSync(new URL('../tokens/core.tokens.json', import.meta.url)));
const variants = ['index.html', 'signal.html', 'after-hours.html', 'product-brief.html'];

test('four illustrated steps explain inputs, style, another voice and the Instagram-first output', () => {
  const workflow = html.match(/<section class="workflow-band[\s\S]*?<\/section>/)[0];
  assert.equal((workflow.match(/class="journey-step"/g) || []).length, 4);
  assert.equal((workflow.match(/class="workflow-visual/g) || []).length, 4);
  assert.equal((workflow.match(/role="img" aria-label="[^"]+"/g) || []).length, 4);
  assert.match(workflow, /Illustrated concept, not a working editor/);
  assert.match(workflow, /hotel and story below are fictional/);
  assert.match(workflow, /template, or share a reference video/);
  assert.match(workflow, /Start with a short Instagram Reel\. A fuller Facebook cut can add commentary/);
  assert.match(workflow, /Compare tone, pace and pronunciation in the same language/);
  assert.match(workflow, /not an automatic post/);
  assert.match(workflow, /not an audio sample/);
  assert.doesNotMatch(workflow.match(/<ol class="workflow">[\s\S]*?<\/ol>/)[0], /<button|<input|<audio/);
  assert.ok(html.indexOf('id="how-it-works"') < html.indexOf('id="demo"'));
  for (const name of variants.slice(0, 3)) {
    const page = readFileSync(new URL('../.pages-site/' + name, import.meta.url), 'utf8');
    assert.equal((page.match(/class="journey-step"/g) || []).length, 4, name);
  }
  const image = readFileSync(new URL('../previews/creator-flow/assets/workflow-hotel-story.jpg', import.meta.url));
  assert.ok(image.length > 10000 && image.length < 600000);
});

test('voice-first problem and market case distinguish evidence from hypotheses', () => {
  assert.match(html, /Your story\.<br>A voice you choose\./);
  assert.match(html, /everyday voice, accent or delivery/);
  assert.match(html, /Adapt it into another language only when you want a second version/);
  assert.match(html, /No talking-head performance or lip-sync is required/);
  assert.match(html, /does not have to illustrate every sentence literally/);
  assert.match(html, /Illustrative voice choices, not an audio sample/);
  assert.match(html, /not a measured market for this product/);
  assert.match(html, /Illustrative TAM ceiling/);
  assert.match(brief, /Revenue assumption/);
  assert.match(brief, /not a validated price/);
  assert.match(brief, /SAM sensitivity/);
  assert.match(brief, /not research findings/);
  assert.match(brief, /not existing traction/);
  assert.match(brief, /Meta already offers Reel translation/);
  assert.match(brief, /including|retries/);
  assert.match(brief, /not provider-credit resale/);
  assert.match(brief, /credits per approved export/);
  assert.equal(2000000 * 15 * 12, 360000000);
  assert.equal(2000000 * 0.01 * 15 * 12, 3600000);
  assert.equal(2000000 * 0.05 * 15 * 12, 18000000);
  for (const domain of ['blog.youtube', 'goldmansachs.com']) assert.ok(html.includes(domain) && brief.includes(domain));
});

test('story controls are opt-in, bounded and only speak the visible script with a local voice', () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { hidden: true, disabled: false, addEventListener(type, fn) { this[type] = fn; } });
    return elements.get(id);
  };
  const slides = ['Hotel story', 'Travel story', 'Product story'].map(textContent => ({ querySelector: () => ({ textContent }) }));
  const voices = [{ lang: 'en-US', localService: false }, { lang: 'en-AU', localService: true }];
  const spoken = [];
  let stops = 0;
  runInNewContext(read('preview.js'), {
    URLSearchParams,
    document: {
      documentElement: { dataset: { previewTheme: 'studio' } },
      getElementById: element,
      querySelector: selector => {
        if (selector === '.story-carousel') return { querySelectorAll: () => slides };
        if (selector === '.review-strip') return element('review');
        return null;
      },
    },
    window: {
      location: { search: '' },
      addEventListener() {},
      SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
      speechSynthesis: { getVoices: () => voices, addEventListener() {}, speak: value => spoken.push(value), cancel() { stops++; } },
    },
  });
  assert.equal(element('story-audio').hidden, false);
  assert.equal(element('story-position').textContent, '1 / 3');
  assert.equal(element('story-prev').disabled, true);
  assert.deepEqual(slides.map(s => s.hidden), [false, true, true]);
  assert.equal(spoken.length, 0);
  element('story-play').click();
  assert.equal(spoken[0].text, 'Hotel story');
  assert.equal(spoken[0].voice, voices[1]);
  element('story-next').click();
  assert.equal(stops, 1);
  assert.deepEqual(slides.map(s => s.hidden), [true, false, true]);
  element('story-next').click();
  element('story-next').click();
  assert.equal(element('story-position').textContent, '3 / 3');
  assert.equal(element('story-next').disabled, true);
});

test('customer narrative has one product H1, four visible cases and hidden reviewer controls', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>Creator Flow<\/h1>/);
  assert.equal((html.match(/<article>/g) || []).length, 4);
  assert.match(html, /For independent travel &amp; UGC creators/);
  assert.match(html, /<aside class="review-strip" hidden/);
  assert.doesNotMatch(html, /Concept preview|Six stages|stage-map|33,000,000/);
  assert.match(read('preview.css'), /\[hidden\]\s*\{\s*display:\s*none !important/);
});

test('generated pages have unique IDs, real anchors, assets and exact metadata', () => {
  for (const name of variants) {
    const page = readFileSync(new URL('../.pages-site/' + name, import.meta.url), 'utf8');
    assert.equal((page.match(/<h1\b/g) || []).length, 1, name);
    assert.doesNotMatch(page, /__SITE_URL__|__STRUCTURED_DATA__|href="#"|href=""/);
    const matches = [...page.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(matches).size, matches.length, name + ': duplicate IDs');
    for (const [, id] of page.matchAll(/href="#([^"]*)"/g)) assert.ok(matches.includes(id), name + '#' + id);
    const graph = JSON.parse(page.match(/id="structured-data">([\s\S]*?)<\/script>/)[1]);
    assert.equal(graph['@context'], 'https://schema.org');
    assert.equal(graph['@graph'].length, 5);
    assert.ok(graph['@graph'].every(item => item['@id'].startsWith(config.url)));
    assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|offers|downloadUrl|installUrl|reviewRating/);
  }
});

test('schema entities describe the real prelaunch product, not a free released app', () => {
  const graph = siteMetadata(config)['@graph'];
  assert.equal(graph.find(x => x['@type'] === 'Organization').name, 'CONSENS PTY LTD');
  const app = graph.find(x => x['@type'] === 'SoftwareApplication');
  assert.match(app.description, /in development/);
  assert.match(app.description, /Not yet a self-service/);
  assert.equal(app.applicationCategory, 'MultimediaApplication');
  assert.throws(() => siteMetadata({ ...config, url: 'http://example.com/' }), /HTTPS/);
  assert.throws(() => siteMetadata({ ...config, url: 'https://user:secret@example.com/' }), /credentials/);
  assert.throws(() => siteMetadata({ ...config, url: 'https://example.com/?private=1' }), /query/);
  assert.doesNotMatch(renderSitePage(html, { ...config, productName: '<unsafe>' }, 'index.html').match(/id="structured-data">([\s\S]*?)<\/script>/)[1], /<unsafe>/);
});

test('enquiry installs the no-send handler before enabling HTML controls', () => {
  assert.match(html, /<fieldset id="enquiry-fields" disabled>/);
  assert.match(html, /<noscript>[\s\S]*?mailto:kirill@consens.com.au/);
  assert.match(html, /name="message"[^>]*required[^>]*maxlength="2000"/);
  assert.doesNotMatch(html, /name="name"[^>]*required/);
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { hidden: true, disabled: true, addEventListener(type, fn) { this[type] = fn; } });
    return elements.get(id);
  };
  const context = {
    document: { documentElement: { dataset: { previewTheme: 'studio' } }, querySelector: selector => selector === '.review-strip' ? element('review') : null, getElementById: element },
    window: { location: { search: '' } }, URLSearchParams,
    FormData: class { constructor(target) { this.values = target; } get(key) { return this.values[key]; } },
  };
  runInNewContext(read('preview.js'), context);
  assert.equal(element('review').hidden, true);
  assert.equal(element('enquiry-fields').disabled, false);
  let prevented = false;
  element('interest-form').submit({ preventDefault() { prevented = true; }, currentTarget: { name: 'Test & Example', audience: 'UGC', message: 'Привет? <not HTML> #1' } });
  assert.equal(prevented, true);
  const mail = new URL(element('enquiry-link').href);
  assert.equal(mail.protocol, 'mailto:');
  assert.equal(mail.pathname, config.contact);
  assert.match(mail.searchParams.get('body'), /Привет\? <not HTML> #1/);
  assert.match(element('enquiry-copy').value, /Test & Example/);
  assert.equal(element('form-result').hidden, false);
  assert.equal(context.window.location.search, '');
  assert.doesNotMatch(read('preview.js'), /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document.cookie/);
});

test('all canonical roles remain exportable and the default has one token source', () => {
  const roles = runInNewContext(read('preview.js').match(/const allRoles = (\[[^;]+\]);/)[1]);
  assert.deepEqual([...roles], core.requirements.colorRoles);
  const themes = JSON.parse(read('themes.json'));
  assert.equal(themes.studio.source, 'canonical-light');
  assert.equal(themes.studio.roles, undefined);
  const css = read('preview.css');
  assert.match(css, /--pas-font-hero-size/);
  assert.match(css, /--pas-color-image-scrim/);
  assert.doesNotMatch(css, /font-size:[^;]*(?:vw|cqw)|letter-spacing:\s*-|#[0-9a-f]{3,8}\b/i);
  const generated = readFileSync(new URL('../dist/web/variables.css', import.meta.url), 'utf8');
  const defined = new Set([...generated.matchAll(/(--pas-[\w-]+)\s*:/g)].map(m => m[1]));
  for (const [, variable] of css.matchAll(/var\((--pas-[\w-]+)/g)) assert.ok(defined.has(variable), variable);
});

test('image scrim supports white text even over a white source pixel', () => {
  const colors = JSON.parse(readFileSync(new URL('../dist/themes/light.json', import.meta.url))).colors;
  const hex = colors['image-scrim'].slice(1);
  const alpha = parseInt(hex.slice(6), 16) / 255;
  const composite = '#' + [0, 2, 4].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0')).join('');
  assert.ok(contrastRatio(colors['on-image'], composite) >= 4.5);
});

test('product brief carries the venture case without invented business evidence', () => {
  for (const pattern of [/The problem/, /first audience/, /product hypothesis/, /evaluating ElevenLabs/, /Grant credits would support/, /business, not a one-off/, /test the market/, /CONSENS PTY LTD/, /not provider-credit resale/i]) assert.match(brief, pattern);
  assert.match(brief, /Live API output and the complete creator workflow are not yet validated/);
  assert.match(brief, /Pricing, unit economics and willingness to pay remain to be tested/);
  assert.match(html, /not guaranteed accent removal/);
  assert.match(html, /Silent, with generated imagery/);
  assert.match(html, /not a real hotel or a demonstration of AI narration/);
});

test('truthful footer, privacy and crawl assets survive every build', () => {
  for (const name of variants) {
    const page = readFileSync(new URL('../.pages-site/' + name, import.meta.url), 'utf8');
    assert.match(page, /CONSENS PTY LTD/);
    for (const claim of [/trusted by/i, /our customers/i, /\d+\+? (creators|customers|users)/i, /free trial/i, /powered by ElevenLabs/i, /grant (approved|awarded)/i]) assert.doesNotMatch(page, claim);
    if (/\$\s?\d/.test(page)) assert.match(page, /(?:modelling input only|not a measured market for this product)/);
    assert.doesNotMatch(page, /\/Users\/|\.moltis|personal-vault\/raw/);
  }
  assert.match(html, /hosting\/CDN and email providers/);
  assert.doesNotMatch(html, /GitHub Pages/);
  const robots = readFileSync(new URL('../.pages-site/robots.txt', import.meta.url), 'utf8');
  const sitemap = readFileSync(new URL('../.pages-site/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(robots.includes(config.url + 'sitemap.xml'));
  assert.ok(sitemap.includes(config.url + 'product-brief.html'));
  assert.doesNotMatch(sitemap, /signal.html|after-hours.html|review=1/);
});


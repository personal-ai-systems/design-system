import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (name) => readFileSync(new URL('../previews/creator-flow/' + name, import.meta.url), 'utf8');
const html = read('index.html');

test('the customer page has four visible use cases and no public review strip', () => {
  assert.equal((html.match(/<article>/g) || []).length, 4);
  assert.match(html, /<aside class="review-strip" hidden/);
  assert.doesNotMatch(html, /Concept preview|Submit expression of interest/);
  assert.match(read('preview.css'), /\[hidden\]\s*\{\s*display:\s*none !important/);
  assert.match(read('preview.js'), /get\('review'\) === '1'/);
});

test('every in-page destination exists and the footer has no dummy links', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, id] of html.matchAll(/href="#([^"]*)"/g)) assert.ok(id && ids.has(id), id);
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
  assert.match(footer, /CONSENS PTY LTD/);
  assert.match(footer, /mailto:kirill@consens.com.au/);
  assert.match(footer, /href="#privacy"/);
  assert.doesNotMatch(footer, /href="#"|Concept preview|Studio|Signal/);
});

test('enquiry prepares encoded mail and a fallback without sending or navigating', () => {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { hidden: true, addEventListener(type, fn) { this[type] = fn; } });
    return elements.get(id);
  };
  const context = {
    document: {
      documentElement: { dataset: { previewTheme: 'studio' } },
      querySelector: (selector) => selector === '.review-strip' ? element('review') : null,
      getElementById: element,
    },
    window: { location: { search: '' } },
    URLSearchParams,
    FormData: class { constructor(target) { this.values = target; } get(key) { return this.values[key]; } },
  };
  runInNewContext(read('preview.js'), context);
  assert.equal(element('review').hidden, true);
  let prevented = false;
  element('interest-form').submit({
    preventDefault() { prevented = true; },
    currentTarget: { name: 'Test & Example', audience: 'UGC', message: 'A story? <not HTML> #1' },
  });
  assert.equal(prevented, true);
  const mail = new URL(element('enquiry-link').href);
  assert.equal(mail.protocol, 'mailto:');
  assert.equal(mail.pathname, 'kirill@consens.com.au');
  assert.equal(mail.searchParams.get('subject'), 'Creator Flow early-access enquiry');
  assert.match(mail.searchParams.get('body'), /Test & Example/);
  assert.match(element('enquiry-copy').value, /<not HTML>/);
  assert.equal(element('form-result').hidden, false);
  assert.equal(context.window.location.search, '');
});

test('default palette uses the shared package rather than duplicated values', () => {
  const themes = JSON.parse(read('themes.json'));
  assert.equal(themes.studio.source, 'canonical-light');
  assert.equal(themes.studio.roles, undefined);
});

// --- content contract for the reviewer-facing revision -------------------
//
// The immediate reader is a grant reviewer asking a fixed set of questions.
// These assertions keep the answers present and keep the unevidenced claims
// out. They check the generated variants too, because both are published.

const variants = ['index.html', 'signal.html', 'after-hours.html'];

test('every published variant states the product category literally', () => {
  for (const name of variants) {
    const page = read(name);
    assert.match(page, /Voice-led video creation for independent creators\./, name);
    assert.match(page, /<h1[^>]*>Creator Flow<\/h1>/, name);
    assert.match(page, /Personal AI Systems/, name);
  }
});

test('the voice section keeps the six stages in order and states what runs', () => {
  const page = read('index.html');
  const section = page.match(/<section class="voice-band[^"]*"[\s\S]*?<\/section>/);
  assert.ok(section, 'voice section is missing');
  const order = ['Spoken brief', 'Transcript', 'Reviewed script', 'Approved narration', 'Captions', 'Export'];
  const positions = order.map((stage) => section[0].indexOf(`<h3>${stage}</h3>`));
  positions.forEach((position, index) => assert.ok(position > -1, `${order[index]} missing`));
  const sorted = [...positions].sort((a, b) => a - b);
  assert.deepEqual(positions, sorted, 'stages are out of order');

  const states = [...section[0].matchAll(/<span class="stage-state">([^<]+)<\/span>/g)].map((match) => match[1]);
  assert.equal(states.length, 6);
  assert.equal(states.filter((state) => state === 'Working').length, 4);
  assert.equal(states.filter((state) => state === 'Proposed').length, 1);
  assert.equal(states.filter((state) => state === 'Planned').length, 1);
  assert.match(section[0], /stage-state">Proposed<\/span><h3>Approved narration/, 'narration must not read as shipped');
  assert.match(section[0], /whisper\.cpp/);
});

test('ElevenLabs is named as an intended integration, with no claimed relationship', () => {
  const page = read('index.html');
  assert.match(page, /intended ElevenLabs integration/);
  assert.match(page, /ElevenLabs is the intended provider for that stage/);
  assert.match(page, /adapters are implemented in the prototype/);
  assert.match(page, /live API output and the complete creator workflow are not yet validated/);
  assert.doesNotMatch(page, /paid voice branch has not been built/);
  for (const claim of [
    /powered by ElevenLabs/i,
    /ElevenLabs partner/i,
    /grant (approved|awarded)/i,
    /we (have )?partnered/i,
    /official (partner|provider)/i,
    /accent removal (is|works)/i,
    /guaranteed (accent|results|income|growth)/i,
  ]) {
    assert.doesNotMatch(page, claim);
  }
});

test('built and next are separated and public code is not claimed as this product', () => {
  const page = read('index.html');
  const section = page.match(/<section class="proof-band[^"]*"[\s\S]*?<\/section>/);
  assert.ok(section, 'built section is missing');
  assert.match(section[0], /<h3>Working today<\/h3>/);
  assert.match(section[0], /<h3>Next, in this order<\/h3>/);
  const [working, next] = section[0].split('<h3>Next, in this order</h3>');
  assert.match(working, /whisper\.cpp/);
  assert.match(working, /portrait, feed and landscape/);
  assert.match(next, /adaptation into a creator-selected language/);
  assert.match(next, /Consent, licence and usage controls/);
  assert.match(next, /invited pilot/);
  assert.match(section[0], /https:\/\/github\.com\/personal-ai-systems\/personal-vault"/);
  assert.match(section[0], /https:\/\/github\.com\/personal-ai-systems\/personal-vault-ui/);
  assert.match(section[0], /not the source of Creator Flow/);
});

test('the business section states own product, planned paid access and the operator', () => {
  const page = read('index.html');
  const section = page.match(/<section class="business[^"]*"[\s\S]*?<\/section>/);
  assert.ok(section, 'business section is missing');
  assert.match(section[0], /CONSENS PTY LTD/);
  assert.match(section[0], /our own commercial product/);
  assert.match(section[0], /not resold provider credits/);
  assert.match(section[0], /planned paid service/);
  assert.doesNotMatch(section[0], /we do not make campaign videos to order/);
  assert.match(section[0], /paid access to that workflow/);
  assert.match(section[0], /repeatable workflow, not a single commissioned video/);
  assert.match(section[0], /No price is published/);
  assert.match(section[0], /no account to create/);
});

test('cache and spending claims stay within actual prototype scope', () => {
  assert.match(html, /audio caching reuses unchanged narration/);
  assert.doesNotMatch(html, /an edit re-renders only what changed/);
  assert.match(html, /planned paid service will include a usage preview/);
  assert.doesNotMatch(html, /cost is shown before the request is made and charged/);
});

test('no invented traction, price, social proof or inert link survives the page', () => {
  const page = read('index.html');
  for (const claim of [
    /testimonial/i, /trusted by/i, /our customers/i, /case study/i,
    /[0-9]+\+? (creators|customers|users)/i, /\$\s?\d/, /£\s?\d/, /€\s?\d/,
    /free trial/i, /book a demo/i, /lorem ipsum/i,
  ]) {
    assert.doesNotMatch(page, claim);
  }
  assert.doesNotMatch(page, /href="#"|href=""/);
});

test('the silent sample keeps its honest label in every variant', () => {
  for (const name of variants) {
    const page = read(name);
    assert.match(page, /seven-second visual sample/, name);
    assert.match(page, /It is silent: it does not demonstrate voice generation or translation/, name);
    assert.match(page, /Generated imagery, not a real hotel, customer result or partnership/, name);
    assert.match(page, /Not yet a self-service creation tool/, name);
  }
});

test('published preview files carry no local path or private record', () => {
  const published = ['index.html', 'signal.html', 'after-hours.html', 'preview.css', 'palettes.css', 'preview.js', 'themes.json', 'README.md'];
  for (const name of published) {
    const text = read(name);
    assert.doesNotMatch(text, /\/Users\/[a-z]/, `${name} contains an absolute home path`);
    for (const term of ['personal-vault/raw', '.moltis', 'travel-ugc', 'ABN 61 678', 'workspace root']) {
      assert.ok(!text.includes(term), `${name} contains "${term}"`);
    }
  }
});


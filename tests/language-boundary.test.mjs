import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('product direction leaves source and output language to the creator', async () => {
  for (const file of ['docs/brand-guidelines.md', 'previews/creator-flow/index.html', 'previews/creator-flow/signal.html', 'previews/creator-flow/after-hours.html']) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /Russian-to-English|reviewed English script|reviewed English adaptation|Review an English adaptation/i, file);
    assert.match(source, /chosen language|creator-selected language/, file);
    // An English demo caption and measured English-only prototype evidence are
    // truthful historical scope, not a requirement imposed on every creator.
  }
});

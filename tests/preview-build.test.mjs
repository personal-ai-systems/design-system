import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('preview build refuses to clear an arbitrary output directory', () => {
  const target = mkdtempSync(join(tmpdir(), 'pas-output-guard-'));
  const sentinel = join(target, 'keep.txt');
  writeFileSync(sentinel, 'preserve');
  try {
    assert.throws(() => execFileSync(process.execPath, [
      fileURLToPath(new URL('../scripts/build-previews.mjs', import.meta.url)), '--output', target,
    ], { stdio: 'pipe' }), /repository-owned/);
    assert.equal(readFileSync(sentinel, 'utf8'), 'preserve');
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

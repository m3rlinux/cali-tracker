#!/usr/bin/env node
// Regression checks for review fixes (no DOM required).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const wod = JSON.parse(readFileSync(join(root, 'wod.json'), 'utf8'));

function extractFn(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

const escapeHtml = new Function(`return (${extractFn(html, 'escapeHtml')})`)();

assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
assert.equal(escapeHtml('a&b'), 'a&amp;b');
assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
assert.equal(escapeHtml("it's"), 'it&#39;s');
assert.equal(escapeHtml(null), '');

const version = html.match(/const VERSION = '([^']+)'/)[1];
assert.equal(version, '3.31.4');
assert.match(html, /Cali Tracker v3\.31\.4/);
assert.match(sw, /const CACHE_VERSION = '3\.31\.4'/);

const setCoach = extractFn(html, 'setCoachMode');
assert.match(setCoach, /if \(on\) collectStep\(currentStep\);/);
assert.ok(
  setCoach.indexOf('collectStep') < setCoach.indexOf('KEY_COACH'),
  'collectStep must run before flipping cali_coach'
);

assert.match(extractFn(html, 'timerOnBlockComplete'), /!isRingStepIdx\(_timer\.stepIdx\)/);
assert.match(html, /header-seg header-seg-lang/);
assert.match(html, /header-seg header-seg-mode/);
assert.match(html, /id="name-badge-text"/);

assert.match(html, /html \{ background-color: #0c0c0c/);
assert.match(html, /interactive-widget=overlays-content/);
assert.match(html, /function nudgeViewport\(/);

const restoreTemp = extractFn(html, 'restoreTempState');
assert.doesNotMatch(restoreTemp, /removeItem/);
assert.match(extractFn(html, 'clearTempState'), /removeItem\(TEMP_KEY\)/);
assert.match(extractFn(html, 'saveTempState'), /if \(!_initDone\) return/);
assert.match(extractFn(html, 'reloadForUpdate'), /if \(_reloadingForUpdate\) return/);
assert.match(html, /addEventListener\('pagehide', saveTempState\)/);
assert.match(html, /if \(hadTemp\) clearTempState\(\)/);

assert.match(extractFn(html, 'onCategoryChange'), /collectStep\(currentStep\)/);
assert.match(extractFn(html, 'saveTimingEdit'), /collectStep\(currentStep\)/);

const classPlan = extractFn(html, 'buildClassCircuitPlan');
assert.match(classPlan, /for \(let si = 1; si <= 2; si\+\+\)/);
assert.match(classPlan, /S\$\{si\} · lavoro/);
assert.match(classPlan, /si === 2 && set === totalRounds/);

assert.match(html, /\.timer-bar\.timer-phase-rest\.timer-rotate/);
assert.match(extractFn(html, 'renderTimerBar'), /timer-rotate/);

assert.equal(wod.stations.p2s2.variant, 'Dead bug');
assert.equal(wod.stations.p2s2.set_time, 20);

assert.match(html, /combo: '--combo'/);
assert.match(html, /--combo: #c8f060/);

assert.match(extractFn(html, 'importData'), /escapeHtml\(file\.name\)/);
assert.match(extractFn(html, 'coachExListHTML'), /escapeHtml\(name\)/);

console.log('ok: v3.31.4 review fixes');

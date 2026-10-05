#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const wod = JSON.parse(readFileSync(join(root, 'wod.json'), 'utf8'));

function extractFn(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'missing function ' + name);
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unclosed function ' + name);
}

const modelSource = [
  'classLessonText', 'getClassLesson', 'classLessonBlockSeconds',
  'buildClassLessonTimerPlan'
].map(extractFn).join('\n');
const model = runInNewContext(modelSource +
  '\n({ getClassLesson, buildClassLessonTimerPlan })');
const lesson = wod.class_lesson;
assert.ok(model.getClassLesson(lesson));
const plan = model.buildClassLessonTimerPlan(lesson);
assert.equal(plan.totalSeconds, 3600);
assert.equal(plan.phases.length, 31);
assert.ok(plan.phases.every(p => p.type !== 'prep'));

let elapsed = 0;
const boundaries = [];
for (const phase of plan.phases) {
  elapsed += phase.seconds;
  const nextBlock = plan.phases[plan.phases.indexOf(phase) + 1]?.lessonBlockIdx;
  if (nextBlock !== phase.lessonBlockIdx || phase.lessonHalf === 1) boundaries.push(elapsed);
}
assert.deepEqual(boundaries, [480, 720, 1140, 1560, 1980, 2400, 3120, 3600]);
const finisher = plan.phases.filter(p => p.lessonBlockIdx === 4);
assert.equal(finisher.length, 24);
assert.deepEqual(Array.from(finisher, p => p.type), Array.from({ length: 12 }, () => ['work', 'rest']).flat());
assert.ok(finisher.every(p => p.seconds === (p.type === 'work' ? 40 : 20)));
assert.equal(finisher.at(-1).round, 4);
assert.equal(model.getClassLesson(undefined), null);
assert.equal(model.buildClassLessonTimerPlan({ participants: 5, blocks: [] }), null);

const source = modelSource + '\n' + [
  'timerStartPhase', 'startClassLessonTimer', 'pauseTimer',
  'skipTimerPhase', 'timerAdvancePhase'
].map(extractFn).join('\n') + '\nstartClassLessonTimer();';
let now = 0;
const timerContext = {
  draftSession: { class_lesson: lesson },
  _timer: null, _timerRaf: null,
  Date: { now: () => now },
  isCoachMode: () => true, canUseClass: () => true,
  stopTimer: () => { timerContext._timer = null; },
  primeTimerAudio() {}, requestWakeLock() {}, timerTick() {},
  renderCoachBoard() {}, renderTimerBar() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  isVoiceCue: () => false, timerBeep() {}, timerStopSpeech() {},
  timerIsLastRestOfStep: () => false,
  timerOnBlockComplete: () => { timerContext._timer = null; }
};
runInNewContext(source, timerContext);
assert.equal(timerContext._timer.endsAt, 480000);
now = 100000;
runInNewContext('pauseTimer()', timerContext);
assert.equal(timerContext._timer.remainingPaused, 380);
now = 600000;
runInNewContext('pauseTimer()', timerContext);
assert.equal(timerContext._timer.endsAt, 980000);
runInNewContext('skipTimerPhase()', timerContext);
assert.equal(timerContext._timer.phaseIdx, 1);
assert.equal(timerContext._timer.endsAt, 840000);

let saved;
const saveContext = {
  currentStep: 0, currentSess: 1, editingSession: false, draftDirty: true,
  draftSession: { date: '01/10/26', wod: true, class_lesson: lesson },
  collectStep() {}, getData: () => ({}),
  cloneObj: x => JSON.parse(JSON.stringify(x)),
  saveData: data => { saved = data; },
  renderSessBar() {}, renderHistory() {}, renderProgress() {},
  document: { getElementById: () => ({ classList: { add() {}, remove() {} } }) },
  setTimeout() {}
};
runInNewContext(extractFn('saveSession') + '\nsaveSession()', saveContext);
assert.equal(saved[1].class_lesson, undefined);
assert.ok(saveContext.draftSession.class_lesson);

let boardHtml = '';
const viewContext = {
  lesson, _timer: null,
  getLang: () => 'it',
  escapeHtml: x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;'),
  formatTimerDuration: s => (s / 60) + ' min',
  document: { getElementById: () => ({ set innerHTML(value) { boardHtml = value; } }) }
};
runInNewContext(modelSource + '\n' +
  extractFn('classLessonCardHTML') + '\n' +
  extractFn('renderClassLessonBoard') + '\nrenderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /Via lezione/);
assert.match(boardHtml, /Dopo 7 min/);
assert.match(boardHtml, /Bear crawl avanti e indietro/);
viewContext._timer = { active: true, classLesson: true, phases: plan.phases, phaseIdx: 3 };
runInNewContext('renderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /Dopo 7 min ✓/);
assert.doesNotMatch(boardHtml, /Via lezione/);

const sessionValues = new Map();
const reloadContext = {
  _initDone: true, _authStatus: 'approved', TEMP_KEY: 'cali_temp_state',
  currentSess: 2, currentStep: 0, editingSession: false, draftDirty: false,
  draftSession: { wod: true, class_lesson: lesson },
  collectStep() {}, clampStepToActive() {},
  cloneObj: x => JSON.parse(JSON.stringify(x)),
  migrateSessionVariants: x => x,
  sessionStorage: {
    setItem: (k, v) => sessionValues.set(k, v),
    getItem: k => sessionValues.get(k)
  }
};
runInNewContext(extractFn('saveTempState') + '\n' +
  extractFn('restoreTempState') + '\nsaveTempState()', reloadContext);
assert.ok(JSON.parse(sessionValues.get('cali_temp_state')).draft.class_lesson);
reloadContext.draftSession = {};
assert.equal(runInNewContext('restoreTempState()', reloadContext), true);
assert.equal(reloadContext.draftSession.class_lesson.participants, 5);

console.log('class lesson checks passed');

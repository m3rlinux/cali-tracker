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
const clone = x => JSON.parse(JSON.stringify(x));
const modelSource = [
  'classLessonText', 'classLessonIsGroupBlock', 'getClassLesson',
  'classLessonBlockSeconds', 'buildClassLessonTimerPlan'
].map(extractFn).join('\n');
const model = runInNewContext(modelSource + '\n({ getClassLesson, buildClassLessonTimerPlan })');
const lesson = wod.class_lesson;
assert.ok(model.getClassLesson(lesson));
const plan = model.buildClassLessonTimerPlan(lesson);
assert.equal(plan.totalSeconds, 3600);
assert.equal(plan.phases.length, 28);
assert.equal(lesson.participants, 8);
assert.deepEqual(lesson.blocks.filter(b => b.type === 'groups').map(b => b.groups.map(g => g.size)), [[3, 3, 2], [3, 3, 2]]);
assert.ok(plan.phases.every(p => p.type !== 'prep'));
let elapsed = 0;
const boundaries = [];
plan.phases.forEach((phase, i) => {
  elapsed += phase.seconds;
  const next = plan.phases[i + 1];
  if (next?.lessonBlockIdx !== phase.lessonBlockIdx ||
      next?.lessonRotation > phase.lessonRotation) boundaries.push(elapsed);
});
assert.deepEqual(boundaries, [480, 600, 900, 1200, 1500, 1620, 1920, 2220, 2520, 3060, 3600]);
const finisher = plan.phases.filter(p => p.lessonBlockIdx === 5);
assert.equal(finisher.length, 18);
assert.deepEqual(Array.from(finisher, p => p.type),
  Array.from({ length: 9 }, () => ['work', 'rest']).flat());
assert.ok(finisher.every(p => p.seconds === (p.type === 'work' ? 40 : 20)));
assert.equal(finisher.at(-1).round, 3);
assert.ok(lesson.blocks[5].exercises.every(ex => ex.en && ex.en.trim()));
assert.ok(lesson.blocks[5].target.en);
assert.equal(model.getClassLesson(undefined), null);
assert.equal(model.buildClassLessonTimerPlan({ participants: 5, blocks: [] }), null);

const groupBlock = {
  type: 'groups', title: { it: 'Gruppi' }, seconds: 800, swap_after: 100,
  groups: Array.from({ length: 8 }, (_, i) => ({
    size: 1, exercise: { it: 'Esercizio ' + (i + 1) }
  }))
};
const eight = { participants: 8, blocks: [groupBlock] };
assert.equal(model.buildClassLessonTimerPlan(eight).phases.length, 8);
assert.equal(model.getClassLesson({ participants: 8, blocks: [{ ...groupBlock, groups: [] }] }), null);
assert.equal(model.getClassLesson({ participants: 9, blocks: [{ ...groupBlock,
  groups: [...groupBlock.groups, { size: 1, exercise: 'Nove' }] }] }), null);
assert.equal(model.getClassLesson({ participants: 9, blocks: [groupBlock] }), null);
assert.equal(model.getClassLesson({ participants: 8, blocks: [{ ...groupBlock,
  groups: [null, ...groupBlock.groups.slice(1)] }] }), null);
const one = { participants: 1, blocks: [{ type: 'groups', title: 'Solo',
  seconds: 120, groups: [{ size: 1, exercise: 'Push-up' }] }] };
assert.equal(model.buildClassLessonTimerPlan(one).phases.length, 1);
assert.ok(model.getClassLesson({ participants: 8, blocks: [
  { ...clone(lesson.blocks[2]), type: 'pair',
    groups: [{ size: 3, exercise: 'Ring rows' }, { size: 5, exercise: 'Squats' }] }
] }));

const timerSource = modelSource + '\n' + [
  'timerStartPhase', 'startClassLessonTimer', 'pauseTimer',
  'skipTimerPhase', 'timerAdvancePhase'
].map(extractFn).join('\n');
let now = 0;
const timerContext = {
  draftSession: { class_lesson: lesson }, _timer: null, _timerRaf: null,
  Date: { now: () => now }, getLang: () => 'it',
  isCoachMode: () => true, canUseClass: () => true,
  stopTimer: () => { timerContext._timer = null; },
  primeTimerAudio() {}, requestWakeLock() {}, timerTick() {},
  renderCoachBoard() {}, renderTimerBar() {}, confirm: () => true,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  isVoiceCue: () => false, timerBeep() {}, timerStopSpeech() {},
  timerIsLastRestOfStep: () => false,
  timerOnBlockComplete: () => { timerContext._timer = null; }
};
runInNewContext(timerSource + '\nstartClassLessonTimer();', timerContext);
assert.equal(timerContext._timer.endsAt, 480000);
now = 100000;
runInNewContext('pauseTimer()', timerContext);
assert.equal(timerContext._timer.remainingPaused, 380);
now = 600000;
runInNewContext('pauseTimer()', timerContext);
assert.equal(timerContext._timer.endsAt, 980000);
runInNewContext('skipTimerPhase()', timerContext);
assert.equal(timerContext._timer.phaseIdx, 1);
assert.equal(timerContext._timer.endsAt, 720000);
timerContext._timer = null; // stop
runInNewContext('startClassLessonTimer(3)', timerContext); // Block B briefing
assert.equal(timerContext._timer.phaseIdx, 5);
assert.equal(timerContext._timer.endsAt, 720000);
runInNewContext('startClassLessonTimer(4)', timerContext); // Block B first rotation
assert.equal(timerContext._timer.phaseIdx, 6);
assert.equal(timerContext._timer.endsAt, 900000);
runInNewContext('startClassLessonTimer(5)', timerContext); // finisher starts with work, round 1
assert.equal(timerContext._timer.phaseIdx, 9);
assert.equal(timerContext._timer.phases[9].round, 1);
assert.equal(timerContext._timer.phases[9].type, 'work');
runInNewContext('startClassLessonTimer(6)', timerContext); // cooldown
assert.equal(timerContext._timer.phaseIdx, 27);
runInNewContext('startClassLessonTimer(7)', timerContext); // invalid block
assert.equal(timerContext._timer.phaseIdx, 27);

let saved;
let saveCount = 0;
let historyCount = 0;
const data = {};
const toast = { textContent: '', classList: { add() {}, remove() {} } };
const saveContext = {
  currentStep: 0, currentSess: 1, editingSession: false, draftDirty: true,
  draftSession: { date: '01/10/26', wod: true, class_lesson: lesson,
    p0: { ex: { sets: [[12, null]] } } },
  isCoachMode: () => true, canUseClass: () => true,
  getClassLesson: model.getClassLesson, getLang: () => 'it',
  collectStep() { throw new Error('exercise progress must not be collected'); },
  getData: () => data, cloneObj: clone,
  saveData: value => { saved = clone(value); saveCount++; },
  stopTimer() {}, renderSessBar() {}, renderCoachBoard() {},
  renderHistory() { historyCount++; }, renderProgress() {},
  document: { getElementById: () => toast }, setTimeout() {}
};
runInNewContext([
  extractFn('getClassLessonRecords'), extractFn('saveClassLesson'),
  extractFn('saveSession'), 'saveSession()'
].join('\n'), saveContext);
assert.equal(saveCount, 1);
assert.equal(historyCount, 1);
assert.equal(saved[1], undefined);
assert.equal(saved.class_lessons.length, 1);
assert.ok(Number.isFinite(Date.parse(saved.class_lessons[0].performed_at)));
assert.deepEqual(saved.class_lessons[0].lesson, clone(lesson));
assert.ok(!('p0' in saved.class_lessons[0].lesson));
assert.ok(saveContext.draftSession.class_lesson_saved_id);
runInNewContext('saveSession()', saveContext);
assert.equal(saved.class_lessons.length, 1); // repeated Save updates the same class
assert.equal(saveCount, 2);

const legacyContext = {
  currentStep: 0, currentSess: 1, editingSession: false, draftDirty: true,
  draftSession: { date: '01/10/26', wod: true, class_lesson: lesson },
  isCoachMode: () => false, collectStep() {}, getData: () => ({}),
  cloneObj: clone, saveData: value => { saved = value; },
  renderSessBar() {}, renderHistory() {}, renderProgress() {},
  document: { getElementById: () => toast }, setTimeout() {}
};
runInNewContext(extractFn('saveSession') + '\nsaveSession()', legacyContext);
assert.equal(saved[1].class_lesson, undefined);

let boardHtml = '';
const host = { set innerHTML(value) { boardHtml = value; } };
const viewContext = {
  lesson, _timer: null, getLang: () => 'it',
  escapeHtml: x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;'),
  formatTimerDuration: s => (s / 60) + ' min',
  document: { getElementById: () => host }
};
const viewSource = modelSource + '\n' + [
  'classLessonCardHTML', 'renderClassLessonBoard'
].map(extractFn).join('\n');
runInNewContext(viewSource + '\nrenderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /Via lezione/);
assert.match(boardHtml, /Avvia da qui/);
assert.equal((boardHtml.match(/class="coach-lesson-start"/g) || []).length, lesson.blocks.length);
assert.match(boardHtml, /startClassLessonTimer\(3\)/);
assert.doesNotMatch(boardHtml, /startClassLessonTimer\(7\)/);
assert.match(boardHtml, /Table toe taps → Hollow/);
assert.match(boardHtml, /Mobilità di polsi, spalle e anche/);
assert.match(boardHtml, /Spiegazione blocco A/);
assert.match(boardHtml, /Spiegazione blocco B/);
assert.match(boardHtml, /Gruppo 3 \(2\)/);
viewContext.getLang = () => 'en';
runInNewContext('renderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /High plank → push-up → high plank → shoulder taps/);
assert.match(boardHtml, /Tabletop toe taps → Hollow hold/);
assert.doesNotMatch(boardHtml, /squat thrust/i);
viewContext.getLang = () => 'it';
viewContext._timer = { active: true, classLesson: true, phases: plan.phases, phaseIdx: 3 };
runInNewContext('renderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /Dopo 5 min/);
assert.doesNotMatch(boardHtml, /Via lezione/);
assert.doesNotMatch(boardHtml, /Avvia da qui/);
viewContext._timer = null;
viewContext.lesson = eight;
runInNewContext('renderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /Gruppo 8 \(1\)/);
viewContext._timer = { active: true, classLesson: true,
  phases: model.buildClassLessonTimerPlan(eight).phases, phaseIdx: 1 };
runInNewContext('renderClassLessonBoard(lesson)', viewContext);
assert.match(boardHtml, /Gruppo 1 \(1\): Esercizio 2/);

let historyHtml = '';
const historyContext = {
  canUseClass: () => true, getLang: () => 'it', getClassLessonRecords:
    value => value.class_lessons || [], getClassLesson: model.getClassLesson,
  buildClassLessonTimerPlan: model.buildClassLessonTimerPlan,
  classLessonCardHTML: () => '<div>Blocco</div>',
  formatTimerDuration: s => (s / 60) + ' min',
  escapeHtml: x => String(x),
  document: { getElementById: () => ({ set innerHTML(value) { historyHtml = value; } }) }
};
runInNewContext(extractFn('renderClassLessonHistory') +
  '\nrenderClassLessonHistory(data)', { ...historyContext, data });
assert.match(historyHtml, /Lezioni svolte/);
assert.match(historyHtml, /Blocco/);

const sessionValues = new Map();
const reloadContext = {
  _initDone: true, _authStatus: 'approved', TEMP_KEY: 'cali_temp_state',
  currentSess: 2, currentStep: 0, editingSession: false, draftDirty: false,
  draftSession: { wod: true, class_lesson: lesson },
  collectStep() {}, clampStepToActive() {}, cloneObj: clone,
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
assert.equal(reloadContext.draftSession.class_lesson.participants, 8);

console.log('class lesson checks passed');

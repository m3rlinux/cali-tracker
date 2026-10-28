import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const wod = JSON.parse(read('wod.json'));
const archived = JSON.parse(read('wod-archive/006-classe-5-2026-10-28.json'));
const html = read('index.html');
function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start >= 0);
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw Error(name);
}
const model = runInNewContext(['classLessonText', 'classLessonIsGroupBlock', 'getClassLesson',
  'classLessonBlockSeconds', 'buildClassLessonTimerPlan'].map(extract).join('\n')
  + '\n({ getClassLesson, buildClassLessonTimerPlan })');
const lesson = wod.class_lesson;
assert.deepEqual(lesson, archived.class_lesson);
assert.equal(archived.metadata.status, 'planned');
assert.equal(archived.metadata.performed_on, null);
assert.equal(lesson.participants, 5);
assert.ok(model.getClassLesson(lesson));
const plan = model.buildClassLessonTimerPlan(lesson);
assert.equal(plan.totalSeconds, 3460); // 57:40
for (const letter of ['A', 'B']) {
  const rotations = lesson.blocks.map((b, i) => ({ b, i }))
    .filter(({ b }) => b.title.it.startsWith('Forza ' + letter + ' - rotazione'));
  assert.equal(rotations.length, 3);
  for (const { b, i } of rotations) {
    assert.equal(b.rounds, 3);
    assert.equal(b.work, 40);
    assert.equal(b.rest, 40);
    assert.equal(b.exercises.length, 1);
    assert.match(b.title.it, /G1:2, G2:2, G3:1/);
    const phases = plan.phases.filter(p => p.lessonBlockIdx === i);
    assert.deepEqual(Array.from(phases, p => p.type), ['work', 'rest', 'work', 'rest', 'work', 'rest']);
    assert.ok(phases.every(p => p.seconds === 40));
    assert.equal(phases.reduce((n, p) => n + p.seconds, 0), 240);
    // Each pair gets three complete 20-sec turns each plus 20-sec changes.
    assert.equal(phases.filter(p => p.type === 'work').length, 3);
    assert.equal(phases.filter(p => p.type === 'rest').length, 3);
  }
  for (let group = 1; group <= 3; group++) {
    const assigned = rotations.map(({ b }) => b.exercises[0].it.split(' | ')[group - 1]);
    assert.equal(new Set(assigned.map(s => s.replace(/^G[123]: /, ''))).size, 3);
  }
  const changes = lesson.blocks.filter(b => b.title.it === 'Cambio postazioni forza ' + letter);
  assert.equal(changes.length, 2);
  assert.ok(changes.every(b => b.seconds === 40));
}
assert.match(JSON.stringify(lesson), /Split squat CON CARICO/);
assert.match(JSON.stringify(lesson), /parallettes basse/);
assert.match(JSON.stringify(lesson), /20 s per scendere/);
const flow = lesson.blocks.filter(b => b.title.it.startsWith('Flow'));
assert.equal(flow.reduce((n, b) => n + (b.seconds || b.rounds * b.exercises.length * (b.work + b.rest)), 0), 480);
assert.match(JSON.stringify(flow), /beast.*crab/);
console.log('ok: class WOD 2026-10-28, 5 participants, all rotations and final B turns, 57:40, archive matches');

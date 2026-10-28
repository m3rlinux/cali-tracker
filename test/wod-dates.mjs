import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function extract(name) {
 const start = html.indexOf('function '+name+'(');
 let depth=0;
 for(let i=html.indexOf('{',start);i<html.length;i++) {
  if(html[i]==='{') depth++;
  if(html[i]==='}' && --depth===0) return html.slice(start,i+1);
 }
 throw Error(name);
}
const clone = x => JSON.parse(JSON.stringify(x));
const lesson = JSON.parse(readFileSync(new URL('../wod.json',import.meta.url))).class_lesson;
let data={1:{date:'01/10/26',p1s1:{sets:[[5,null]]}},class_lessons:[
 {id:'old',performed_at:'2026-10-10T12:00:00Z',lesson,extra:42}]};
const original=clone(data);
const host={innerHTML:'',classList:{add(){},remove(){}}};
const ctx={draftSession:{class_lesson:lesson,class_lesson_date:'2026-10-07'},draftDirty:false,
 canUseClass:()=>true,getClassLesson:x=>x,getData:()=>clone(data),saveData:x=>{data=clone(x)},cloneObj:clone,
 stopTimer(){},renderSessBar(){},renderCoachBoard(){},renderHistory(){},getLang:()=> 'it',
 document:{getElementById:()=>host},setTimeout(){},escapeHtml:String,
 buildClassLessonTimerPlan:()=>({totalSeconds:3600}),classLessonCardHTML:()=>'',formatTimerDuration:String};
const names=['localCalendarDate','validCalendarDate','classLessonDate','getClassLessonRecords',
 'saveClassLesson','onClassLessonDateChange','changeSavedClassLessonDate','renderClassLessonHistory'];
runInNewContext(names.map(extract).join('\n'),ctx);
const run=s=>runInNewContext(s,ctx);
run('saveClassLesson()');
assert.equal(data.class_lessons[1].performed_date,'2026-10-07');
assert.deepEqual(data[1],original[1]);
assert.deepEqual(data.class_lessons[0],original.class_lessons[0]);
const timestamp=data.class_lessons[1].performed_at;
run('onClassLessonDateChange({value:"2026-10-05"}); saveClassLesson()');
assert.equal(data.class_lessons.length,2);
assert.equal(data.class_lessons[1].performed_date,'2026-10-05');
assert.equal(data.class_lessons[1].performed_at,timestamp);
run('changeSavedClassLessonDate(0,{value:"2026-10-01"})');
assert.deepEqual(data.class_lessons[0],{...original.class_lessons[0],performed_date:'2026-10-01'});
run('renderClassLessonHistory(getData())');
assert.ok(host.innerHTML.indexOf('05/10/2026')<host.innerHTML.indexOf('01/10/2026'));
assert.match(host.innerHTML,/changeSavedClassLessonDate\(0, this\)/);
run('changeSavedClassLessonDate(0,{value:"2026-10-20"}); renderClassLessonHistory(getData())');
assert.ok(host.innerHTML.indexOf('20/10/2026')<host.innerHTML.indexOf('05/10/2026'));
const before=clone(data);
run('changeSavedClassLessonDate(0,{value:""}); changeSavedClassLessonDate(0,{value:"2026-02-30"})');
assert.deepEqual(data,before);
assert.equal(run('validCalendarDate("2024-02-29")'),true);
assert.equal(run('classLessonDate({performed_at:"2026-10-10T12:00:00Z"})'),run('localCalendarDate(new Date("2026-10-10T12:00:00Z"))')); 
run('changeSavedClassLessonDate(1,{value:"2026-09-30"}); saveClassLesson()');
assert.equal(data.class_lessons[1].performed_date,'2026-09-30');
// Compile the complete app script as well as exercising the extracted functions.
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Function(match[1]);
console.log('ok: WOD dates, save/update, legacy data, validation, history ordering, app syntax');

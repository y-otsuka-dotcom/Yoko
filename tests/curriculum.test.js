import test from 'node:test';
import assert from 'node:assert/strict';
import {days, materials} from '../src/curriculum.js';
import {cleanProgress, nextDay, assessmentSummary} from '../src/progress.js';

test('30 consecutive lessons meet the learner’s 90-minute and expression limits',()=>{
  assert.deepEqual(days.map(d=>d.id),Array.from({length:30},(_,i)=>i+1));
  assert.deepEqual(days.filter(d=>d.assessment).map(d=>d.id),[1,10,20,30]);
  for(const d of days){
    assert.equal(d.schedule.reduce((sum,s)=>sum+s.minutes,0),90,`Day ${d.id}`);
    assert.ok(d.expressions.length<=3,`Day ${d.id} expressions`);
    assert.equal(d.questions.length,d.assessment?6:3);
    assert.ok(d.goal && d.focus);
    assert.ok(d.range.every(id=>materials.some(m=>m.id===id)));
    assert.ok(d.reviews.every(id=>id>0 && id<d.id));
    for(const q of d.questions){assert.ok(q.en && q.ja && q.answer && q.meaning);if(q.followup)assert.ok(q.followup.en && q.followup.ja && q.followup.answer && q.followup.meaning);}
  }
});

test('check-ins keep two common questions and vary the remaining questions',()=>{
  const assessments=days.filter(d=>d.assessment);
  for(const d of assessments)assert.deepEqual(d.questions.slice(0,2).map(q=>q.en),assessments[0].questions.slice(0,2).map(q=>q.en));
  for(let i=1;i<assessments.length;i++)assert.notDeepEqual(assessments[i].questions.slice(2).map(q=>q.en),assessments[i-1].questions.slice(2).map(q=>q.en));
});

test('corrupt or out-of-range saved records cannot become lesson state',()=>{
  assert.deepEqual(cleanProgress(null),{completed:[],notes:{},checks:{},conditions:{}});
  const p=cleanProgress({completed:[1,1,2,0,31,'3',2.5],notes:{1:'<script>text</script>',31:'bad',2:42},checks:{2:{0:{first:'yes'}},10:{8:{first:'yes'},0:{first:'unexpected',repeat:'yes',reply:'no',seconds:-1}}},conditions:{1:'通常速度',2:'bad'}});
  assert.deepEqual(p.completed,[1,2]);assert.deepEqual(p.notes,{'1':'<script>text</script>'});
  assert.deepEqual(p.checks,{'10':{'0':{first:'',repeat:'yes',reply:'no',seconds:null}}});
  assert.deepEqual(p.conditions,{'1':'通常速度'});
});

test('next lesson follows the first unfinished day, including nonsequential progress',()=>{
  assert.equal(nextDay({completed:[]}),1);
  assert.equal(nextDay({completed:[1,3,10]}),2);
  assert.equal(nextDay({completed:days.map(d=>d.id)}),30);
});

test('understanding and independent answers are measured separately',()=>{
  const s=assessmentSummary({0:{first:'yes',repeat:'unneeded',reply:'no',seconds:null},1:{first:'no',repeat:'yes',reply:'assisted',seconds:12},2:{first:'yes',repeat:'unneeded',reply:'yes',seconds:4}});
  assert.equal(s.first,2);assert.equal(s.repeat,1);assert.equal(s.reply,1);assert.equal(s.understoodNoReply,1);assert.deepEqual(s.times,[12,4]);
});

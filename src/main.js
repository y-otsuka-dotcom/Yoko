import './style.css';
import { days, weeks, materials, materialUrl } from './curriculum.js';
import { STORAGE_KEY, cleanProgress, nextDay, assessmentSummary } from './progress.js';

const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  chart:'<path d="M4 4v16h16M8 15v-4m5 4V7m5 8V4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  external:'<path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  play:'<path d="m9 5 11 7-11 7Z"/>',
  sound:'<path d="m11 5-6 4H2v6h3l6 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  leaf:'<path d="M20 3C9 2 3 8 5 15s13 5 15-12ZM5 20 16 8"/>',
  chat:'<path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z"/><path d="M8 10h8m-8 4h5"/>',
  shuffle:'<path d="M3 5h3c4 0 8 14 12 14h3m-4-4 4 4-4 3M3 19h3c4 0 8-14 12-14h3m-4-3 4 3-4 4"/>',
  pen:'<path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5"/>',
  down:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = id => String(id).padStart(2,'0');
const app = document.querySelector('#app');
let storage, progress, storageError = false;
try { storage=window.localStorage; progress=cleanProgress(JSON.parse(storage.getItem(STORAGE_KEY) || '{}')); }
catch { progress=cleanProgress({}); storageError=true; }
let week = 0;
let order = {};
let utterance;
let speakVersion=0;
let noticeTimer;
function notice(message) {
  const box=document.querySelector('#notice');
  box.textContent=message; box.classList.add('visible'); clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>box.classList.remove('visible'),7000);
}
function persist() {
  try { if (!storage) throw Error('No storage'); storage.setItem(STORAGE_KEY,JSON.stringify(progress)); return true; }
  catch { storageError=true; notice('このブラウザでは記録を保存できません。「記録をダウンロード」で手元に残してください。'); return false; }
}
function route() {
  const hash=location.hash.slice(1);
  if(!hash || hash==='main' || hash==='plan')return {page:'plan'};
  if(hash==='materials' || hash==='records')return {page:hash};
  const match=hash.match(/^day\/(\d+)$/);
  if(match && Number(match[1])>=1 && Number(match[1])<=30)return {page:'day',day:days[Number(match[1])-1]};
  return {page:'missing'};
}
function shell(content, active) {
  const count=progress.completed.length;
  return `<aside class="sidebar">
    <a class="brand" href="#plan" aria-label="Yoko 学習プラン"><span class="brand-mark">Y</span><span>Yoko<span class="brand-period">.</span></span></a>
    <div class="sidebar-sub">YOUR ENGLISH JOURNEY</div>
    <nav class="navigation" aria-label="メインメニュー">
      ${[['plan','grid','学習プラン'],['materials','book','教材・進め方'],['records','chart','学習の記録']].map(([link,i,label])=>`<a href="#${link}" ${active===link?'aria-current="page"':''}>${icon(i)}<span>${label}</span>${active===link?'<span class="nav-dot"></span>':''}</a>`).join('')}
    </nav>
    <div class="sidebar-bottom"><div class="small-sprout">${icon('leaf')}</div><p>一文ずつ、自分の言葉に。</p><span>30 DAYS · 90 MIN / DAY</span></div>
    <div class="sidebar-person"><span class="avatar">Y</span><div>ようこさん<span>My learning space</span></div></div>
  </aside>
  <div class="workspace"><header class="topbar"><span>${active==='plan'?'MY LEARNING PLAN':active==='materials'?'LEARNING GUIDE':'MY PROGRESS'}</span><div>${icon('leaf')}<span><strong>${count}</strong> / 30 日</span></div></header>
  <main id="main" tabindex="-1">${content}</main>
  <footer class="footer"><span class="footer-logo">Yoko.</span><span>記録はこのブラウザに保存されます。別の端末へは同期されません。</span><a href="#materials">使い方を見る ${icon('arrow')}</a></footer></div>`;
}
function dayCard(day) {
  const complete=progress.completed.includes(day.id), next=day.id===nextDay(progress)&&progress.completed.length<30;
  return `<a class="day-card ${complete?'is-complete':''} ${next?'is-next':''}" href="#day/${day.id}" data-day-card="${day.id}">
    <div class="card-top"><span class="day-index">DAY <strong>${pad(day.id)}</strong></span><span class="card-status ${day.assessment?'assessment':''}">${complete?`${icon('check')} 完了`:next?'次のレッスン':day.assessment?'振り返りの日':day.topic==='復習'?'復習の日':''}</span></div>
    <span class="topic-label">${esc(day.topic)}</span><h3>${esc(day.title)}</h3>
    <div class="card-bottom"><span>${icon('clock')} 90分 <i></i>${day.questions.length}つの質問</span><span class="card-arrow">${icon(complete?'check':'arrow')}</span></div>
  </a>`;
}
function planPage() {
  const count=progress.completed.length, next=days[nextDay(progress)-1], percent=Math.round(count/30*100);
  return `<div class="page-heading"><div><p class="eyebrow">30-DAY ENGLISH PLAN</p><h1>毎日の英語に、小さな一歩を。</h1><p>ようこさんのペースで、聞いて、返して、会話をつなぐ30日間。</p></div><span class="course-pill">${icon('book')} 1日90分の学習プラン</span></div>
  <section class="hero-grid" aria-label="学習の進み具合">
    <div class="hero"><div class="hero-copy"><span class="hero-label"><span></span>${count===30?'YOUR NEXT CHAPTER':'A LITTLE PRACTICE, EVERY DAY'}</span><h2>${count===30?'30日間の、その先へ。':'今日の一歩が、<br>明日の会話になる。'}</h2><p>${count===30?'積み重ねた言葉を、これからの会話へ。<br>記録を振り返り、次の一歩を見つけましょう。':'短い一文で、大丈夫。<br>聞いて分かる、言って伝わる。その実感を少しずつ。'}</p><a class="button primary" href="${count===30?'#records':`#day/${next.id}`}">${count===30?'30日間を振り返る':`Day ${pad(next.id)} をはじめる`}${icon('arrow')}</a><span class="hero-foot">${count===30?'自分の言葉で、また一歩。':`${esc(next.topic)} · ${next.questions.length}つの質問から`}</span></div>
    <div class="hero-art" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><div class="art-sun">✳</div><div class="art-bubble bubble-one">Hello!</div><div class="art-bubble bubble-two">How about you?</div><div class="art-book"><span>ONE DAY,<br>ONE STEP.</span><div class="book-rule"></div><span class="book-number">30<span>days</span></span><span class="book-leaf">${icon('leaf')}</span></div><span class="art-star">✦</span></div></div>
    <div class="progress-card"><div class="section-mini">あなたの積み重ね ${icon('leaf')}</div><div class="progress-number"><strong>${count}</strong><span>/ 30 日</span><span class="progress-percent">${percent}%</span></div><div class="progress-track" role="progressbar" aria-label="30日間の達成率" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${count}"><span style="width:${percent}%"></span></div><div class="day-dots" aria-label="各日の完了状態">${days.map(d=>`<a href="#day/${d.id}" class="${progress.completed.includes(d.id)?'done':''}" aria-label="Day ${d.id}${progress.completed.includes(d.id)?' 完了':''}">${progress.completed.includes(d.id)?icon('check'):d.id}</a>`).join('')}</div><p>${count===0?'まずはDay 01から。<br>できた日を、一つずつ増やしましょう。':count===30?'30日分の学習を完了しました。<br>気になるレッスンは、何度でも。':`あと${30-count}日。<br>少し前の言葉も、ときどき思い出して。`}</p></div>
  </section>
  <section class="curriculum" aria-labelledby="plan-title"><div class="section-heading"><div><span class="eyebrow">YOUR CURRICULUM</span><h2 id="plan-title">30日間の学習メニュー</h2></div><span class="section-hint">気になる日から、いつでも開けます</span></div>
  <div class="week-tabs" role="group" aria-label="週で絞り込む">${weeks.map((label,i)=>`<button type="button" class="week-tab ${week===i?'selected':''}" data-week="${i}" aria-pressed="${week===i}">${i===0?'すべての30日':`Week ${i}`}<span>${i===0?'YOUR PLAN':`${pad((i-1)*7+1)} — ${pad(Math.min(i*7,30))}`}</span></button>`).join('')}</div>
  <div class="filter-caption"><span>${week?esc(weeks[week]):'聞く → 理解する → 一文で返す → もう一文、または質問'}</span><span>${week?days.filter(d=>d.week===week).length:30} LESSONS</span></div>
  <div class="day-grid">${days.filter(d=>!week||d.week===week).map(dayCard).join('')}</div></section>
  <div class="gentle-note">${icon('chat')}<div><strong>聞き返すことも、会話の一歩。</strong><p>すぐに答えが出なくても大丈夫。意味を確かめてから、短い一文で返しましょう。</p></div><a href="#materials">学習の進め方 ${icon('arrow')}</a></div>`;
}
function materialBlock(day) {
  return `<section class="panel material-panel"><div class="section-heading compact"><h2>${icon('book')} 今日の教材</h2><span class="pill">教材 A ＋ B</span></div><div class="resource-title"><div><span class="eyebrow">BRITISH COUNCIL · WHAT TO SAY</span><h3>Checking understanding</h3><p>理解の確認・聞き返しの練習</p></div><a class="button outline small" href="${materialUrl}" target="_blank" rel="noopener noreferrer">公式教材を開く ${icon('external')}</a></div><div class="range-list">${day.range.map(id=>{const m=materials[id-1];return `<div><span class="range-number">${id}</span><div><strong>${esc(m.name)}</strong><p>${esc(m.start)}から、${esc(m.end)}。</p><p class="english">${esc(m.phrase)}</p><p>${esc(m.meaning)}</p></div></div>`;}).join('')}</div><p class="small-note">動画全体を覚える必要はありません。Transcript（英文スクリプト）のセリフを目印に、指定の場面を使います。教材Bは、このページのオリジナル練習問題です。</p></section>`;
}
const select = (label, field, day, index, options, value) => `<label>${label}<select data-check="${field}" data-day="${day}" data-index="${index}">${options.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
function checkInputs(day,index) {
  const row=progress.checks[day.id]?.[index] || {};
  return `<fieldset class="check-fields"><legend>この質問の記録</legend>${select('最初の音声で意味が分かった','first',day.id,index,[['','選んでください'],['yes','○ 分かった'],['partial','△ 確かめたかった'],['no','× 分からなかった']],row.first||'')}${select('聞き返したあとに分かった','repeat',day.id,index,[['','選んでください'],['unneeded','聞き返しは不要だった'],['yes','○ 分かった'],['no','× 分からなかった']],row.repeat||'')}${select('質問に合う英語の返答','reply',day.id,index,[['','選んでください'],['yes','○ 自力で返せた'],['assisted','△ ヒントがあれば返せた'],['no','× 返答が出なかった']],row.reply||'')}<label>答え始めるまでの秒数（任意）<input type="number" inputmode="decimal" min="0" max="600" step="0.1" data-check="seconds" data-day="${day.id}" data-index="${index}" value="${row.seconds??''}" placeholder="例：8 ／不明なら空欄" /></label></fieldset>`;
}
function practiceQuestion(item,day,index,followup=false) {
  const prefix=followup?'追加質問':`QUESTION ${pad(index+1)}`;
  return `<${followup?'div':'article'} class="${followup?'followup':'question-card'}" ${followup?'':`data-question="${index}"`}><div class="question-top"><span class="eyebrow">${prefix}</span><button type="button" class="button audio-button" data-speak="${index}" data-followup="${followup}" data-kind="question">${icon('sound')} ${followup?'追加質問を聞く':'質問を聞く'}</button></div><details class="reveal"><summary>英文・意味を確認する</summary><div class="revealed"><p class="english question-english">${esc(item.en)}</p><p>${esc(item.ja)}</p></div></details><details class="reveal answer"><summary>返答の例を見る</summary><div class="revealed"><p class="english">${esc(item.answer)}</p><p>${esc(item.meaning)}</p><button class="text-button" type="button" data-speak="${index}" data-followup="${followup}" data-kind="answer">${icon('sound')} 返答例を聞く</button></div></details>${item.followup?practiceQuestion(item.followup,day,index,true):''}${day.assessment&&!followup?checkInputs(day,index):''}</${followup?'div':'article'}>`;
}
function lessonPage(day) {
  const complete=progress.completed.includes(day.id);
  const indices=order[day.id] || day.questions.map((_,i)=>i);
  return `<a class="back-link" href="#plan">${icon('back')} 学習プランに戻る</a><div class="lesson-heading"><div class="eyebrow">DAY ${pad(day.id)} <span class="pill ${day.assessment?'warm':''}">${day.assessment?'振り返りの日':day.topic}</span></div><h1>${esc(day.title)}</h1><p>${esc(day.focus)}</p><div class="lesson-meta"><span>${icon('clock')} 90分</span><span>${icon('chat')} ${day.questions.length}つの質問</span><span>${icon('book')} 教材 A${day.range.join('・')} ＋ B</span>${complete?`<span class="done-label">${icon('check')} 学習済み</span>`:''}</div></div>
  <div class="goal-banner">${icon('leaf')}<div><span class="eyebrow">TODAY’S SMALL GOAL</span><p>${esc(day.goal)}</p></div></div>
  <div class="lesson-layout"><div class="lesson-main">
    ${materialBlock(day)}
    <section class="panel"><div class="section-heading compact"><h2>${icon('pen')} 今日の進め方</h2><span class="pill">合計90分</span></div><ol class="timeline">${day.schedule.map((step,i)=>`<li><span class="step-number">${i+1}</span><div><div class="step-title"><h3>${esc(step.title)}</h3><span>${step.minutes}<small>分</small></span></div><p>${esc(step.body)}</p></div></li>`).join('')}</ol></section>
    <section class="panel"><div class="section-heading compact"><h2>${icon('chat')} ${day.expressions.length?'今日、使う型':'覚えた表現を、もう一度'}</h2><span class="pill">${day.expressions.length?`${day.expressions.length}つだけ`:'新しい型は増やしません'}</span></div>${day.expressions.length?`<div class="expression-list">${day.expressions.map((item,i)=>`<div><span>${pad(i+1)}</span><div><p class="english">${esc(item.en)}</p><p>${esc(item.ja)}</p></div></div>`).join('')}</div>`:'<p>これまでの表現を、意味を手掛かりに取り出します。質問の順番や一部の言葉を変えて練習しましょう。</p>'}</section>
    <section class="practice-section" aria-labelledby="practice-title"><div class="section-heading"><div><span class="eyebrow">LISTEN & RESPOND</span><h2 id="practice-title">聞いて、一文で返してみる</h2></div><button class="text-button" type="button" data-action="shuffle">${icon('shuffle')} 順番を変える</button></div><p class="practice-intro">まずは英文を見ずに聞き、声に出して答えましょう。${day.assessment?'答えの例は、確認が終わってから開いてください。':'答えの内容は例です。ご自身の実際の状況や好みに置き換えます。'}</p>
    <div class="audio-controls"><label>音声の速さ <select id="speech-rate"><option value="1">通常</option><option value="0.8">ゆっくり</option></select></label><button class="text-button" type="button" data-action="stop-audio">音声を止める</button><span>端末の英語の合成音声を使います</span></div>
    <details class="audio-help"><summary>音声が出ないとき</summary><p>音量をご確認ください。英語の音声が使えない端末では「英文・意味を確認する」を開き、英語の質問だけを <a href="https://translate.google.com/?sl=en&tl=ja&op=translate" target="_blank" rel="noopener noreferrer">Google翻訳 ${icon('external')}</a> にコピーして、英文側のスピーカーで再生できます。</p></details>
    ${day.assessment?`<div class="assessment-intro"><strong>「分かった」と「返せた」を分けて記録</strong><p>質問を聞く→英語で返す→何を聞かれたか日本語で確かめる、の順です。質問の終わりから内容のある返答までの時間を記録します。正確な計測が難しいときは秒数を空欄にし、振り返りに目安を書いてください。</p><label>確認の条件（速度・英文を先に見たか・使った助け）<input type="text" maxlength="500" data-condition="${day.id}" value="${esc(progress.conditions[day.id]||'')}" placeholder="例：通常速度／英文は見ずに確認" /></label></div>`:''}
    <div class="questions">${indices.map(i=>practiceQuestion(day.questions[i],day,i)).join('')}</div>
    ${day.variant?`<div class="variant-card"><div><span class="eyebrow">ONE MORE TRY</span><h3>少し言い方を変えて</h3><p>いつもの質問との意味のつながりを確かめてみましょう。</p></div><button type="button" class="button outline" data-action="speak-variant">${icon('sound')} 入れ替え問題を聞く</button><details class="reveal"><summary>英文・意味を確認する</summary><p class="english">${esc(day.variant.en)}</p><p>${esc(day.variant.ja)}</p></details></div>`:''}</section>
    <section class="panel reflection"><div class="section-heading compact"><h2>${icon('pen')} 今日のひとこと</h2><span id="save-status" class="save-status" role="status">${storageError?'保存できません':'このブラウザに保存'}</span></div><label for="day-note">言えた一文・聞き返して分かったこと・次に使いたい表現</label><textarea id="day-note" data-note="${day.id}" maxlength="5000" rows="5" placeholder="例：I like walking. が、例を見ずに言えた。">${esc(progress.notes[day.id]||'')}</textarea><p class="small-note">記録はこのブラウザだけに保存され、コーチには自動送信されません。</p><button type="button" class="text-button" data-action="copy-day">今日の記録をコピー ${icon('arrow')}</button></section>
    <div class="completion-panel"><div><span class="eyebrow">ONE STEP FORWARD</span><h2>${complete?'今日の一歩を記録しました。':'今日の一歩を、残しましょう。'}</h2><p>すべて完璧でなくても、取り組めたことを積み重ねて。</p></div><button type="button" class="button ${complete?'outline':'primary'}" data-action="complete" aria-pressed="${complete}">${icon('check')} ${complete?'完了を取り消す':'今日の学習を完了する'}</button></div>
    <nav class="lesson-pagination" aria-label="日を移動">${day.id>1?`<a href="#day/${day.id-1}">${icon('back')} Day ${pad(day.id-1)}</a>`:'<span></span>'}${day.id<30?`<a href="#day/${day.id+1}">Day ${pad(day.id+1)} へ ${icon('arrow')}</a>`:'<a href="#records">30日間の記録へ '+icon('arrow')+'</a>'}</nav>
  </div><aside class="lesson-aside"><div class="aside-card"><span class="eyebrow">TODAY’S ROUTE</span><h3>90分の小さな積み重ね</h3><ul>${day.schedule.map(s=>`<li><span>${esc(s.title)}</span><strong>${s.minutes}分</strong></li>`).join('')}</ul></div><div class="aside-card review-card"><span class="eyebrow">LOOK BACK</span><h3>${day.reviews.length?'少し前の言葉を思い出す':'今日は、ここが出発点'}</h3><p>${day.reviews.length?'この日から合計3問を選び、例を見ずに返してみましょう。':'初日の返し方を記録し、10・20・30日目に変化を確かめます。'}</p><div class="review-links">${day.reviews.map(id=>`<a href="#day/${id}">Day ${pad(id)} ${icon('arrow')}</a>`).join('')}</div></div><a href="#materials" class="aside-link">難しい日・簡単な日の進め方 ${icon('arrow')}</a></aside></div>`;
}
function materialsPage() {
  return `<div class="page-heading"><div><p class="eyebrow">A GUIDE FOR YOUR JOURNEY</p><h1>一文ずつ、会話につなげる。</h1><p>意味をつかんでから、声に出す。毎日の学習の道しるべです。</p></div></div><div class="learning-flow">${['聞く','意味をつかむ','主語と動詞を決める','一文で返す','もう一文・質問'].map((x,i)=>`<span><small>0${i+1}</small>${x}</span>${i<4?icon('arrow'):''}`).join('')}</div>
  <section class="panel"><span class="eyebrow">YOUR MATERIAL</span><div class="section-heading"><h2>動画は、短い場面を繰り返し。</h2><a class="button outline small" href="${materialUrl}" target="_blank" rel="noopener noreferrer">公式教材を開く ${icon('external')}</a></div><p><strong>British Council · Checking understanding</strong>（理解の確認）。各日の指定場面を、Transcriptのセリフを目印に使います。</p><div class="materials-grid">${materials.map(m=>`<article><span class="range-number">${m.id}</span><h3>${esc(m.name)}</h3><p>${esc(m.start)}から、${esc(m.end)}。</p><p class="english">${esc(m.phrase)}</p><p>${esc(m.meaning)}</p><p>${esc(m.point)}</p><div class="material-days">使用日：${days.filter(d=>d.range.includes(m.id)).map(d=>`<a href="#day/${d.id}">${pad(d.id)}</a>`).join(' ')}</div></article>`).join('')}</div><p class="small-note">道具の語彙：hammer＝金づち、spanner＝スパナ、toolbox＝道具箱、scissors＝はさみ。今回は暗記より会話の意図を優先します。動画の英文と、各日のオリジナル問題は区別しています。</p><details class="source-note"><summary>教材の出典・確認状況</summary><p>教材の範囲は、共有されたBritish Council公式教材のTranscriptに基づきます。制作者による動画の直接再生、現在の登録・課金条件の確認は未実施です。提供条件や再生可否は公式ページでご確認ください。タイムスタンプは指定していません。会話中は「Could you repeat …」、最後の復唱パートは「Can you repeat …」となっています。</p></details></section>
  <section class="panel"><div class="section-heading compact"><h2>いつもの90分</h2><span class="pill">1・10・20・30日目は各日の確認メニューへ</span></div><ol class="timeline">${days[1].schedule.map((s,i)=>`<li><span class="step-number">${i+1}</span><div><div class="step-title"><h3>${esc(s.title)}</h3><span>${s.minutes}<small>分</small></span></div><p>${esc(s.body)}</p></div></li>`).join('')}</ol></section>
  <div class="guide-grid"><section class="panel"><span class="eyebrow">WHEN IT FEELS HARD</span><h2>難しい日は、二問で。</h2><p>90分の配分は変えず、質問を3問から2問に減らします。聞く時間は「意味確認→英文→区切って聞く→英文を閉じる」の順に。一文を取り出す練習に戻り、最後に順番を変えます。</p><p>意味が分からないときは聞く練習へ。意味は分かるけれど答えが出ないときは「I＋動詞」の一文へ戻りましょう。</p></section><section class="panel"><span class="eyebrow">WHEN IT FEELS EASY</span><h2>変えるのは、一つだけ。</h2><p>質問の順番、今日と昨日などの時、趣味の語、一つの追加質問。このうち一つだけ変えましょう。</p><p>新しい表現は一日最大3つ。台本を見ずに、短い二文や尋ね返しにつなげます。</p></section></div>
  <section class="panel"><span class="eyebrow">CHECK IN, NOT A TEST</span><h2>1・10・20・30日目の確認</h2><p>最初の2問は共通、残り4問は身近な話題のまま少し言い方や内容を変えています。最初に意味が分かったか、聞き返して分かったか、意味は分かったが返答が出なかったか、自力で返せたかを分けて記録します。</p><p>音声・速度・記録方法を毎回そろえます。英文や答えを先に見た場合、コーチのヒントがあった場合も条件に記録してください。これは標準化されたレベル判定テストではありません。</p><h3>30日後の、小さな目安</h3><ul class="plain-list"><li>身近な6問のうち4問程度は、最初の音声で意味をつかむ。</li><li>聞き返しで分かる質問を増やし、4問程度に自分の状況に合う短い返答をする。</li><li>2問程度ではもう一文か質問を加え、返答を始める時間を初日より短く、または安定させる。</li></ul><p class="small-note">この計画用の仮の目安です。初日の結果に合わせて調整してください。すでにできている場合は、速さよりも質問の変化への対応を目標にします。</p></section>
  <section class="panel"><h2>記録の使い方</h2><p>完了した日、振り返り、確認日の記録はこのブラウザに保存します。別の端末への同期や、コーチへの自動送信はありません。ブラウザのデータを消すと記録も消えるため、必要に応じて「学習の記録」からダウンロードしてください。</p><p>コーチへ伝えたい場合は、各日の「今日の記録をコピー」を押し、ご自身でLINEなどに貼り付けて送れます。例文の勤務時間や好み、地域はご自身の実際のものに置き換えて使ってください。</p></section>`;
}
function recordsPage() {
  const count=progress.completed.length;
  const recorded=days.filter(d=>progress.completed.includes(d.id)||progress.notes[d.id]||Object.keys(progress.checks[d.id]||{}).length||progress.conditions[d.id]);
  return `<div class="page-heading"><div><p class="eyebrow">YOUR SMALL WINS</p><h1>積み重ねを、振り返る。</h1><p>できたことも、次に試したいことも。あなたの30日間の記録です。</p></div><button class="button outline" type="button" data-action="download">${icon('down')} 記録をダウンロード</button></div><div class="record-stats"><div><span>完了したレッスン</span><strong>${count}<small> / 30 日</small></strong></div><div><span>達成率</span><strong>${Math.round(count/30*100)}<small> %</small></strong></div><div><span>次の一歩</span><strong>${count===30?'振り返り':`Day ${pad(nextDay(progress))}`}</strong></div></div>
  <section class="panel"><div class="section-heading compact"><h2>確認日の変化</h2><span class="pill">各6問・未記録は「—」</span></div><div class="table-scroll"><table class="assessment-table"><caption class="sr-only">確認日ごとの意味理解と返答の記録</caption><thead><tr><th>確認日</th><th>初回に理解</th><th>聞き返して理解</th><th>自力で返答</th><th>理解したが返答なし</th></tr></thead><tbody>${[1,10,20,30].map(id=>{const rows=progress.checks[id]||{},s=assessmentSummary(rows);const n=(key,value)=>Object.values(rows).some(r=>r[key])?`${value} / 6`:'—';return `<tr><th><a href="#day/${id}">Day ${pad(id)}</a></th><td>${n('first',s.first)}</td><td>${n('repeat',s.repeat)}</td><td>${n('reply',s.reply)}</td><td>${Object.values(rows).some(r=>r.reply&&(r.first||r.repeat))?s.understoodNoReply:'—'}</td></tr>`;}).join('')}</tbody></table></div><p class="small-note">未回答の項目は正答・誤答として扱いません。質問ごとの秒数と条件は、各確認日で見直せます。</p></section>
  <section><div class="section-heading"><h2>日々の記録</h2><span>${recorded.length}日分</span></div>${recorded.length?`<div class="record-list">${recorded.map(d=>`<article class="panel record-entry"><div class="record-entry-heading"><span class="day-index">DAY <strong>${pad(d.id)}</strong></span>${progress.completed.includes(d.id)?`<span class="done-label">${icon('check')} 完了</span>`:'<span class="pill">学習中</span>'}<a href="#day/${d.id}">${esc(d.title)} ${icon('arrow')}</a></div>${progress.notes[d.id]?`<p class="note-text">${esc(progress.notes[d.id])}</p>`:'<p class="small-note">振り返りは、あとからでも書き足せます。</p>'}</article>`).join('')}</div>`:`<div class="empty-state">${icon('leaf')}<h3>最初の一歩から、記録がはじまります。</h3><p>学習を終えたら、その日のページで完了を記録しましょう。</p><a class="button primary" href="#day/1">Day 01 をはじめる ${icon('arrow')}</a></div>`}</section>`;
}
function render() {
  const r=route();
  const content=r.page==='plan'?planPage():r.page==='day'?lessonPage(r.day):r.page==='materials'?materialsPage():r.page==='records'?recordsPage():`<div class="empty-state"><h1>このページは見つかりませんでした。</h1><a class="button primary" href="#plan">学習プランに戻る</a></div>`;
  app.innerHTML=shell(content,r.page==='day'||r.page==='missing'?'plan':r.page);
  document.title=r.page==='day'?`Day ${pad(r.day.id)} ${r.day.title} — Yoko`:r.page==='records'?'学習の記録 — Yoko':r.page==='materials'?'教材・進め方 — Yoko':'Yoko — 30日間の英語学習';
}
function stopAudio() {
  speakVersion++;
  if(window.speechSynthesis?.cancel)window.speechSynthesis.cancel();
  document.querySelectorAll('.is-speaking').forEach(b=>{b.classList.remove('is-speaking');b.removeAttribute('aria-busy');});
  utterance=null;
}
function speak(text, button) {
  stopAudio();
  if(!window.speechSynthesis || typeof window.SpeechSynthesisUtterance!=='function'){notice('この端末は読み上げに対応していません。「音声が出ないとき」の方法をご利用ください。');return;}
  const token=speakVersion;
  utterance=new SpeechSynthesisUtterance(text.replaceAll('’',"'"));
  utterance.lang='en-US';
  utterance.rate=Number(document.querySelector('#speech-rate')?.value||1);
  const voices=window.speechSynthesis.getVoices();
  const voice=voices.find(v=>/^en[-_]US/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
  if(voice)utterance.voice=voice;
  utterance.onstart=()=>{if(token!==speakVersion)return;button.classList.add('is-speaking');button.setAttribute('aria-busy','true');};
  utterance.onend=()=>{if(token!==speakVersion)return;button.classList.remove('is-speaking');button.removeAttribute('aria-busy');};
  utterance.onerror=event=>{if(token!==speakVersion)return;button.classList.remove('is-speaking');button.removeAttribute('aria-busy');if(!['canceled','interrupted'].includes(event.error))notice('音声を再生できませんでした。「音声が出ないとき」を開き、別の再生方法をご利用ください。');};
  try{window.speechSynthesis.speak(utterance);}catch{notice('音声を再生できませんでした。「音声が出ないとき」をご確認ください。');}
}
function recordText(day) {
  const lines=[`Day ${pad(day.id)}｜${day.title}`,`学習：${progress.completed.includes(day.id)?'完了':'未完了'}`,`今日の記録：${progress.notes[day.id]||'未記入'}`];
  if(day.assessment){lines.push(`確認の条件：${progress.conditions[day.id]||'未記入'}`);day.questions.forEach((item,i)=>{const r=progress.checks[day.id]?.[i]||{};const labels={'':'未記録',yes:'○',partial:'△',no:'×',unneeded:'不要',assisted:'ヒントあり'};lines.push(`Q${i+1} ${item.en}（${item.ja}）｜初回理解:${labels[r.first||'']}｜聞き返し後:${labels[r.repeat||'']}｜返答:${labels[r.reply||'']}｜開始:${r.seconds===null||r.seconds===undefined?'不明':r.seconds+'秒'}`);});}
  return lines.join('\n');
}
function download() {
  const text=['Yoko｜30日間の学習記録',`完了：${progress.completed.length} / 30日`,...days.filter(d=>progress.completed.includes(d.id)||progress.notes[d.id]||progress.checks[d.id]||progress.conditions[d.id]).map(recordText)].join('\n\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='yoko-learning-records.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
app.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  const r=route();
  if(button.dataset.week!==undefined){week=Number(button.dataset.week);render();document.querySelector(`[data-week="${week}"]`)?.focus({preventScroll:true});return;}
  if(button.dataset.speak!==undefined && r.day){const index=Number(button.dataset.speak);let item=r.day.questions[index];if(button.dataset.followup==='true')item=item.followup;speak(button.dataset.kind==='answer'?item.answer:item.en,button);return;}
  switch(button.dataset.action){
    case 'complete': {const id=r.day.id;progress.completed=progress.completed.includes(id)?progress.completed.filter(x=>x!==id):[...progress.completed,id].sort((a,b)=>a-b);const ok=persist();render();document.querySelector('[data-action="complete"]')?.focus({preventScroll:true});if(ok)notice(progress.completed.includes(id)?`Day ${pad(id)} の学習を記録しました。`:'完了を取り消しました。');break;}
    case 'shuffle': {stopAudio();const indices=[...(order[r.day.id]||r.day.questions.map((_,i)=>i))];for(let i=indices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}const previous=order[r.day.id]||r.day.questions.map((_,i)=>i);if(indices.every((v,i)=>v===previous[i]))indices.push(indices.shift());order[r.day.id]=indices;const rate=document.querySelector('#speech-rate').value;document.querySelector('.questions').innerHTML=indices.map(i=>practiceQuestion(r.day.questions[i],r.day,i)).join('');document.querySelector('#speech-rate').value=rate;notice('質問の順番を変えました。記録はそれぞれの質問に残っています。');break;}
    case 'speak-variant': speak(r.day.variant.en,button);break;
    case 'stop-audio': stopAudio();break;
    case 'download': download();break;
    case 'copy-day': try{await navigator.clipboard.writeText(recordText(r.day));notice('今日の記録をコピーしました。LINEなどに貼り付けて使えます。');}catch{notice('コピーできませんでした。「学習の記録」からダウンロードできます。');}break;
  }
});
app.addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.note){progress.notes[el.dataset.note]=el.value.slice(0,5000);const ok=persist();const status=document.querySelector('#save-status');if(status)status.textContent=ok?'保存しました':'保存できません';}
  if(el.dataset.condition){progress.conditions[el.dataset.condition]=el.value.slice(0,500);persist();}
  if(el.dataset.check){const {day,index,check}=el.dataset;progress.checks[day]??={};progress.checks[day][index]??={first:'',repeat:'',reply:'',seconds:null};progress.checks[day][index][check]=check==='seconds'?(el.value===''?null:Math.min(600,Math.max(0,Number(el.value)))):el.value;persist();}
});
window.addEventListener('hashchange',()=>{stopAudio();render();window.scrollTo(0,0);document.querySelector('#main')?.focus({preventScroll:true});});
window.addEventListener('pagehide',stopAudio);
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('#main')?.focus();});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY)return;try{progress=cleanProgress(JSON.parse(event.newValue||'{}'));render();}catch{/* Preserve the current visible record if another tab writes invalid data. */}});
render();
if(storageError)notice('記録の保存領域を読み込めませんでした。学習は続けられますが、記録はダウンロードして残してください。');

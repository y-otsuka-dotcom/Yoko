import {test,expect} from '@playwright/test';

test('small phone layouts do not create a horizontal page scroll',async({page})=>{
  await page.setViewportSize({width:320,height:800});
  for(const route of ['plan','day/1','day/26','materials','records']){
    await page.goto(`./#${route}`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),route).toBeTruthy();
  }
});

test('all 30 days, week filters and lesson deep links work under the Pages path',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading',{name:'毎日の英語に、小さな一歩を。'})).toBeVisible();
  await expect(page.locator('[data-day-card]')).toHaveCount(30);
  await page.getByRole('button',{name:/Week 5/}).click();
  await expect(page.locator('[data-day-card]')).toHaveCount(2);
  await page.locator('[data-day-card="30"]').click();
  await expect(page.getByRole('heading',{name:'30日間の、その先へ',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator('.question-card')).toHaveCount(6);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('completion and a reflection survive reload without treating text as HTML',async({page})=>{
  await page.goto('./#day/2');
  const note='<img src=x onerror="window.injected=true"> 自分の一文';
  await page.getByLabel('言えた一文・聞き返して分かったこと・次に使いたい表現').fill(note);
  await page.getByRole('button',{name:'今日の学習を完了する'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'完了を取り消す'})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#day-note')).toHaveValue(note);
  await page.getByRole('link',{name:'学習の記録',exact:true}).click();
  await expect(page.locator('.note-text')).toHaveText(note);
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
  await page.getByRole('link',{name:/あいさつを、一文で/}).click();
  await page.getByRole('button',{name:'完了を取り消す'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'今日の学習を完了する'})).toHaveAttribute('aria-pressed','false');
});

test('assessment answers stay attached to their question after shuffling',async({page})=>{
  await page.goto('./#day/10');
  const question=page.locator('[data-question="0"]');
  await question.getByLabel('最初の音声で意味が分かった').selectOption('yes');
  await question.getByLabel('聞き返したあとに分かった').selectOption('unneeded');
  await question.getByLabel('質問に合う英語の返答').selectOption('no');
  await question.getByLabel('答え始めるまでの秒数（任意）').fill('12');
  await page.getByRole('button',{name:'順番を変える'}).click();
  expect(await page.locator('.question-card').evaluateAll(cards=>cards.map(c=>c.dataset.question))).not.toEqual(['0','1','2','3','4','5']);
  await expect(page.locator('[data-question="0"]').getByLabel('最初の音声で意味が分かった')).toHaveValue('yes');
  await page.reload();
  await expect(page.locator('[data-question="0"]').getByLabel('答え始めるまでの秒数（任意）')).toHaveValue('12');
  await page.getByRole('link',{name:'学習の記録',exact:true}).click();
  const row=page.getByRole('row').filter({has:page.getByRole('link',{name:'Day 10',exact:true})});
  await expect(row).toContainText('1 / 6');
});

test('audio requests contain the English question and do not reveal its answer',async({page})=>{
  await page.addInitScript(()=>{
    window.spoken=[];
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
    Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return [{lang:'en-US',name:'Test voice'}];},speak(u){window.spoken.push({text:u.text,rate:u.rate});u.onstart?.();setTimeout(()=>u.onend?.(),1);}}});
  });
  await page.goto('./#day/2');
  await page.locator('#speech-rate').selectOption('0.8');
  await page.locator('.question-card').first().getByRole('button',{name:'質問を聞く',exact:true}).click();
  expect(await page.evaluate(()=>window.spoken)).toEqual([{text:'How are you today?',rate:0.8}]);
  await expect(page.locator('.question-card').first().locator('details[open]')).toHaveCount(0);
});

test('invalid storage, invalid routes and unavailable speech have usable fallbacks',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('yoko-learning-v1','invalid json');Object.defineProperty(window,'speechSynthesis',{value:undefined});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined});});
  await page.goto('./#day/99');
  await expect(page.getByRole('heading',{name:'このページは見つかりませんでした。'})).toBeVisible();
  await page.getByRole('link',{name:'学習プランに戻る',exact:true}).click();
  await page.getByRole('link',{name:'Day 01 をはじめる',exact:true}).click();
  await page.locator('.question-card').first().getByRole('button',{name:'質問を聞く',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:/読み上げに対応|再生できません/})).toBeVisible();
});

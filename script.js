// ── 検定カテゴリ（英検／漢検）ごとのレベル定義 ──
const EIKEN_LEVELS = [
  { id:'3', name:'英検3級', desc:'中学卒業レベル', icon:'📗', color:'#10B981', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)' },
  { id:'p2', name:'英検準2級', desc:'高校中級レベル', icon:'📘', color:'#3B82F6', bg:'rgba(59,130,246,0.15)', border:'rgba(59,130,246,0.3)' },
  { id:'2', name:'英検2級', desc:'高校卒業レベル', icon:'📙', color:'#F59E0B', bg:'rgba(245,158,11,0.15)', border:'rgba(245,158,11,0.3)', highlight:true },
  { id:'p1', name:'英検準1級', desc:'大学中級レベル', icon:'📕', color:'#EF4444', bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.3)' },
  { id:'1', name:'英検1級', desc:'大学上級・プロレベル', icon:'👑', color:'#A78BFA', bg:'rgba(167,139,250,0.15)', border:'rgba(167,139,250,0.3)' },
];

const KANKEN_LEVELS = [
  { id:'3', name:'漢検3級', desc:'中学卒業程度', icon:'📗', color:'#10B981', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)' },
  { id:'p2', name:'漢検準2級', desc:'高校在学程度', icon:'📘', color:'#3B82F6', bg:'rgba(59,130,246,0.15)', border:'rgba(59,130,246,0.3)' },
  { id:'2', name:'漢検2級', desc:'高校卒業・大学・一般程度', icon:'📙', color:'#F59E0B', bg:'rgba(245,158,11,0.15)', border:'rgba(245,158,11,0.3)', highlight:true },
  { id:'p1', name:'漢検準1級', desc:'大学・一般程度', icon:'📕', color:'#EF4444', bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.3)' },
  { id:'1', name:'漢検1級', desc:'大学・一般以上のプロレベル', icon:'👑', color:'#A78BFA', bg:'rgba(167,139,250,0.15)', border:'rgba(167,139,250,0.3)' },
];

// ── カテゴリ定義（タブ切り替え用） ──
const CATEGORIES = [
  { id:'eiken', label:'英検', tagline:'英語力を測る', icon:'🅰️', levels: EIKEN_LEVELS },
  { id:'kanken', label:'漢検', tagline:'漢字力を測る', icon:'漢', levels: KANKEN_LEVELS },
];
let currentCategory = 'eiken';
let pendingCategory = 'eiken';

// ── Google Analytics イベント送信用の安全なラッパー ──
// gtag未定義（広告ブロッカー・GA未設定時など）でもエラーにならないようガードする
function trackEvent(name, params = {}) {
  if (typeof gtag === 'function') {
    gtag('event', name, params);
  }
}

// ── 問題データは data.js で定義されている ──
// 英検: VOCAB_POOL（単語）/ GRAMMAR_TEMPLATES（文法）/ IDIOM_POOL（熟語）
// 漢検: KANJI_POOL（読み）/ WRITE_TEMPLATES（書き取り）/ YOJI_POOL（四字熟語）

const GRAMMAR_RATIO = { '3': 0.45, 'p2': 0.4, '2': 0.4, 'p1': 0.3, '1': 0.3 };

const EIKEN_VOCAB_PHRASINGS = [
  '"{w}" の意味は？',
  '次の英語に合う日本語を選べ：{w}',
  'What does "{w}" mean?',
  '"{w}" に最も近い意味は？',
];
const KANKEN_VOCAB_PHRASINGS = [
  '「{w}」の読み方は？',
  '次の漢字の正しい読みを選べ：{w}',
  '「{w}」の読みとして正しいものは？',
  '「{w}」はどう読む？',
];

// カテゴリごとのデータソース・出題タイプ名をまとめて切り替えるためのテーブル
const POOLS = {
  eiken: {
    vocabPool: () => VOCAB_POOL,
    grammarPool: () => GRAMMAR_TEMPLATES,
    idiomPool: () => IDIOM_POOL,
    vocabType: '単語',
    grammarType: '文法',
    idiomType: '熟語',
    phrasings: EIKEN_VOCAB_PHRASINGS,
    vocabExplain: (item) => `"${item.w}" は「${item.jp}」という意味です。`,
  },
  kanken: {
    vocabPool: () => KANJI_POOL,
    grammarPool: () => WRITE_TEMPLATES,
    idiomPool: () => YOJI_POOL,
    vocabType: '読み',
    grammarType: '書き取り',
    idiomType: '四字熟語',
    phrasings: KANKEN_VOCAB_PHRASINGS,
    vocabExplain: (item) => `「${item.w}」は「${item.jp}」と読みます。`,
  },
};

function pickN(arr, n) {
  const picked = [];
  let source = shuffle([...arr]);
  let i = 0;
  while (picked.length < n && arr.length > 0) {
    if (i >= source.length) { source = shuffle([...arr]); i = 0; }
    picked.push(source[i++]);
  }
  return picked;
}

function buildGrammarQuestions(category, levelId, n) {
  if (n <= 0) return [];
  const p = POOLS[category];
  const templates = p.grammarPool()[levelId] || [];
  const all = [];
  templates.forEach(t => t.variants.forEach(v => all.push({ t, v })));
  return pickN(all, n).map(({ t, v }) => {
    const options = shuffle([t.ans, ...t.distractors]);
    const ansIdx = options.indexOf(t.ans);
    return { type: p.grammarType, q: v.text, choices: options, ans: ansIdx, explain: t.explain, jp: v.jp };
  });
}

function buildVocabQuestions(category, levelId, n) {
  if (n <= 0) return [];
  const p = POOLS[category];
  const pool = p.vocabPool()[levelId] || [];
  return pickN(pool, n).map(item => {
    const phrasing = p.phrasings[Math.floor(Math.random() * p.phrasings.length)];
    const qText = phrasing.replace('{w}', item.w);
    const others = pool.filter(o => o.jp !== item.jp);
    const distractors = shuffle([...others]).slice(0, 3).map(o => o.jp);
    const options = shuffle([item.jp, ...distractors]);
    const ansIdx = options.indexOf(item.jp);
    return { type: p.vocabType, q: qText, choices: options, ans: ansIdx, explain: p.vocabExplain(item) };
  });
}

function buildIdiomQuestions(category, levelId, n) {
  const p = POOLS[category];
  const pool = p.idiomPool()[levelId] || [];
  if (n <= 0 || pool.length === 0) return [];
  return pickN(pool, n).map(item => ({
    type: p.idiomType, q: item.q, choices: [...item.choices], ans: item.ans, explain: item.explain,
  }));
}

function buildQuestionSet(category, levelId, count) {
  const grammarRatio = GRAMMAR_RATIO[levelId] ?? 0.4;
  const grammarCount = Math.min(count, Math.round(count * grammarRatio));
  const idiomPool = POOLS[category].idiomPool()[levelId] || [];
  let idiomCount = 0;
  if (idiomPool.length > 0) {
    idiomCount = Math.min(count - grammarCount, Math.max(1, Math.round((count - grammarCount) * 0.2)));
  }
  const vocabCount = count - grammarCount - idiomCount;

  const qs = [
    ...buildGrammarQuestions(category, levelId, grammarCount),
    ...buildVocabQuestions(category, levelId, vocabCount),
    ...buildIdiomQuestions(category, levelId, idiomCount),
  ];
  return shuffle(qs);
}

let currentLevel = null;
let currentLevelCategory = null;
let questions = [];
let currentIdx = 0;
let score = 0;
let answered = false;
let startTime = null;
let pendingLevelId = null;
let lastCount = 10;

const COUNT_OPTIONS = [
  { n: 5, desc: 'サクッと1分でチャレンジ' },
  { n: 10, desc: 'ちょうどいい2分チャレンジ', recommend: true },
  { n: 20, desc: 'じっくり本格チャレンジ' },
];

function buildCategoryTabs() {
  const wrap = document.getElementById('categoryTabs');
  if (!wrap) return;
  wrap.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-tab' + (cat.id === currentCategory ? ' active' : '');
    btn.innerHTML = `<span class="category-tab-icon">${cat.icon}</span><span>${cat.label}</span>`;
    btn.onclick = () => switchCategory(cat.id);
    wrap.appendChild(btn);
  });
}

function switchCategory(catId) {
  if (catId === currentCategory) return;
  currentCategory = catId;
  buildCategoryTabs();
  buildLevelGrid();
  trackEvent('switch_category', { category_id: catId });
}

function buildLevelGrid() {
  const grid = document.getElementById('levelGrid');
  grid.innerHTML = '';
  const cat = CATEGORIES.find(c => c.id === currentCategory);
  cat.levels.forEach(lv => {
    const div = document.createElement('div');
    div.className = 'level-btn' + (lv.highlight ? ' highlight' : '');
    div.style.cssText = lv.highlight ? `border-color: ${lv.border}; background: ${lv.bg};` : '';
    div.innerHTML = `
      <div class="level-left">
        <div class="level-icon" style="background:${lv.bg}">${lv.icon}</div>
        <div>
          <div class="level-name">${lv.name}</div>
        </div>
      </div>
      <div class="level-arrow"></div>`;
    div.onclick = () => openCountSelect(lv.id);
    grid.appendChild(div);
  });
}

function openCountSelect(levelId) {
  pendingLevelId = levelId;
  pendingCategory = currentCategory;
  const cat = CATEGORIES.find(c => c.id === currentCategory);
  const lv = cat.levels.find(l => l.id === levelId);
  document.getElementById('countSelectLevelName').textContent = lv.name;
  buildCountGrid();
  showScreen('countSelect');
  trackEvent('select_level', { category_id: currentCategory, level_id: levelId, level_name: lv.name });
}

function buildCountGrid() {
  const grid = document.getElementById('countGrid');
  grid.innerHTML = '';
  COUNT_OPTIONS.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'count-btn' + (opt.recommend ? ' recommend' : '');
    div.innerHTML = `
      <div class="count-left">
        <div class="count-num-row">
          <span class="count-num">${opt.n}問</span>
          ${opt.recommend ? '<span class="count-badge">おすすめ</span>' : ''}
        </div>
        <div class="count-desc">${opt.desc}</div>
      </div>
      <div class="count-arrow"></div>`;
    div.onclick = () => startQuiz(pendingLevelId, opt.n);
    grid.appendChild(div);
  });
}

function startQuiz(levelId, count = 10, category = pendingCategory) {
  const cat = CATEGORIES.find(c => c.id === category);
  currentLevel = cat.levels.find(l => l.id === levelId);
  currentLevelCategory = category;
  questions = buildQuestionSet(category, levelId, count);
  lastCount = count;
  currentIdx = 0; score = 0; answered = false;
  startTime = Date.now();
  showScreen('quiz');
  renderQuestion();
  trackEvent('start_quiz', { category_id: category, level_id: levelId, level_name: currentLevel.name, question_count: count });
}

function renderQuestion() {
  const q = questions[currentIdx];
  const total = questions.length;
  answered = false;

  document.getElementById('progressLabel').textContent = `${currentIdx+1} / ${total}`;
  document.getElementById('remainingBadge').textContent = `あと${total - currentIdx - 1}問`;
  document.getElementById('progressFill').style.width = `${((currentIdx+1)/total)*100}%`;

  const tag = document.getElementById('levelTag');
  tag.textContent = currentLevel.name;
  tag.style.cssText = `background:${currentLevel.bg}; border:1px solid ${currentLevel.border}; color:${currentLevel.color}; border-radius:20px; padding:4px 12px; font-size:11px; font-weight:600;`;

  document.getElementById('questionType').textContent = q.type + '問題';
  document.getElementById('questionText').textContent = q.q;

  const jpRow = document.getElementById('jpHintRow');
  const jpBtn = document.getElementById('jpHintBtn');
  const jpText = document.getElementById('jpHintText');
  if (q.jp) {
    jpRow.classList.remove('hidden');
    const hintLabel = currentLevelCategory === 'kanken' ? '💡 読み方を見る' : '🇯🇵 訳を見る';
    document.getElementById('jpHintBtnLabel').textContent = hintLabel;
    jpBtn.classList.remove('open');
    jpText.textContent = q.jp;
    jpText.classList.remove('show');
  } else {
    jpRow.classList.add('hidden');
  }

  const choicesEl = document.getElementById('choices');
  const letters = ['A','B','C','D'];
  choicesEl.innerHTML = '';
  q.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<div class="choice-label">${letters[i]}</div><div class="choice-text">${c}</div>`;
    btn.onclick = () => selectAnswer(i, btn);
    choicesEl.appendChild(btn);
  });

  const panel = document.getElementById('feedbackPanel');
  panel.classList.remove('show','correct','wrong');
}

function toggleJpHint() {
  const jpBtn = document.getElementById('jpHintBtn');
  const jpText = document.getElementById('jpHintText');
  const isOpen = jpText.classList.toggle('show');
  jpBtn.classList.toggle('open', isOpen);
  document.getElementById('jpHintBtnLabel').textContent = isOpen
    ? (currentLevelCategory === 'kanken' ? '💡 読み方を隠す' : '🇯🇵 訳を隠す')
    : (currentLevelCategory === 'kanken' ? '💡 読み方を見る' : '🇯🇵 訳を見る');
}

function selectAnswer(idx, btn) {
  if (answered) return;
  answered = true;
  const q = questions[currentIdx];
  const all = document.querySelectorAll('.choice-btn');
  all.forEach(b => b.classList.add('locked'));

  const panel = document.getElementById('feedbackPanel');

  if (idx === q.ans) {
    score++;
    btn.classList.add('correct');
    all.forEach((b, i) => { if (i !== idx) b.classList.add('dim'); });
    panel.classList.add('correct');
    document.getElementById('feedbackEmoji').textContent = randomCorrectEmoji();
    document.getElementById('feedbackTitle').textContent = '正解！ Great Job!';
    document.getElementById('feedbackExplain').textContent = q.explain;
    launchConfetti();
  } else {
    btn.classList.add('wrong');
    all[q.ans].classList.add('correct');
    all.forEach((b, i) => { if (i !== idx && i !== q.ans) b.classList.add('dim'); });
    panel.classList.add('wrong');
    document.getElementById('feedbackEmoji').textContent = '💡';
    document.getElementById('feedbackTitle').textContent = '惜しい！ここで覚えよう';
    document.getElementById('feedbackExplain').textContent = q.explain;
  }

  const nextBtn = document.getElementById('nextBtn');
  if (currentIdx + 1 >= questions.length) {
    nextBtn.textContent = '結果を見る 🎉';
    nextBtn.className = 'next-btn end';
  } else {
    nextBtn.innerHTML = '次の問題へ &rarr;';
    nextBtn.className = 'next-btn go';
  }

  setTimeout(() => panel.classList.add('show'), 50);
}

function nextQuestion() {
  currentIdx++;
  if (currentIdx >= questions.length) { showResult(); return; }
  document.getElementById('feedbackPanel').classList.remove('show','correct','wrong');
  setTimeout(renderQuestion, 350);
}

// ── おすすめ広告の設定 ──
// 広告を足す・外すときは、ADS に1件追加／削除するだけ。
//   categories: 広告を出す検定（'eiken' / 'kanken'）
//   levels    : 広告を出すレベル。同じレベルに複数の広告が当てはまると、結果ごとにランダムで1つ選ばれる
//   weight    : 表示の比率（省略時は1）。反応の良い広告の weight を上げると、表示が増える
//   url / pixel: A8の「広告リンク作成」で出たリンクと1px画像のURL
//   texts     : スコア帯ごとの紹介文（効果を言い切らない表現にしている）
// url が空の広告は表示されない。
const ADS = [
  {
    name: 'hatchlink_jr',
    url: 'https://px.a8.net/svt/ejp?a8mat=4BC6AT+A0SQWY+3O9E+5YJRM',
    pixel: 'https://www18.a8.net/0.gif?a8mat=4BC6AT+A0SQWY+3O9E+5YJRM',
    categories: ['eiken'],
    levels: ['3', 'p2'],
    title: 'もっと英語を使ってみたい方へ',
    linkText: '幼児〜高校生向けオンライン英会話を見る',
    disclosure: '※広告（アフィリエイトリンク）を含みます。対象は幼児〜高校生です。',
    texts: [
      { min: 90, text: 'とても高い正解率です。次のステップとして、オンライン英会話で「話す」練習を取り入れてみませんか。' },
      { min: 70, text: '理解度は高めです。読む・聞くだけでなく、話す練習もプラスしてみませんか。' },
      { min: 50, text: '基礎は身についています。学んだ英語を使う場として、オンライン英会話を試してみませんか。' },
      { min: 0,  text: '英語に慣れる第一歩として、オンライン英会話という選択肢もあります。' },
    ],
  },
  {
    name: 'willies',
    url: 'https://px.a8.net/svt/ejp?a8mat=4BES28+B72IV6+4JKM+5YJRM',
    pixel: 'https://www13.a8.net/0.gif?a8mat=4BES28+B72IV6+4JKM+5YJRM',
    categories: ['eiken'],
    levels: ['2', 'p1', '1'],
    title: 'もっと英語を使ってみたい方へ',
    linkText: '担任制のオンライン英会話を見る',
    disclosure: '※広告（アフィリエイトリンク）を含みます。',
    texts: [
      { min: 90, text: 'とても高い正解率です。さらに上を目指すなら、講師と1対1で話す練習も選択肢のひとつです。' },
      { min: 70, text: '理解度は高めです。読む・聞くだけでなく、話す練習もプラスしてみませんか。' },
      { min: 50, text: '基礎は身についています。担任の講師と続けて学べる、オンライン英会話もあります。' },
      { min: 0,  text: '英語に慣れる第一歩として、オンライン英会話という選択肢もあります。' },
    ],
  },
  {
    name: 'sutasuta_live',
    url: 'https://px.a8.net/svt/ejp?a8mat=4BES28+83QGQQ+5WXU+5YRHE',
    pixel: 'https://www19.a8.net/0.gif?a8mat=4BES28+83QGQQ+5WXU+5YRHE',
    categories: ['eiken'],
    levels: ['3', 'p2', '2', 'p1', '1'],
    title: '英検対策に迷ったら',
    linkText: '英検専門のオンライン個別指導を見る',
    disclosure: '※広告（アフィリエイトリンク）を含みます。',
    texts: [
      { min: 90, text: 'とても高い正解率です。英検対策に特化した個別指導という選択肢もあります。' },
      { min: 70, text: '理解度は高めです。苦手な部分を相談できる、英検専門のオンライン個別指導もあります。' },
      { min: 50, text: '基礎は身についています。いまの力に合った対策を相談できる、英検専門の個別指導もあります。' },
      { min: 0,  text: '英検対策の進め方に迷ったら、専門の個別指導に相談するという選択肢もあります。' },
    ],
  },
];

let currentAd = null;
let lastResultPct = 0;

// いまの検定・レベルに合う広告を、weight（省略時は1）の比率でランダムに1つ選ぶ（なければ null）
function pickAd() {
  const list = ADS.filter(a =>
    a.url &&
    a.categories.includes(currentLevelCategory) &&
    a.levels.includes(currentLevel.id)
  );
  if (list.length === 0) return null;
  const total = list.reduce((sum, a) => sum + (a.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const a of list) {
    r -= (a.weight ?? 1);
    if (r < 0) return a;
  }
  return list[list.length - 1];
}

function renderAdRecommendation(pct) {
  const card = document.getElementById('adRecommendCard');
  if (!card) return;
  lastResultPct = pct;

  // 前回の計測画像は消す（表示していない広告の分を数えないため）
  const oldPixel = document.getElementById('adPixel');
  if (oldPixel) oldPixel.remove();

  currentAd = pickAd();
  if (!currentAd) { card.style.display = 'none'; return; }

  const ad = currentAd;
  const t = ad.texts.find(x => pct >= x.min);
  document.getElementById('adTitle').textContent = ad.title;
  document.getElementById('adText').textContent = t.text;
  document.getElementById('adLinkText').textContent = ad.linkText;
  document.getElementById('adLinkBtn').href = ad.url;
  document.getElementById('adDisclosure').textContent = ad.disclosure;
  card.style.display = '';

  // A8の1px計測画像は、その広告が表示されたときだけ追加
  if (ad.pixel) {
    const img = document.createElement('img');
    img.id = 'adPixel';
    img.src = ad.pixel;
    img.width = 1; img.height = 1; img.alt = '';
    img.style.cssText = 'border:0;width:1px;height:1px;position:absolute;opacity:0;pointer-events:none;';
    card.appendChild(img);
  }

  trackEvent('ad_view', {
    ad_name: ad.name,
    category_id: currentLevelCategory,
    level_id: currentLevel.id,
    score_percent: pct,
  });
}

// 広告クリックをGAに送る
(function bindAdClick() {
  const btn = document.getElementById('adLinkBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!currentAd) return;
    trackEvent('ad_click', {
      ad_name: currentAd.name,
      category_id: currentLevelCategory,
      level_id: currentLevel ? currentLevel.id : '',
      score_percent: lastResultPct,
    });
  });
})();

function showResult() {
  showScreen('result');
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  document.getElementById('bkCorrect').textContent = score;
  document.getElementById('bkWrong').textContent = total - score;
  document.getElementById('bkTime').textContent = mins > 0 ? `${mins}:${String(secs).padStart(2,'0')}` : `${secs}s`;

  const ring = document.getElementById('ringFill');
  const circumference = 326.7;
  const diag = getDiagnosis(pct);

  document.getElementById('ringPct').textContent = pct + '%';
  document.getElementById('ringPct').className = 'ring-pct ' + diag.scoreClass;
  document.getElementById('ringOf').textContent = `${score}/${total}`;

  const levelTag = document.getElementById('resultLevelTag');
  levelTag.textContent = currentLevel.name;
  levelTag.style.cssText = `background:${currentLevel.bg}; border:1px solid ${currentLevel.border}; color:${currentLevel.color};`;

  document.getElementById('resultCrown').textContent = diag.crown;
  document.getElementById('diagLevel').textContent = diag.title;
  document.getElementById('diagDesc').textContent = diag.desc;

  renderAdRecommendation(pct);

  trackEvent('quiz_complete', {
    category_id: currentLevelCategory,
    level_id: currentLevel.id,
    level_name: currentLevel.name,
    question_count: total,
    score: score,
    score_percent: pct,
    elapsed_seconds: elapsed,
  });

  setTimeout(() => {
    ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
    ring.style.stroke = diag.color;
    animateRingNum(0, pct);
  }, 300);

  if (pct >= 80) launchConfetti(40);
}

function getDiagnosis(pct) {
  // 検定ごとに称号を変える（遊び感を出すため）
  const isKanken = currentLevelCategory === 'kanken';
  const titles = isKanken
    ? { top: '漢字王 🏆', high: '漢字の達人 ⭐', mid: 'あと一歩の読み手 📈', low: '漢字修行中 💪' }
    : { top: '英語マスター 🏆', high: '英語通 ⭐', mid: 'あと一歩の挑戦者 📈', low: '伸びしろたっぷり 💪' };
  if (pct >= 90) return { title: titles.top,  desc:'ほぼ完璧！この調子で上の級にも挑戦してみよう。', crown:'🏆', color:'#34D399', scoreClass:'s-great' };
  if (pct >= 70) return { title: titles.high, desc:'なかなかの高得点！間違えた問題だけ見直せば、さらに伸びそう。', crown:'⭐', color:'#A78BFA', scoreClass:'s-good' };
  if (pct >= 50) return { title: titles.mid,  desc:'半分以上クリア！解説を読んで、もう一回挑戦してみよう。', crown:'📈', color:'#F59E0B', scoreClass:'s-ok' };
  return { title: titles.low, desc:'ここからが伸びしろ。1問ずつ、気軽にもう一度やってみよう。', crown:'💪', color:'#F87171', scoreClass:'s-low' };
}

function animateRingNum(from, to) {
  let val = from;
  const step = () => {
    val = Math.min(val + 2, to);
    document.getElementById('ringPct').textContent = val + '%';
    if (val < to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function shareX() {
  const pct = Math.round((score / questions.length) * 100);
  const isKanken = currentLevelCategory === 'kanken';
  const tags = isKanken ? '#漢検 #漢字検定 #漢字学習 #kanken' : '#英検 #英語学習 #eiken';
  const text = `${currentLevel.name}クイズ結果\n正解率: ${pct}%（${score}/${questions.length}問）\n\n${tags}`;
  copyToClipboard(text);
}

function shareIG() {
  const pct = Math.round((score / questions.length) * 100);
  const diag = getDiagnosis(pct);
  const isKanken = currentLevelCategory === 'kanken';
  const subject = isKanken ? '漢字' : '英語';
  const tags = isKanken ? '#漢検 #漢字検定 #漢字 #勉強垢 #漢字学習 #漢検合格' : '#英検 #英語学習 #英語 #勉強垢 #英語勉強 #英検合格';
  const text = `${diag.crown} ${subject}クイズやってみた！\n\n📊 ${currentLevel.name}テスト結果\n✅ 正解率 ${pct}%\n📝 ${score}/${questions.length}問正解\n🎯 称号：${diag.title}\n\n${tags}`;
  copyToClipboard(text);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand('copy');
    document.body.removeChild(el);
  }
  const toast = document.getElementById('copyToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function retryQuiz() {
  trackEvent('retry_quiz', { category_id: currentLevelCategory, level_id: currentLevel.id, level_name: currentLevel.name });
  startQuiz(currentLevel.id, lastCount, currentLevelCategory);
}
function goHome() { showScreen('home'); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  updateScrollHint(id);
}

function updateScrollHint(activeId) {
  const hint = document.getElementById('scrollHint');
  if (!hint) return;
  if (activeId === 'home') {
    hint.style.display = 'flex';
    hint.classList.remove('hide');
  } else {
    hint.style.display = 'none';
  }
}

window.addEventListener('scroll', () => {
  const hint = document.getElementById('scrollHint');
  if (!hint) return;
  const home = document.getElementById('home');
  if (!home.classList.contains('active')) return;
  if (window.scrollY > 40) {
    hint.classList.add('hide');
  } else {
    hint.classList.remove('hide');
  }
});

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomCorrectEmoji() {
  return ['🎉','✨','🔥','💯','⚡','🌟','👏'][Math.floor(Math.random()*7)];
}

function launchConfetti(n = 20) {
  const container = document.getElementById('confettiContainer');
  const colors = ['#7C3AED','#10B981','#F59E0B','#EF4444','#3B82F6','#A78BFA','#34D399'];
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `left:${Math.random()*100}%; top:0; background:${colors[Math.floor(Math.random()*colors.length)]}; animation-duration:${0.8 + Math.random()*0.6}s; animation-delay:${Math.random()*0.3}s; transform:rotate(${Math.random()*360}deg);`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    }, i * 30);
  }
}

// 賑わいカウンター機能は削除済み

buildCategoryTabs();
buildLevelGrid();
updateScrollHint('home');

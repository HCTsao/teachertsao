'use strict';

const W = 12, H = 10, VERSION = 3, HISTORY = 'symmetryTreasure.records.v2';
const $ = id => document.getElementById(id);

// 座標鏡像運算
const mirror = (key, axis) => {
  let [r, c] = key.split(',').map(Number);
  return axis === 'V' ? `${r},${W - 1 - c}` : `${H - 1 - r},${c}`;
};

// =========================================================
// 🌟 豐富多元題庫庫存 (35+ 組精緻題型，分 5 個難度階梯) 🌟
// =========================================================

// 鉛直對稱軸題庫 (左半題目前景：c < 6，右半玩家作答：c >= 6)
const V_BANK = [
  // Tier 1: 4-6 格 (入門基礎)
  { name: '古幣菱形', tier: 1, axis: 'V', given: ['3,4','4,3','5,3','6,4'] },
  { name: '階梯金字塔', tier: 1, axis: 'V', given: ['3,5','4,4','4,5','5,3','5,4','5,5'] },
  { name: '海盜指路箭', tier: 1, axis: 'V', given: ['2,5','3,4','4,3','5,4','6,5'] },
  { name: '小船錨角', tier: 1, axis: 'V', given: ['2,5','3,5','4,5','5,5','6,4','6,5'] },
  { name: '高腳酒杯', tier: 1, axis: 'V', given: ['3,3','4,3','4,4','5,5','6,5'] },

  // Tier 2: 7-9 格 (初階進階)
  { name: '秘島杉樹', tier: 2, axis: 'V', given: ['2,5','3,4','3,5','4,3','4,4','4,5','5,4','5,5','6,5'] },
  { name: '單桅帆船', tier: 2, axis: 'V', given: ['1,5','2,4','2,5','3,3','3,4','3,5','4,5','5,3','5,4'] },
  { name: '黃金小王冠', tier: 2, axis: 'V', given: ['3,2','3,4','4,2','4,3','4,4','4,5','5,2','5,3','5,4','5,5'] },
  { name: '彩蝶翼翅', tier: 2, axis: 'V', given: ['2,3','2,4','3,2','3,5','4,3','4,5','5,2','6,3','6,4'] },
  { name: '航海羅盤針', tier: 2, axis: 'V', given: ['2,5','3,4','3,5','4,2','4,3','4,4','4,5','5,4','5,5','6,5'] },

  // Tier 3: 10-12 格 (中階挑戰)
  { name: '海盜骷髏眼眶', tier: 3, axis: 'V', given: ['2,4','2,5','3,3','3,5','4,3','4,5','5,4','5,5','6,3','6,5','7,4','7,5'] },
  { name: '雙層石砌古堡', tier: 3, axis: 'V', given: ['2,3','2,5','3,3','3,4','3,5','4,2','4,3','4,4','4,5','5,2','5,5','6,2','6,3','6,4','6,5'] },
  { name: '聖十字架印章', tier: 3, axis: 'V', given: ['1,5','2,5','3,2','3,3','3,4','3,5','4,2','4,3','4,4','4,5','5,5','6,5','7,5'] },
  { name: '海馬神秘圖騰', tier: 3, axis: 'V', given: ['1,4','2,3','2,4','3,4','4,4','5,3','5,4','6,3','7,4','7,5','8,5'] },
  { name: '五芒海星半體', tier: 3, axis: 'V', given: ['1,5','2,4','2,5','3,3','3,4','4,1','4,2','4,3','4,4','4,5','5,3','6,4'] },

  // Tier 4: 13-15 格 (高階複雜)
  { name: '大西洋導航燈塔', tier: 4, axis: 'V', given: ['1,5','2,4','2,5','3,4','3,5','4,3','4,4','4,5','5,3','5,4','5,5','6,2','6,3','6,4','6,5'] },
  { name: '海盜騎士戰盔', tier: 4, axis: 'V', given: ['2,3','2,4','2,5','3,2','3,5','4,2','4,3','4,4','4,5','5,3','5,5','6,2','6,4','6,5','7,3','7,4'] },
  { name: '深海巨章觸手', tier: 4, axis: 'V', given: ['2,4','2,5','3,3','3,5','4,3','4,4','4,5','5,2','5,5','6,1','6,2','6,5','7,3','7,4','7,5'] },
  { name: '古重錨與鐵環', tier: 4, axis: 'V', given: ['1,4','1,5','2,4','3,5','4,2','4,3','4,4','4,5','5,5','6,1','6,5','7,2','7,3','7,4','7,5'] },

  // Tier 5: 16-20 格 (大師終極)
  { name: '黑珍珠號巨帆', tier: 5, axis: 'V', given: ['1,5','2,4','2,5','3,3','3,4','3,5','4,2','4,3','4,4','4,5','5,5','6,1','6,2','6,3','6,4','6,5','7,2','7,3','7,4','7,5'] },
  { name: '骷髏與海盜雙刀', tier: 5, axis: 'V', given: ['1,2','2,3','2,5','3,4','3,5','4,2','4,4','4,5','5,3','5,4','5,5','6,1','6,5','7,2','7,4','7,5','8,3','8,5'] },
  { name: '皇家雙翼大徽章', tier: 5, axis: 'V', given: ['2,2','2,5','3,1','3,2','3,4','3,5','4,2','4,3','4,4','4,5','5,3','5,4','5,5','6,2','6,3','6,5','7,4','7,5'] }
];

// 水平對稱軸題庫 (上半題目前景：r < 5，下半玩家作答：r >= 5)
const H_BANK = [
  // Tier 1: 4-6 格 (入門基礎)
  { name: '雙子山峰', tier: 1, axis: 'H', given: ['3,4','3,7','4,3','4,4','4,7','4,8'] },
  { name: '蘑菇圓傘蓋', tier: 1, axis: 'H', given: ['2,5','2,6','3,4','3,5','3,6','3,7','4,5','4,6'] },
  { name: '飛碟穹頂', tier: 1, axis: 'H', given: ['3,5','3,6','4,3','4,4','4,5','4,6','4,7','4,8'] },
  { name: '航海前進箭印', tier: 1, axis: 'H', given: ['2,5','2,6','3,4','3,5','3,6','3,7','4,5','4,6'] },
  { name: '波浪微瀾', tier: 1, axis: 'H', given: ['3,2','3,5','3,8','4,1','4,2','4,4','4,5','4,7','4,8'] },

  // Tier 2: 7-9 格 (初階進階)
  { name: '海燕凌空展翅', tier: 2, axis: 'H', given: ['2,1','2,10','3,2','3,3','3,8','3,9','4,4','4,5','4,6','4,7'] },
  { name: '古幣雕花上弧', tier: 2, axis: 'H', given: ['2,4','2,5','2,6','2,7','3,3','3,8','4,3','4,8'] },
  { name: '寶箱拱形頂蓋', tier: 2, axis: 'H', given: ['2,4','2,5','2,6','2,7','3,2','3,3','3,8','3,9','4,2','4,9'] },
  { name: '跨海石橋樑', tier: 2, axis: 'H', given: ['2,5','2,6','3,3','3,4','3,7','3,8','4,2','4,9'] },

  // Tier 3: 10-12 格 (中階挑戰)
  { name: '古神殿三角簷', tier: 3, axis: 'H', given: ['1,5','1,6','2,4','2,5','2,6','2,7','3,3','3,4','3,7','3,8','4,2','4,3','4,4','4,7','4,8','4,9'] },
  { name: '西班牙戰船甲板', tier: 3, axis: 'H', given: ['2,4','2,5','2,6','2,7','3,3','3,4','3,5','3,6','3,7','3,8','4,1','4,2','4,9','4,10'] },
  { name: '星月穹頂天幕', tier: 3, axis: 'H', given: ['1,5','1,6','2,3','2,4','2,7','2,8','3,2','3,5','3,6','3,9','4,3','4,8'] },
  { name: '深海巨星上臂', tier: 3, axis: 'H', given: ['1,5','1,6','2,5','2,6','3,1','3,2','3,9','3,10','4,3','4,4','4,5','4,6','4,7','4,8'] },

  // Tier 4: 13-15 格 (高階複雜)
  { name: '神鷹翱翔翼頂', tier: 4, axis: 'H', given: ['1,1','1,10','2,2','2,3','2,8','2,9','3,3','3,7','3,8','4,4','4,5','4,6','4,7'] },
  { name: '海盜三角大戰旗', tier: 4, axis: 'H', given: ['1,5','1,6','2,4','2,5','2,6','2,7','3,3','3,5','3,6','3,8','4,2','4,3','4,4','4,7','4,8','4,9'] },
  { name: '古堡石雕城垛', tier: 4, axis: 'H', given: ['2,2','2,4','2,7','2,9','3,2','3,3','3,4','3,7','3,8','3,9','4,1','4,2','4,3','4,8','4,9','4,10'] },

  // Tier 5: 16-20 格 (大師終極)
  { name: '神話巨海龍身', tier: 5, axis: 'H', given: ['1,3','1,5','1,8','2,2','2,3','2,5','2,6','2,8','2,9','3,1','3,2','3,4','3,7','3,9','3,10','4,1','4,2','4,3','4,4','4,7','4,8','4,9','4,10'] },
  { name: '終極西班牙冠冕', tier: 5, axis: 'H', given: ['1,2','1,5','1,6','1,9','2,2','2,3','2,5','2,6','2,8','2,9','3,1','3,3','3,4','3,7','3,8','3,10','4,1','4,2','4,3','4,8','4,9','4,10'] }
];

// 隨機選題：保證每次遊玩均由題庫池隨機抽取 5 題，難度階梯逐級遞增
function makeLevels() {
  const chosen = [];
  // 5 個關卡分別對應 Tier 1 ~ Tier 5，交替抽垂直與水平對稱
  for (let tier = 1; tier <= 5; tier++) {
    // 依據關卡設定軸向（例：1=V, 2=H, 3=V, 4=H, 5=V，或隨機抽取）
    const preferAxis = (tier % 2 === 1) ? 'V' : 'H';
    const primaryPool = (preferAxis === 'V' ? V_BANK : H_BANK).filter(item => item.tier === tier);
    const fallbackPool = (preferAxis === 'V' ? H_BANK : V_BANK).filter(item => item.tier === tier);

    const pool = primaryPool.length ? primaryPool : fallbackPool;
    const item = pool[Math.floor(Math.random() * pool.length)];

    chosen.push({
      id: `v3-t${tier}-${Math.random().toString(36).slice(2, 6)}`,
      tier: tier,
      name: item.name,
      axis: item.axis,
      given: [...item.given]
    });
  }
  return chosen;
}

let run = null, undo = [], stroke = null, lastCheck = null, hintTarget = null;
const cells = new Map();

function answer() {
  return new Set(run.levels[run.index].given.map(k => mirror(k, run.levels[run.index].axis)));
}

function editable(key) {
  let [r, c] = key.split(',').map(Number);
  return r >= 0 && r < H && c >= 0 && c < W && (run.levels[run.index].axis === 'V' ? c >= W / 2 : r >= H / 2);
}

function progress() {
  return run.results[run.index];
}

function message(text) {
  const el = $('msg');
  if (el) el.textContent = text;
}

// 記錄作答歷程至本機與觸發日誌事件
function record(kind, extra = {}) {
  if (!run) return;
  const curLevel = run.levels[run.index];
  const ansSet = answer();

  const row = {
    id: crypto.randomUUID(),
    runId: run.id,
    at: new Date().toISOString(),
    kind,
    mode: 'challenge',
    level: run.index + 1,
    shapeName: curLevel.name,
    axis: curLevel.axis,
    bankVersion: VERSION,
    given: [...curLevel.given],
    student: { ...run.student },
    cells: [...run.mine],
    target: [...ansSet],
    attempts: run.failures,
    hints: run.hints,
    elapsed: Math.round((Date.now() - run.startedAt) / 1000),
    ...extra
  };

  try {
    const rows = JSON.parse(localStorage.getItem(HISTORY) || '[]');
    rows.push(row);
    localStorage.setItem(HISTORY, JSON.stringify(rows.slice(-2000)));
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('treasure-record', { detail: row }));
}

function start() {
  run = {
    version: VERSION,
    id: crypto.randomUUID(),
    mode: 'challenge',
    student: {
      className: ($('inClass').value || '').trim() || '未分班',
      name: ($('inName').value || '').trim() || '王小明',
      seat: ($('inSeat').value || '').trim() || '-'
    },
    levels: makeLevels(),
    index: 0,
    mine: [],
    results: {},
    failures: 0,
    hints: 0,
    hintStage: 0,
    elapsed: 0,
    startedAt: Date.now(),
    passed: false
  };

  $('startScreen').hidden = true;
  $('gameScreen').hidden = false;
  $('endScreen').hidden = true;
  $('menuBtn').hidden = false;

  undo = [];
  lastCheck = null;
  hintTarget = null;
  build();
  refresh();
}

function menu() {
  stroke = null;
  if ($('puzzleModal')) $('puzzleModal').hidden = true;
  $('startScreen').hidden = false;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = true;
  $('menuBtn').hidden = true;
}

function choose(i) {
  if (!run || i === run.index) return;
  if (!run.results[i] && i > Object.keys(run.results).length) return;
  load(i);
}

function load(i) {
  stroke = null;
  run.index = i;
  run.mine = run.results[i]?.cells ? [...run.results[i].cells] : [];
  run.passed = Boolean(run.results[i]);
  run.failures = 0;
  run.hints = 0;
  run.hintStage = 0;
  run.startedAt = Date.now();
  undo = [];
  lastCheck = null;
  hintTarget = null;
  build();
  refresh();
  message(run.passed ? '🎉 此關卡殘卷已收穫！' : '先找出對應格，再開始畫。');
}

function build() {
  const g = $('grid');
  g.replaceChildren();
  cells.clear();
  const lv = run.levels[run.index], given = new Set(lv.given);
  $('axisLine').className = lv.axis.toLowerCase();

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      let k = `${r},${c}`, b = document.createElement('button');
      b.type = 'button';
      b.dataset.key = k;
      b.className = 'cell';
      b.setAttribute('role', 'gridcell');
      b.setAttribute('aria-label', `第 ${r + 1} 列，第 ${c + 1} 欄${given.has(k) ? '，題目格' : ''}`);
      b.disabled = !editable(k);
      if (given.has(k)) b.classList.add('given');

      b.addEventListener('keydown', e => {
        let delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
        if (delta) {
          e.preventDefault();
          let next = cells.get(`${r + delta[0]},${c + delta[1]}`);
          if (next && !next.disabled) next.focus();
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!e.repeat && !run.passed) {
            remember();
            paint(k, !run.mine.includes(k));
            commitStroke();
          }
        }
      });

      g.append(b);
      cells.set(k, b);
    }
  }
}

function refresh() {
  if (!run) return;
  const lv = run.levels[run.index];
  const given = new Set(lv.given);
  for (const [k, b] of cells) {
    const has = run.mine.includes(k);
    b.classList.toggle('mine', has);
    b.textContent = given.has(k) || has ? '■' : '';
    b.setAttribute('aria-selected', String(has));
    b.classList.remove('wrong', 'missing', 'pair');
  }

  const solvedCount = Object.keys(run.results).length;

  $('levelTitle').textContent = `第 ${run.index + 1} 關 · ${lv.name} (${lv.axis === 'V' ? '左右對稱' : '上下對稱'})`;
  $('levelLabel').textContent = `關卡 ${run.index + 1} / 5`;
  $('gold').textContent = Object.values(run.results).reduce((n, r) => n + r.gold, 0);
  $('stars').textContent = `${solvedCount} / 5`;
  if ($('fragmentCount')) $('fragmentCount').textContent = solvedCount;

  $('checkBtn').disabled = run.passed;
  $('hintBtn').disabled = run.passed || run.failures < 2;
  $('undoBtn').disabled = run.passed || !undo.length;
  $('clearBtn').disabled = run.passed;

  $('hintBtn').innerHTML = run.failures < 2 ? `<span class="parrot-ic">💡</span> 分步提示 (再試 ${2 - run.failures} 次)` : '<span class="parrot-ic">💡</span> 分步提示';
  $('nextBtn').hidden = !run.passed;
  $('nextBtn').innerHTML = run.index === 4 ? '前往秘寶島洞窟 👑 →' : '前往下一關 ⛵ →';

  // 關卡進度列
  $('islands').replaceChildren();
  run.levels.forEach((_, i) => {
    let b = document.createElement('button');
    b.className = 'island' + (i === run.index ? ' active' : '') + (run.results[i] ? ' done' : '');
    b.textContent = run.results[i] ? '★' : (i + 1);
    b.disabled = !run.results[i] && i > solvedCount;
    b.setAttribute('aria-label', `第 ${i + 1} 關${run.results[i] ? '，已完成' : ''}`);
    b.onclick = () => choose(i);
    $('islands').append(b);
  });
}

function remember() {
  undo.push([...run.mine]);
  if (undo.length > 40) undo.shift();
}

function paint(k, value) {
  if (!editable(k) || run.passed) return;
  const m = new Set(run.mine);
  value ? m.add(k) : m.delete(k);
  run.mine = [...m];
  const b = cells.get(k);
  if (b) {
    b.classList.toggle('mine', value);
    b.textContent = value ? '■' : '';
    b.classList.remove('wrong', 'missing', 'pair');
    b.setAttribute('aria-selected', String(value));
  }
}

function commitStroke() {
  stroke = null;
  $('undoBtn').disabled = !undo.length;
}

function hit(e) {
  return document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-key]')?.dataset.key;
}

// 畫筆交互：點擊空白格塗色，點擊已填格抹除；拖曳跟隨初始點擊狀態
function begin(e) {
  if (!run || run.passed || stroke || e.button > 0) return;
  const k = hit(e);
  if (!k || !editable(k)) return;
  e.preventDefault();
  remember();
  stroke = {
    id: e.pointerId,
    value: !run.mine.includes(k),
    last: k,
    seen: new Set([k])
  };
  $('grid').setPointerCapture(e.pointerId);
  paint(k, stroke.value);
}

function move(e) {
  if (!stroke || stroke.id !== e.pointerId) return;
  e.preventDefault();
  const k = hit(e);
  if (!k || !editable(k)) return;
  const [a, b] = stroke.last.split(',').map(Number), [r, c] = k.split(',').map(Number);
  const steps = Math.max(Math.abs(r - a), Math.abs(c - b));
  for (let n = 1; n <= steps; n++) {
    let cell = `${Math.round(a + (r - a) * n / steps)},${Math.round(b + (c - b) * n / steps)}`;
    if (!stroke.seen.has(cell)) {
      paint(cell, stroke.value);
      stroke.seen.add(cell);
    }
  }
  stroke.last = k;
}

function finish(e) {
  if (stroke && stroke.id === e.pointerId) commitStroke();
}

// =========================================================
// 🌟 核心過關：顯現 5 塊撕碎藏寶圖殘卷拼合 (Puzzle Modal) 🌟
// =========================================================
function showTornMapPuzzleModal(newlySolvedPieceIndex) {
  const modal = $('puzzleModal');
  const heading = $('puzzleHeading');
  const sub = $('puzzleSub');
  const statusText = $('piecesStatusText');
  const seamGlow = $('seamGlow');
  const closeBtn = $('closePuzzleBtn');

  if (!modal) return;

  const currentTotalSolved = Object.keys(run.results).length;

  heading.textContent = `⚔️ 尋獲第 ${newlySolvedPieceIndex} 塊海盜藏寶圖殘卷！`;
  sub.textContent = currentTotalSolved === 5 ? '⚡ 5 塊殘卷全部拼齊！終極藏寶圖在金光中完整合璧！' : '殘卷正在與其他拼圖產生古老共鳴...';

  statusText.textContent = `已拼齊 ${currentTotalSolved} / 5 塊碎片 · ${currentTotalSolved === 5 ? '海圖完整解開！' : `尚有 ${5 - currentTotalSolved} 塊隱沒於海霧中`}`;

  for (let p = 1; p <= 5; p++) {
    const pieceEl = $(`piece${p}`);
    if (!pieceEl) continue;

    pieceEl.classList.remove('snapping');

    if (p <= currentTotalSolved) {
      pieceEl.classList.remove('locked');
      if (p === newlySolvedPieceIndex) {
        setTimeout(() => {
          pieceEl.classList.add('snapping');
        }, 80);
      }
    } else {
      pieceEl.classList.add('locked');
    }
  }

  if (seamGlow) {
    if (currentTotalSolved === 5) {
      setTimeout(() => {
        seamGlow.classList.add('ignited');
      }, 700);
      closeBtn.innerHTML = '前往秘寶洞窟見證出土 👑 →';
    } else {
      seamGlow.classList.remove('ignited');
      closeBtn.innerHTML = '收起殘卷，前往下一關 ⛵';
    }
  }

  modal.hidden = false;
}

function check() {
  if (!run || run.passed) return;
  if (!run.mine.length) {
    message('⚠️ 先試著在對稱側填入格子，再來檢查吧！');
    return;
  }
  const signature = [...run.mine].sort().join(';');
  if (signature === lastCheck) {
    message('⚠️ 圖形尚未改動，調整後再行檢查！');
    return;
  }
  lastCheck = signature;

  const ans = answer();
  const wrong = run.mine.filter(k => !ans.has(k));
  const missing = [...ans].filter(k => !run.mine.includes(k));

  if (wrong.length || missing.length) run.failures++;

  record('check', { wrong, missing, correct: !wrong.length && !missing.length });

  if (!wrong.length && !missing.length) {
    run.passed = true;
    const isFirstTime = !progress();
    if (isFirstTime) {
      run.results[run.index] = {
        cells: [...run.mine],
        gold: 50,
        attempts: run.failures,
        hints: run.hints,
        seconds: Math.round((Date.now() - run.startedAt) / 1000),
        independent: run.hints === 0
      };
    }
    record('complete', { correct: true, wrong: [], missing: [] });
    refresh();

    const solvedPieceNum = run.index + 1;
    showTornMapPuzzleModal(solvedPieceNum);

    message(`🎉 完全正確！獲得 50 枚金幣與第 ${solvedPieceNum} 塊藏寶圖殘卷！`);
    return;
  }

  refresh();
  message(`⚠️ 還不太對稱：多畫了 ${wrong.length} 格，漏畫了 ${missing.length} 格。請仔細檢查與對稱軸的距離！`);
}

function hint() {
  if (run.passed || run.failures < 2) return;
  run.hints++;
  run.hintStage = Math.min(3, run.hintStage + 1);
  const ans = answer(), missing = [...ans].filter(k => !run.mine.includes(k)), wrong = run.mine.filter(k => !ans.has(k));
  refresh();

  if (run.hintStage === 1) {
    message('💡 提示：對稱兩格與紅線的垂直距離完全相等！先觀察最貼近紅線的格子。');
  } else if (run.hintStage === 2) {
    hintTarget = missing[0] || wrong[0];
    if (hintTarget) {
      cells.get(hintTarget)?.classList.add('pair');
      cells.get(mirror(hintTarget, run.levels[run.index].axis))?.classList.add('pair');
    }
    message('💡 紫色格子是一組對稱位置！算算看它們各自距離紅線幾格？');
  } else {
    remember();
    if (missing.length) {
      paint(missing[0], true);
      message('💡 已為你填入一格對應格，剩下請自行完成！');
    } else if (wrong.length) {
      paint(wrong[0], false);
      message('💡 已幫你清除一個多畫的錯誤格，再次檢查吧！');
    } else {
      message('💡 已經完全對稱，快按下檢查藏寶圖吧！');
    }
  }

  record('hint', { stage: run.hintStage, wrong, missing });
}

// =========================================================
// 🌟 破關：古老海盜風格「獵人出發找到寶藏」史詩動畫 🌟
// =========================================================
function playEpicPirateTreasureCinematic() {
  const ship = $('cineShip');
  const hunter = $('cineHunter');
  const sparks = $('cineDigSparks');
  const chestVault = $('cineChestVault');
  const geyser = $('cineGoldGeyser');
  const narrative = $('cineNarrative');

  if (!ship || !hunter || !sparks || !chestVault || !geyser || !narrative) return;

  ship.className = 'pirate-galleon';
  hunter.className = 'cine-hunter';
  sparks.className = 'cine-dig-sparks';
  chestVault.className = 'cine-chest-vault';
  geyser.className = 'cine-gold-geyser';

  narrative.textContent = '🌊 血月當空，拼齊藏寶殘卷的海盜船破浪抵達骷髏島秘窟...';
  setTimeout(() => {
    ship.classList.add('arrive');
  }, 100);

  setTimeout(() => {
    narrative.textContent = '🤠 獵人手提搖曳火把與鐵鏟，踏上海灘走向 ✕ 標記處...';
    hunter.classList.add('appear');
    hunter.classList.add('digging');
    sparks.classList.add('sparking');
  }, 2600);

  setTimeout(() => {
    narrative.textContent = '⛏️ 鐵鏟觸及硬物！沉睡數百年的鐵皮海盜大木箱破土而出！';
    chestVault.classList.add('emerge');
  }, 4400);

  setTimeout(() => {
    narrative.textContent = '✨ 巨鎖崩解！西班牙金幣、翡翠珠寶與黃金王冠光芒萬丈噴湧！';
    sparks.classList.remove('sparking');
    hunter.classList.remove('digging');
    hunter.classList.add('cheering');
    chestVault.classList.add('open');
    geyser.classList.add('bursting');
  }, 5800);
}

function result() {
  stroke = null;
  if ($('puzzleModal')) $('puzzleModal').hidden = true;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = false;
  $('summary').replaceChildren();
  let completed = Object.entries(run.results);
  $('finalScore').textContent = `收集了全部 ${completed.length} 塊藏寶圖殘卷 · 共奪得 ${completed.reduce((n, [, r]) => n + r.gold, 0)} 枚金幣！`;

  for (const [i, r] of completed) {
    let p = document.createElement('div');
    p.className = 'summary-item';
    p.innerHTML = `<strong>🏝️ 第 ${Number(i) + 1} 關 (${run.levels[i].name})</strong> · ${r.independent ? '🏆 獨立解開' : '💡 提示輔助'} <span>（重試 ${r.attempts} 次 · 耗時 ${r.seconds} 秒）</span>`;
    $('summary').append(p);
  }

  playEpicPirateTreasureCinematic();
}

// 綁定棋盤事件
$('grid').addEventListener('pointerdown', begin);
$('grid').addEventListener('pointermove', move);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('grid').addEventListener(type, finish);
}

// 單一畫筆工具 (點擊已填格即自動清除，拖曳順暢塗繪)
$('drawBtn').onclick = () => {
  $('drawBtn').setAttribute('aria-pressed', 'true');
};

$('undoBtn').onclick = () => {
  if (run.passed || !undo.length) return;
  run.mine = undo.pop();
  refresh();
  message('已復原上一步。');
};

$('clearBtn').onclick = () => {
  if (run.passed || !run.mine.length) return;
  remember();
  run.mine = [];
  refresh();
  message('卷面已全部清除。');
};

$('checkBtn').onclick = check;
$('hintBtn').onclick = hint;
$('startBtn').onclick = () => start();
$('menuBtn').onclick = menu;
$('nextBtn').onclick = () => run.index === 4 ? result() : load(run.index + 1);
$('againBtn').onclick = menu;

if ($('closePuzzleBtn')) {
  $('closePuzzleBtn').onclick = () => {
    $('puzzleModal').hidden = true;
    const currentSolved = Object.keys(run.results).length;
    if (currentSolved === 5) {
      result();
    } else {
      load(run.index + 1);
    }
  };
}

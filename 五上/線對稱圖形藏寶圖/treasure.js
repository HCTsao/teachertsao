'use strict';
const W = 12, H = 10, VERSION = 2, HISTORY = 'symmetryTreasure.records.v2';
const $ = id => document.getElementById(id);

const mirror = (key, axis) => {
  let [r, c] = key.split(',').map(Number);
  return axis === 'V' ? `${r},${W - 1 - c}` : `${H - 1 - r},${c}`;
};

const reflectToHorizontal = given => given.map(k => {
  let [r, c] = k.split(',').map(Number);
  return `${c - 1},${r + 1}`;
});

const BASE = [
  ['3,3','3,4','4,2','4,5','5,2','5,5','6,3','6,4'],
  ['4,2','4,3','4,4','5,2','5,4','6,2','6,3','6,4','3,3','3,4'],
  ['3,2','4,2','5,2','6,2','2,3','7,3','3,4','4,4','5,4','6,4','4,5','5,5'],
  ['2,3','3,3','3,4','4,3','4,4','4,5','5,3','6,3','6,4','7,2','7,3','2,4','5,4'],
  ['2,3','2,4','3,2','3,5','4,2','4,3','4,4','4,5','5,3','5,4','6,4','7,3','7,4','7,5','3,3','3,4']
];

function makeLevels(variant = false) {
  return BASE.map((given, i) => {
    let axis = i % 2 ? 'H' : 'V';
    let cells = axis === 'H' ? reflectToHorizontal(given) : [...given];
    if (variant && Math.random() < 0.5) {
      cells = cells.map(k => {
        let [r, c] = k.split(',').map(Number);
        return axis === 'V' ? `${H - 1 - r},${c}` : `${r},${W - 1 - c}`;
      });
    }
    return { axis, given: cells, id: `v2-${i + 1}` };
  });
}

let run = null, tool = 'draw', undo = [], stroke = null, lastCheck = null, hintTarget = null;
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

function record(kind, extra = {}) {
  const row = {
    id: crypto.randomUUID(),
    runId: run.id,
    at: new Date().toISOString(),
    kind,
    mode: 'challenge',
    level: run.index + 1,
    axis: run.levels[run.index].axis,
    bankVersion: VERSION,
    given: run.levels[run.index].given,
    student: { ...run.student },
    cells: [...run.mine],
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
      name: ($('inName').value || '').trim() || '小小尋寶家',
      seat: ($('inSeat').value || '').trim() || '-'
    },
    levels: makeLevels($('variant').checked),
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
  $('startScreen').hidden = false;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = true;
  $('menuBtn').hidden = true;
}

function choose(i) {
  if (!run || i === run.index) return;
  // challenge 模式：只能點選已完成或當前關卡
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
  message(run.passed ? '🎉 這座島嶼已經探險成功！' : '🧭 觀察對稱軸，找出右/下側對應格開始塗畫。');
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
            paint(k, tool === 'draw' ? !run.mine.includes(k) : false);
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
  const given = new Set(run.levels[run.index].given);
  for (const [k, b] of cells) {
    const has = run.mine.includes(k);
    b.classList.toggle('mine', has);
    b.textContent = given.has(k) || has ? '■' : '';
    b.setAttribute('aria-selected', String(has));
    b.classList.remove('wrong', 'missing', 'pair');
  }

  $('levelTitle').textContent = `🏝️ 第 ${run.index + 1} 島 · ${run.levels[run.index].axis === 'V' ? '左右鏡像對稱' : '上下鏡像對稱'}`;
  $('levelLabel').textContent = `島嶼 ${run.index + 1} / 5`;
  $('gold').textContent = Object.values(run.results).reduce((n, r) => n + r.gold, 0);
  $('stars').textContent = `${Object.keys(run.results).length} / 5`;

  $('checkBtn').disabled = run.passed;
  $('hintBtn').disabled = run.passed || run.failures < 2;
  $('undoBtn').disabled = run.passed || !undo.length;
  $('clearBtn').disabled = run.passed;

  $('hintBtn').textContent = run.failures < 2 ? `💡 提示 (需先嘗試 ${2 - run.failures} 次)` : '🦜 鸚鵡指路提示';
  $('nextBtn').hidden = !run.passed;
  $('nextBtn').textContent = run.index === 4 ? '🏆 探險成果背包 →' : '前往下一座島嶼 ⛵ →';

  // 島嶼進度列
  $('islands').replaceChildren();
  run.levels.forEach((_, i) => {
    let b = document.createElement('button');
    b.className = 'island' + (i === run.index ? ' active' : '') + (run.results[i] ? ' done' : '');
    b.textContent = run.results[i] ? '⭐' : (i + 1);
    b.disabled = !run.results[i] && i > Object.keys(run.results).length;
    b.setAttribute('aria-label', `第 ${i + 1} 座島嶼${run.results[i] ? '，已完成' : ''}`);
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
  b.classList.toggle('mine', value);
  b.textContent = value ? '■' : '';
  b.classList.remove('wrong', 'missing', 'pair');
  b.setAttribute('aria-selected', String(value));
}

function commitStroke() {
  stroke = null;
  $('undoBtn').disabled = !undo.length;
}

function hit(e) {
  return document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-key]')?.dataset.key;
}

function begin(e) {
  if (!run || run.passed || stroke || e.button > 0) return;
  const k = hit(e);
  if (!k || !editable(k)) return;
  e.preventDefault();
  remember();
  stroke = {
    id: e.pointerId,
    value: tool === 'draw' ? !run.mine.includes(k) : false,
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

function check() {
  if (!run || run.passed) return;
  if (!run.mine.length) {
    message('⚠️ 先試著塗上對應格，再來按檢查吧！');
    return;
  }
  const signature = [...run.mine].sort().join(';');
  if (signature === lastCheck) {
    message('⚠️ 圖形尚未改動，調整後再檢查才算一次喔！');
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
    if (!progress()) {
      run.results[run.index] = {
        cells: [...run.mine],
        gold: 50,
        attempts: run.failures,
        hints: run.hints,
        seconds: Math.round((Date.now() - run.startedAt) / 1000),
        independent: run.hints === 0
      };
    }
    record('complete', { correct: true });
    refresh();
    message('🎉 完美對稱！獲得 50 探險金幣 🪙 與尋寶之星 ⭐！');
    return;
  }

  refresh();
  message(`⚠️ 還差一點點：多畫了 ${wrong.length} 格，漏畫了 ${missing.length} 格。仔細數數離紅線幾格！`);
}

function hint() {
  if (run.passed || run.failures < 2) return;
  run.hints++;
  run.hintStage = Math.min(3, run.hintStage + 1);
  const ans = answer(), missing = [...ans].filter(k => !run.mine.includes(k)), wrong = run.mine.filter(k => !ans.has(k));
  refresh();

  if (run.hintStage === 1) {
    message('🦜 鸚鵡提示：對稱兩格到紅線的格子數完全相同！先找最靠紅線的格子！');
  } else if (run.hintStage === 2) {
    hintTarget = missing[0] || wrong[0];
    if (hintTarget) {
      cells.get(hintTarget)?.classList.add('pair');
      cells.get(mirror(hintTarget, run.levels[run.index].axis))?.classList.add('pair');
    }
    message('🦜 紫色亮框是一組對應格！看看兩邊離紅線幾步？');
  } else {
    remember();
    if (missing.length) {
      paint(missing[0], true);
      message('🦜 鸚鵡幫你畫上了一格對應格，剩下自己加油！');
    } else if (wrong.length) {
      paint(wrong[0], false);
      message('🦜 鸚鵡幫你擦掉了一個多畫的格子，再檢查看看！');
    } else {
      message('🦜 圖形已經對稱，快按檢查確認吧！');
    }
  }

  record('hint', { stage: run.hintStage });
}

function result() {
  stroke = null;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = false;
  $('summary').replaceChildren();
  let completed = Object.entries(run.results);
  $('finalScore').textContent = `收集了 ${completed.length} 顆島嶼之星，共獲得 ${completed.reduce((n, [, r]) => n + r.gold, 0)} 金幣！`;

  for (const [i, r] of completed) {
    let p = document.createElement('div');
    p.className = 'summary-item';
    p.innerHTML = `<strong>🏝️ 第 ${Number(i) + 1} 島</strong> · ${r.independent ? '🏆 獨立解開' : '💡 獲得提示'} <span>（重試 ${r.attempts} 次 · 耗時 ${r.seconds} 秒）</span>`;
    $('summary').append(p);
  }
}

// 綁定棋盤事件
$('grid').addEventListener('pointerdown', begin);
$('grid').addEventListener('pointermove', move);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('grid').addEventListener(type, finish);
}

// 工具按鈕切換
$('drawBtn').onclick = () => {
  tool = 'draw';
  $('drawBtn').setAttribute('aria-pressed', 'true');
  $('eraseBtn').setAttribute('aria-pressed', 'false');
};
$('eraseBtn').onclick = () => {
  tool = 'erase';
  $('drawBtn').setAttribute('aria-pressed', 'false');
  $('eraseBtn').setAttribute('aria-pressed', 'true');
};

$('undoBtn').onclick = () => {
  if (run.passed || !undo.length) return;
  run.mine = undo.pop();
  refresh();
  message('已復原上一筆塗色。');
};

$('clearBtn').onclick = () => {
  if (run.passed || !run.mine.length) return;
  remember();
  run.mine = [];
  refresh();
  message('已清空全部塗色。');
};

$('checkBtn').onclick = check;
$('hintBtn').onclick = hint;
$('startBtn').onclick = () => start();
$('menuBtn').onclick = menu;
$('nextBtn').onclick = () => run.index === 4 ? result() : load(run.index + 1);
$('resultBtn').onclick = result;
$('againBtn').onclick = menu;

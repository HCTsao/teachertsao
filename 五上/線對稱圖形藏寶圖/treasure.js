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

function makeLevels() {
  return BASE.map((given, i) => {
    let axis = i % 2 ? 'H' : 'V';
    let cells = axis === 'H' ? reflectToHorizontal(given) : [...given];
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
      name: ($('inName').value || '').trim() || '無名水手',
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
  // 關閉浮層（若開啟）
  if ($('puzzleModal')) $('puzzleModal').hidden = true;
  $('startScreen').hidden = false;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = true;
  $('menuBtn').hidden = true;
}

function choose(i) {
  if (!run || i === run.index) return;
  // 只能點選已完成或當前關卡
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
  message(run.passed ? '🎉 此海島之殘卷已被收穫！' : '🧭 丈量紅線彼端之等距位置，繪出完全鏡像圖騰吧！');
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

  const solvedCount = Object.keys(run.results).length;

  $('levelTitle').textContent = `第 ${run.index + 1} 島 · ${run.levels[run.index].axis === 'V' ? '左右鉛直鏡像' : '上下水平鏡像'}`;
  $('levelLabel').textContent = `島嶼 ${run.index + 1} / 5`;
  $('gold').textContent = Object.values(run.results).reduce((n, r) => n + r.gold, 0);
  $('stars').textContent = `${solvedCount} / 5`;
  if ($('fragmentCount')) $('fragmentCount').textContent = solvedCount;

  $('checkBtn').disabled = run.passed;
  $('hintBtn').disabled = run.passed || run.failures < 2;
  $('undoBtn').disabled = run.passed || !undo.length;
  $('clearBtn').disabled = run.passed;

  $('hintBtn').innerHTML = run.failures < 2 ? `<span class="parrot-ic">🦜</span> 鸚鵡密語 (再試 ${2 - run.failures} 次)` : '<span class="parrot-ic">🦜</span> 鸚鵡密語指路';
  $('nextBtn').hidden = !run.passed;
  $('nextBtn').innerHTML = run.index === 4 ? '航向最後的秘寶島洞窟 ⛵ →' : '航向下一座海島探險 ⛵ →';

  // 島嶼進度列
  $('islands').replaceChildren();
  run.levels.forEach((_, i) => {
    let b = document.createElement('button');
    b.className = 'island' + (i === run.index ? ' active' : '') + (run.results[i] ? ' done' : '');
    b.textContent = run.results[i] ? '★' : (i + 1);
    b.disabled = !run.results[i] && i > solvedCount;
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

// =========================================================
// 🌟 核心過關：顯現 5 塊撕碎藏寶圖拼圖動畫 (Puzzle Modal) 🌟
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

  // 更新 5 塊拼圖的狀態
  for (let p = 1; p <= 5; p++) {
    const pieceEl = $(`piece${p}`);
    if (!pieceEl) continue;

    pieceEl.classList.remove('snapping');

    if (p <= currentTotalSolved) {
      pieceEl.classList.remove('locked');
      // 剛獲得的這塊播放咬合飛行震撼動畫
      if (p === newlySolvedPieceIndex) {
        setTimeout(() => {
          pieceEl.classList.add('snapping');
        }, 80);
      }
    } else {
      pieceEl.classList.add('locked');
    }
  }

  // 若第 5 塊也拼齊，啟動金色接縫交融光芒
  if (seamGlow) {
    if (currentTotalSolved === 5) {
      setTimeout(() => {
        seamGlow.classList.add('ignited');
      }, 700);
      closeBtn.innerHTML = '<span class="btn-shine"></span> 前往秘寶洞窟見證出土 👑 →';
    } else {
      seamGlow.classList.remove('ignited');
      closeBtn.innerHTML = '收起殘卷，航向下一座海島 ⛵';
    }
  }

  // 顯現浮層
  modal.hidden = false;
}

function check() {
  if (!run || run.passed) return;
  if (!run.mine.length) {
    message('⚠️ 先試著在紅線對稱側填入格子，再來檢驗刻印吧！');
    return;
  }
  const signature = [...run.mine].sort().join(';');
  if (signature === lastCheck) {
    message('⚠️ 圖形尚未改動，調整後再行檢驗！');
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
    record('complete', { correct: true });
    refresh();

    // 答對時立即彈出「撕碎藏寶圖拼合儀式」！
    const solvedPieceNum = run.index + 1;
    showTornMapPuzzleModal(solvedPieceNum);

    message(`🎉 刻印完全吻合！獲得 50 枚金幣與第 ${solvedPieceNum} 塊藏寶圖殘卷！`);
    return;
  }

  refresh();
  message(`⚠️ 航海符號有誤：多填了 ${wrong.length} 格，遺漏 ${missing.length} 格。仔細丈量與對稱軸之距離！`);
}

function hint() {
  if (run.passed || run.failures < 2) return;
  run.hints++;
  run.hintStage = Math.min(3, run.hintStage + 1);
  const ans = answer(), missing = [...ans].filter(k => !run.mine.includes(k)), wrong = run.mine.filter(k => !ans.has(k));
  refresh();

  if (run.hintStage === 1) {
    message('🦜 鸚鵡密語：對稱兩格與紅線的垂直距離完全相等！先觀察最貼近紅線之格！');
  } else if (run.hintStage === 2) {
    hintTarget = missing[0] || wrong[0];
    if (hintTarget) {
      cells.get(hintTarget)?.classList.add('pair');
      cells.get(mirror(hintTarget, run.levels[run.index].axis))?.classList.add('pair');
    }
    message('🦜 紫色符印是一組鏡像位置！看看它們各自距離紅線幾格？');
  } else {
    remember();
    if (missing.length) {
      paint(missing[0], true);
      message('🦜 鸚鵡揮舞翅膀為你填入了一格對應格，剩下請自行完成！');
    } else if (wrong.length) {
      paint(wrong[0], false);
      message('🦜 鸚鵡幫你拂去了一個多填的錯誤格，再次檢驗吧！');
    } else {
      message('🦜 卷面已經完全對稱，快按下檢驗藏寶格吧！');
    }
  }

  record('hint', { stage: run.hintStage });
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

  // 重置各元素狀態
  ship.className = 'pirate-galleon';
  hunter.className = 'cine-hunter';
  sparks.className = 'cine-dig-sparks';
  chestVault.className = 'cine-chest-vault';
  geyser.className = 'cine-gold-geyser';

  // 幕 1：黑帆海盜船靠岸
  narrative.textContent = '🌊 血月當空，拼齊藏寶殘卷的海盜船破浪抵達骷髏島秘窟...';
  setTimeout(() => {
    ship.classList.add('arrive');
  }, 100);

  // 幕 2：海盜獵人手提火把與鐵鏟上岸，踏向紅叉印記
  setTimeout(() => {
    narrative.textContent = '🤠 獵人手提搖曳火把與鐵鏟，踏上海灘走向 ✕ 標記處...';
    hunter.classList.add('appear');
    hunter.classList.add('digging');
    sparks.classList.add('sparking');
  }, 2600);

  // 幕 3：泥沙飛濺，地底古老海盜鎖鏈木箱浮出
  setTimeout(() => {
    narrative.textContent = '⛏️ 鐵鏟觸及硬物！沉睡數百年的鐵皮海盜大木箱破土而出！';
    chestVault.classList.add('emerge');
  }, 4400);

  // 幕 4：青銅巨鎖斷裂，古木箱嘎吱掀開，西班牙金幣翡翠萬丈噴發
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
  // 關閉浮層
  if ($('puzzleModal')) $('puzzleModal').hidden = true;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = false;
  $('summary').replaceChildren();
  let completed = Object.entries(run.results);
  $('finalScore').textContent = `收集了全部 ${completed.length} 塊藏寶圖殘卷 · 共奪得 ${completed.reduce((n, [, r]) => n + r.gold, 0)} 枚黃金都布倫幣！`;

  for (const [i, r] of completed) {
    let p = document.createElement('div');
    p.className = 'summary-item';
    p.innerHTML = `<strong>🏝️ 第 ${Number(i) + 1} 島</strong> · ${r.independent ? '🏆 獨立解開鏡像' : '🦜 鸚鵡引導解開'} <span>（重試 ${r.attempts} 次 · 耗時 ${r.seconds} 秒）</span>`;
    $('summary').append(p);
  }

  // 觸發史詩級海盜尋寶動畫
  playEpicPirateTreasureCinematic();
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
  message('步序已回退。');
};

$('clearBtn').onclick = () => {
  if (run.passed || !run.mine.length) return;
  remember();
  run.mine = [];
  refresh();
  message('卷面已滌清。');
};

$('checkBtn').onclick = check;
$('hintBtn').onclick = hint;
$('startBtn').onclick = () => start();
$('menuBtn').onclick = menu;
$('nextBtn').onclick = () => run.index === 4 ? result() : load(run.index + 1);
$('againBtn').onclick = menu;

// 拼圖 Modal 關閉 / 前進按鈕
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

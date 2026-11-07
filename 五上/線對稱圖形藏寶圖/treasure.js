'use strict';

const W = 12, H = 10, VERSION = 4, HISTORY = 'symmetryTreasure.records.v2';
const $ = id => document.getElementById(id);

// 模式狀態：'simple' (方格填色) 或 'advanced' (格點連線)
let selectedMode = 'simple';

// 座標鏡像運算 (簡單模式方格 12x10)
const mirror = (key, axis) => {
  let [r, c] = key.split(',').map(Number);
  return axis === 'V' ? `${r},${W - 1 - c}` : `${H - 1 - r},${c}`;
};

// =========================================================
// 🌟 簡單模式題庫庫存 (35+ 組精緻題型，分 5 個難度階梯) 🌟
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

// =========================================================
// 🌟 進階模式：7x7 格點連線題庫 🌟
// =========================================================
// 格點範圍：x in 0..6, y in 0..6
// 垂直對稱軸：x = 3 (正中央第 4 欄格點)
// 水平對稱軸：y = 3 (正中央第 4 列格點)

const normSeg = (p1, p2) => {
  const s1 = typeof p1 === 'string' ? p1 : `${p1[0]},${p1[1]}`;
  const s2 = typeof p2 === 'string' ? p2 : `${p2[0]},${p2[1]}`;
  return s1 < s2 ? `${s1}_${s2}` : `${s2}_${s1}`;
};

const mirrorDotAdv = (pt, axis) => {
  let [x, y] = typeof pt === 'string' ? pt.split(',').map(Number) : pt;
  return axis === 'V' ? `${6 - x},${y}` : `${x},${6 - y}`;
};

const mirrorSegAdv = (seg, axis) => {
  let [p1, p2] = seg.split('_');
  return normSeg(mirrorDotAdv(p1, axis), mirrorDotAdv(p2, axis));
};

function getSegmentsFromPath(path) {
  const segs = [];
  for (let i = 0; i < path.length - 1; i++) {
    segs.push(normSeg(path[i], path[i + 1]));
  }
  return segs;
}

const ADV_BANK = [
  // Tier 1 (入門：2~3 條線段，基礎折線)
  {
    name: '秘島三角峰',
    tier: 1,
    axis: 'V',
    path: [[3,1],[5,3],[3,5]]
  },
  {
    name: '黃金指南針',
    tier: 1,
    axis: 'V',
    path: [[3,0],[6,3],[3,6]]
  },
  {
    name: '波浪帆影',
    tier: 1,
    axis: 'H',
    path: [[1,3],[3,1],[5,3]]
  },
  {
    name: '西班牙古亭頂',
    tier: 1,
    axis: 'H',
    path: [[1,3],[2,1],[4,1],[5,3]]
  },

  // Tier 2 (初階：3~4 條線段)
  {
    name: '閃電航路',
    tier: 2,
    axis: 'V',
    path: [[3,1],[5,2],[4,3],[6,5],[3,5]]
  },
  {
    name: '海盜先鋒箭',
    tier: 2,
    axis: 'V',
    path: [[3,1],[6,3],[4,3],[4,6],[3,6]]
  },
  {
    name: '古海錨尖端',
    tier: 2,
    axis: 'H',
    path: [[2,3],[2,1],[4,1],[4,3]]
  },
  {
    name: '秘寶菱石半面',
    tier: 2,
    axis: 'V',
    path: [[3,0],[5,1],[6,3],[5,5],[3,6]]
  },

  // Tier 3 (中階：4~5 條線段)
  {
    name: '雙峰海岬',
    tier: 3,
    axis: 'H',
    path: [[1,3],[3,1],[4,1],[5,2],[6,1],[6,3]]
  },
  {
    name: '海燕凌空展翅',
    tier: 3,
    axis: 'H',
    path: [[0,1],[2,2],[3,3],[4,2],[6,1]]
  },
  {
    name: '高腳金聖杯',
    tier: 3,
    axis: 'V',
    path: [[3,1],[5,1],[4,3],[4,5],[5,6],[3,6]]
  },
  {
    name: '海馬圖騰折角',
    tier: 3,
    axis: 'V',
    path: [[3,1],[4,0],[5,1],[4,3],[5,5],[3,5]]
  },

  // Tier 4 (高階：5~6 條線段)
  {
    name: '古城堡城垛',
    tier: 4,
    axis: 'V',
    path: [[3,0],[5,0],[5,2],[4,2],[4,4],[6,4],[6,6],[3,6]]
  },
  {
    name: '西班牙大戰艦',
    tier: 4,
    axis: 'H',
    path: [[0,3],[1,2],[3,2],[3,0],[4,2],[5,2],[6,3]]
  },
  {
    name: '大西洋燈塔輪廓',
    tier: 4,
    axis: 'V',
    path: [[3,0],[4,0],[4,1],[5,2],[4,2],[5,5],[6,6],[3,6]]
  },
  {
    name: '深海海星尖端',
    tier: 4,
    axis: 'H',
    path: [[1,3],[0,1],[2,2],[3,0],[4,2],[6,1],[5,3]]
  },

  // Tier 5 (大師終極：6~7 條線段)
  {
    name: '終極西班牙王冠',
    tier: 5,
    axis: 'H',
    path: [[0,3],[1,1],[2,2],[3,0],[4,2],[5,1],[6,3]]
  },
  {
    name: '骷髏雙刃戰刀',
    tier: 5,
    axis: 'V',
    path: [[3,1],[5,0],[6,2],[4,3],[6,4],[5,6],[3,5]]
  },
  {
    name: '皇家龍雀圖騰',
    tier: 5,
    axis: 'V',
    path: [[3,0],[4,1],[6,1],[5,2],[6,4],[4,4],[5,6],[3,6]]
  }
];

// =========================================================
// 🌟 關卡抽籤生成器 (支援簡單模式與進階模式) 🌟
// =========================================================
function makeLevels(mode) {
  const chosen = [];
  if (mode === 'advanced') {
    // 進階模式：5 個關卡分別對應 Tier 1 ~ Tier 5
    for (let tier = 1; tier <= 5; tier++) {
      const pool = ADV_BANK.filter(item => item.tier === tier);
      const item = pool.length ? pool[Math.floor(Math.random() * pool.length)] : ADV_BANK[0];
      const givenSegs = getSegmentsFromPath(item.path);
      chosen.push({
        id: `adv-t${tier}-${Math.random().toString(36).slice(2, 6)}`,
        tier: tier,
        name: item.name,
        axis: item.axis,
        path: item.path,
        given: givenSegs // 線段陣列：'x1,y1_x2,y2'
      });
    }
  } else {
    // 簡單模式：方格填色
    for (let tier = 1; tier <= 5; tier++) {
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
  }
  return chosen;
}

// =========================================================
// 🌟 遊戲執行階段變數 🌟
// =========================================================
let run = null;
let undo = [];
let stroke = null; // 簡單模式拖曳畫筆
let currentTool = 'draw'; // 'draw' (畫筆) 或 'eraser' (橡皮擦)
let lastCheck = null;
let hintTarget = null;

// 簡單模式方格快取
const cells = new Map();

// 進階模式點線快取與互動狀態
let advActiveDot = null; // 目前選中格點 'x,y'
let advDragStart = null; // 拖曳連線起點 'x,y'
let advHintPair = null;  // 提示點對高亮
let advHintProj = null;  // 提示投影線

function arePointsCollinear(p1, p2, p3) {
  const [x1, y1] = typeof p1 === 'string' ? p1.split(',').map(Number) : p1;
  const [x2, y2] = typeof p2 === 'string' ? p2.split(',').map(Number) : p2;
  const [x3, y3] = typeof p3 === 'string' ? p3.split(',').map(Number) : p3;
  return (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) === 0;
}

// 三點共線自動去除中間點，保留起點和終點兩個點連成一條線
function mergeCollinearSegments(segSet) {
  let segs = [...segSet];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < segs.length; i++) {
      const [a1, a2] = segs[i].split('_');
      for (let j = i + 1; j < segs.length; j++) {
        const [b1, b2] = segs[j].split('_');

        // 檢查 4 個端點是否都在同一直線上
        if (!arePointsCollinear(a1, a2, b1) || !arePointsCollinear(a1, a2, b2)) {
          continue;
        }

        const pts = [a1, a2, b1, b2].map(p => {
          const [x, y] = p.split(',').map(Number);
          return { key: p, x, y };
        });

        const isVert = (pts[0].x === pts[1].x);
        const getCoord = p => isVert ? p.y : p.x;

        const [minA, maxA] = [getCoord(pts[0]), getCoord(pts[1])].sort((a,b)=>a-b);
        const [minB, maxB] = [getCoord(pts[2]), getCoord(pts[3])].sort((a,b)=>a-b);

        // 檢查區間是否相連或重疊
        if (Math.max(minA, minB) <= Math.min(maxA, maxB)) {
          const allCoords = pts.map(p => ({ p: p.key, c: getCoord(p) }));
          allCoords.sort((a,b) => a.c - b.c);
          const startPt = allCoords[0].p;
          const endPt = allCoords[allCoords.length - 1].p;

          const merged = normSeg(startPt, endPt);
          segs.splice(j, 1);
          segs.splice(i, 1);
          segs.push(merged);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return new Set(segs);
}

function answerSimple() {
  return new Set(run.levels[run.index].given.map(k => mirror(k, run.levels[run.index].axis)));
}

function answerAdvanced() {
  const lv = run.levels[run.index];
  const mirrored = lv.given.map(seg => mirrorSegAdv(seg, lv.axis));
  return mergeCollinearSegments(new Set(mirrored));
}

function editableSimple(key) {
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
  const isAdv = run.mode === 'advanced';

  const row = {
    id: crypto.randomUUID(),
    runId: run.id,
    at: new Date().toISOString(),
    kind,
    mode: isAdv ? 'advanced' : 'simple',
    modeLabel: isAdv ? '點線繪圖' : '方格填色',
    level: run.index + 1,
    shapeName: curLevel.name,
    axis: curLevel.axis,
    bankVersion: VERSION,
    given: [...curLevel.given],
    student: { ...run.student },
    cells: isAdv ? [...(run.segments || [])] : [...run.mine],
    target: isAdv ? [...answerAdvanced()] : [...answerSimple()],
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

// =========================================================
// 🌟 遊戲啟動與載入流程 🌟
// =========================================================
function start() {
  run = {
    version: VERSION,
    id: crypto.randomUUID(),
    mode: selectedMode,
    student: {
      className: ($('inClass').value || '').trim() || '未分班',
      name: ($('inName').value || '').trim() || '王小明',
      seat: ($('inSeat').value || '').trim() || '-'
    },
    levels: makeLevels(selectedMode),
    index: 0,
    mine: [], // 簡單模式：填色方格集合
    segments: [], // 進階模式：玩家線段陣列
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
  playBgm();
  $('endScreen').hidden = true;
  $('menuBtn').hidden = false;

  // 切換棋盤容器與圖例顯示
  if (run.mode === 'advanced') {
    $('gridBox').hidden = true;
    $('dotGridBox').hidden = false;
    $('legendSimple').hidden = true;
    $('legendAdvanced').hidden = false;
    $('hudModeLabel').textContent = 'ADVANCED (DOT-LINE)';
    $('drawBtn').innerHTML = '<span class="tool-ic">✏️</span> 連線筆';
  } else {
    $('gridBox').hidden = false;
    $('dotGridBox').hidden = true;
    $('legendSimple').hidden = false;
    $('legendAdvanced').hidden = true;
    $('hudModeLabel').textContent = 'SIMPLE (GRID-FILL)';
    $('drawBtn').innerHTML = '<span class="tool-ic">🖌️</span> 畫筆';
  }

  undo = [];
  lastCheck = null;
  hintTarget = null;
  advActiveDot = null;
  advHintPair = null;
  advHintProj = null;

  build();
  refresh();
}

function menu() {
  stroke = null;
  advActiveDot = null;
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
  if (run.mode === 'advanced') {
    run.segments = run.results[i]?.segments ? [...run.results[i].segments] : [];
  } else {
    run.mine = run.results[i]?.cells ? [...run.results[i].cells] : [];
  }
  run.passed = Boolean(run.results[i]);
  run.failures = 0;
  run.hints = 0;
  run.hintStage = 0;
  run.startedAt = Date.now();
  undo = [];
  lastCheck = null;
  hintTarget = null;
  advActiveDot = null;
  advHintPair = null;
  advHintProj = null;

  build();
  refresh();
  if (run.mode === 'advanced') {
    message(run.passed ? '🎉 此關卡殘卷已收穫！' : '找出題目頂點的對稱點，點選格點連成對稱線段。');
  } else {
    message(run.passed ? '🎉 此關卡殘卷已收穫！' : '先找出對應格，再開始畫。');
  }
}

// 根據模式建立畫布
function build() {
  if (run.mode === 'advanced') {
    buildAdvanced();
  } else {
    buildSimple();
  }
}

// 根據模式重繪介面狀態
function refresh() {
  if (!run) return;
  if (run.mode === 'advanced') {
    refreshAdvanced();
  } else {
    refreshSimple();
  }
}

// =========================================================
// 🌟 簡單模式：方格填色實作 🌟
// =========================================================
function buildSimple() {
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
      b.disabled = !editableSimple(k);
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
            rememberSimple();
            paintSimple(k, !run.mine.includes(k));
            commitStrokeSimple();
          }
        }
      });

      g.append(b);
      cells.set(k, b);
    }
  }
}

function refreshSimple() {
  const lv = run.levels[run.index];
  const given = new Set(lv.given);
  for (const [k, b] of cells) {
    const has = run.mine.includes(k);
    b.classList.toggle('mine', has);
    b.textContent = '';
    b.setAttribute('aria-selected', String(has));
    b.classList.remove('wrong', 'missing', 'pair');
  }

  updateCommonHud();
}

function rememberSimple() {
  undo.push([...run.mine]);
  if (undo.length > 40) undo.shift();
}

function paintSimple(k, value) {
  if (!editableSimple(k) || run.passed) return;
  const m = new Set(run.mine);
  value ? m.add(k) : m.delete(k);
  run.mine = [...m];
  const b = cells.get(k);
  if (b) {
    b.classList.toggle('mine', value);
    b.textContent = '';
    b.classList.remove('wrong', 'missing', 'pair');
    b.setAttribute('aria-selected', String(value));
  }
}

function commitStrokeSimple() {
  stroke = null;
  $('undoBtn').disabled = !undo.length;
}

function hitSimple(e) {
  return document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-key]')?.dataset.key;
}

function beginSimple(e) {
  if (!run || run.mode !== 'simple' || run.passed || stroke || e.button > 0) return;
  const k = hitSimple(e);
  if (!k || !editableSimple(k)) return;
  e.preventDefault();
  rememberSimple();

  const isMine = run.mine.includes(k);
  let paintValue = true;
  if (currentTool === 'eraser') {
    paintValue = false;
    if (isMine) message('已擦除該方格。');
  } else {
    paintValue = true;
    if (!isMine) message('已填入對稱方格。');
  }

  stroke = {
    id: e.pointerId,
    value: paintValue,
    last: k,
    seen: new Set([k])
  };
  $('grid').setPointerCapture(e.pointerId);
  paintSimple(k, stroke.value);
}

function moveSimple(e) {
  if (!stroke || stroke.id !== e.pointerId) return;
  e.preventDefault();
  const k = hitSimple(e);
  if (!k || !editableSimple(k)) return;
  const [a, b] = stroke.last.split(',').map(Number), [r, c] = k.split(',').map(Number);
  const steps = Math.max(Math.abs(r - a), Math.abs(c - b));
  for (let n = 1; n <= steps; n++) {
    let cell = `${Math.round(a + (r - a) * n / steps)},${Math.round(b + (c - b) * n / steps)}`;
    if (!stroke.seen.has(cell)) {
      paintSimple(cell, stroke.value);
      stroke.seen.add(cell);
    }
  }
  stroke.last = k;
}

function finishSimple(e) {
  if (stroke && stroke.id === e.pointerId) commitStrokeSimple();
}

// =========================================================
// 🌟 進階模式：7x7 格點連線幾何繪圖實作 (SVG) 🌟
// =========================================================
const SVG_PAD = 30, SVG_STEP = 60;
const toSvgX = x => SVG_PAD + x * SVG_STEP;
const toSvgY = y => SVG_PAD + y * SVG_STEP;

function buildAdvanced() {
  const svg = $('dotSvg');
  svg.replaceChildren();

  const lv = run.levels[run.index];

  // 1. 底層格線與背景裝飾
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.setAttribute('id', 'svgGridLines');
  // 細虛線底網格 (方便孩子垂直水平對齊)
  for (let i = 0; i < 7; i++) {
    // 橫線
    const hl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hl.setAttribute('x1', toSvgX(0));
    hl.setAttribute('y1', toSvgY(i));
    hl.setAttribute('x2', toSvgX(6));
    hl.setAttribute('y2', toSvgY(i));
    hl.setAttribute('stroke', '#e2d5bd');
    hl.setAttribute('stroke-width', '1');
    hl.setAttribute('stroke-dasharray', '2 4');
    gridGroup.appendChild(hl);

    // 直線
    const vl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vl.setAttribute('x1', toSvgX(i));
    vl.setAttribute('y1', toSvgY(0));
    vl.setAttribute('x2', toSvgX(i));
    vl.setAttribute('y2', toSvgY(6));
    vl.setAttribute('stroke', '#e2d5bd');
    vl.setAttribute('stroke-width', '1');
    vl.setAttribute('stroke-dasharray', '2 4');
    gridGroup.appendChild(vl);
  }
  svg.appendChild(gridGroup);

  // 2. 紅色虛線對稱軸
  const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axisGroup.setAttribute('id', 'svgAxis');
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  axisLine.setAttribute('class', 'axis-svg-line');
  if (lv.axis === 'V') {
    axisLine.setAttribute('x1', toSvgX(3));
    axisLine.setAttribute('y1', 12);
    axisLine.setAttribute('x2', toSvgX(3));
    axisLine.setAttribute('y2', 408);
  } else {
    axisLine.setAttribute('x1', 12);
    axisLine.setAttribute('y1', toSvgY(3));
    axisLine.setAttribute('x2', 408);
    axisLine.setAttribute('y2', toSvgY(3));
  }
  axisGroup.appendChild(axisLine);
  svg.appendChild(axisGroup);

  // 3. 提示輔助層
  const hintGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hintGroup.setAttribute('id', 'svgHintLayer');
  svg.appendChild(hintGroup);

  // 4. 題目線段層
  const givenGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  givenGroup.setAttribute('id', 'svgGivenLines');
  const givenPointsSet = new Set();
  lv.given.forEach(seg => {
    const [p1, p2] = seg.split('_');
    const [x1, y1] = p1.split(',').map(Number);
    const [x2, y2] = p2.split(',').map(Number);
    givenPointsSet.add(p1);
    givenPointsSet.add(p2);

    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', toSvgX(x1));
    l.setAttribute('y1', toSvgY(y1));
    l.setAttribute('x2', toSvgX(x2));
    l.setAttribute('y2', toSvgY(y2));
    l.setAttribute('class', 'given-line');
    givenGroup.appendChild(l);
  });
  // 題目頂點圓
  for (const pt of givenPointsSet) {
    const [x, y] = pt.split(',').map(Number);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', toSvgX(x));
    c.setAttribute('cy', toSvgY(y));
    c.setAttribute('r', '5');
    c.setAttribute('class', 'given-vertex');
    givenGroup.appendChild(c);
  }
  svg.appendChild(givenGroup);

  // 5. 玩家連線層
  const userGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  userGroup.setAttribute('id', 'svgUserLines');
  svg.appendChild(userGroup);

  // 6. 預覽橡皮筋拉線
  const prevLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  prevLine.setAttribute('id', 'svgPreviewLine');
  prevLine.setAttribute('class', 'preview-line');
  prevLine.setAttribute('hidden', '');
  svg.appendChild(prevLine);

  // 7. 格點本體與點擊熱區層 (7x7 = 49 點)
  const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dotsGroup.setAttribute('id', 'svgDots');
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'dot-unit');
      g.dataset.dot = `${x},${y}`;

      // 實心點
      const pt = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pt.setAttribute('cx', toSvgX(x));
      pt.setAttribute('cy', toSvgY(y));
      pt.setAttribute('r', '3.5');
      pt.setAttribute('class', 'dot-point');
      pt.setAttribute('id', `dotPoint_${x}_${y}`);

      // 點擊判定大熱區 (半徑 22px，極好點選)
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hit.setAttribute('cx', toSvgX(x));
      hit.setAttribute('cy', toSvgY(y));
      hit.setAttribute('r', '22');
      hit.setAttribute('class', 'dot-hit');
      hit.dataset.dot = `${x},${y}`;

      g.appendChild(pt);
      g.appendChild(hit);
      dotsGroup.appendChild(g);
    }
  }
  svg.appendChild(dotsGroup);

  renderAdvancedUserLines();
}

// 繪製玩家目前畫好的線段
function renderAdvancedUserLines() {
  const userGroup = $('svgUserLines');
  if (!userGroup) return;
  userGroup.replaceChildren();

  const userPts = new Set();
  (run.segments || []).forEach(seg => {
    const [p1, p2] = seg.split('_');
    const [x1, y1] = p1.split(',').map(Number);
    const [x2, y2] = p2.split(',').map(Number);
    userPts.add(p1);
    userPts.add(p2);

    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', toSvgX(x1));
    l.setAttribute('y1', toSvgY(y1));
    l.setAttribute('x2', toSvgX(x2));
    l.setAttribute('y2', toSvgY(y2));
    l.setAttribute('class', 'user-line');
    l.dataset.seg = seg;
    // 點擊已畫好的線段：橡皮擦模式擦除；畫筆模式提示
    l.addEventListener('click', e => {
      e.stopPropagation();
      if (run.passed) return;
      if (currentTool === 'eraser') {
        deleteAdvancedSegment(seg);
      } else {
        message('💡 線段已固定。若想擦除，請切換至「🧹 橡皮擦」工具或點擊「復原」。');
      }
    });
    userGroup.appendChild(l);
  });

  // 玩家連線的頂點
  for (const pt of userPts) {
    const [x, y] = pt.split(',').map(Number);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', toSvgX(x));
    c.setAttribute('cy', toSvgY(y));
    c.setAttribute('r', '5.5');
    c.setAttribute('class', 'user-vertex');
    userGroup.appendChild(c);
  }

  // 渲染高亮或活動點光環
  renderActiveDotRing();
}

// 渲染當前選取點的光環與提示線
function renderActiveDotRing() {
  const hintGroup = $('svgHintLayer');
  if (!hintGroup) return;
  hintGroup.replaceChildren();

  // 1. 若有分步提示的光環與投影輔助線
  if (advHintPair) {
    const { pGiven, pTarget } = advHintPair;
    const [gx, gy] = pGiven.split(',').map(Number);
    const [tx, ty] = pTarget.split(',').map(Number);

    // 投影虛線連接對稱點
    const projLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    projLine.setAttribute('x1', toSvgX(gx));
    projLine.setAttribute('y1', toSvgY(gy));
    projLine.setAttribute('x2', toSvgX(tx));
    projLine.setAttribute('y2', toSvgY(ty));
    projLine.setAttribute('class', 'hint-proj-line');
    hintGroup.appendChild(projLine);

    // 紫色提示光圈
    [pGiven, pTarget].forEach(p => {
      const [x, y] = p.split(',').map(Number);
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', toSvgX(x));
      ring.setAttribute('cy', toSvgY(y));
      ring.setAttribute('class', 'dot-pair-ring');
      hintGroup.appendChild(ring);
    });
  }

  // 2. 若玩家有點選一個起點
  if (advActiveDot) {
    const [ax, ay] = advActiveDot.split(',').map(Number);
    const actRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    actRing.setAttribute('cx', toSvgX(ax));
    actRing.setAttribute('cy', toSvgY(ay));
    actRing.setAttribute('class', 'dot-active-ring');
    hintGroup.appendChild(actRing);
  }
}

function refreshAdvanced() {
  renderAdvancedUserLines();
  updateCommonHud();
}

function rememberAdvanced() {
  undo.push([...(run.segments || [])]);
  if (undo.length > 40) undo.shift();
}

// 新增一條線段 (支援三點共線自動合併中繼點)
function addAdvancedSegment(p1, p2) {
  if (p1 === p2 || run.passed) return;
  const seg = normSeg(p1, p2);
  let currentSegs = new Set(run.segments || []);
  if (currentSegs.has(seg)) return; // 已經連過則不重複連

  rememberAdvanced();
  currentSegs.add(seg);
  // 三點共線自動去除中間點，保留起點和終點兩個點連成一條線
  currentSegs = mergeCollinearSegments(currentSegs);
  run.segments = [...currentSegs];
  refreshAdvanced();
}

// 刪除/擦除指定線段
function deleteAdvancedSegment(seg) {
  if (run.passed) return;
  rememberAdvanced();
  const currentSegs = new Set(run.segments || []);
  if (currentSegs.has(seg)) {
    currentSegs.delete(seg);
    run.segments = [...currentSegs];
    refreshAdvanced();
    message('已擦除該條線段。');
  }
}

// 處理點選格點 (選兩點連成一條線，然後要再選兩點才會畫出一條新線)
function handleDotClick(dotKey) {
  if (run.passed) return;

  if (currentTool === 'eraser') {
    message('橡皮擦模式中：請點選要擦除的線段，或切換回「🖌️ 畫筆」繼續連線。');
    return;
  }

  if (!advActiveDot) {
    advActiveDot = dotKey;
    renderActiveDotRing();
    message('已選取起點，請點選第 2 個格點完成連線。');
  } else if (advActiveDot === dotKey) {
    // 點擊同一點取消選取起點
    advActiveDot = null;
    renderActiveDotRing();
    message('已取消選取起點。');
  } else {
    // 點選第二個點：連成一條線！
    addAdvancedSegment(advActiveDot, dotKey);
    // 連完後起點重設為空，必須再選兩個點才會畫出一條新線！
    advActiveDot = null;
    renderActiveDotRing();
    message('已連成一條線段！請再選取兩個格點畫下一條線。');
  }
}

// 綁定 SVG 互動事件 (點擊與拖曳連線)
(function bindDotSvgEvents() {
  const svg = $('dotSvg');
  if (!svg) return;

  function getHitDotFromEvent(e) {
    return document.elementFromPoint(e.clientX, e.clientY)?.closest('.dot-hit')?.dataset.dot;
  }

  function getSvgCoords(e) {
    const rect = svg.getBoundingClientRect();
    const scale = 420 / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale
    };
  }

  svg.addEventListener('pointerdown', e => {
    if (!run || run.mode !== 'advanced' || run.passed || e.button > 0) return;
    const hitDot = getHitDotFromEvent(e);
    if (!hitDot) return;

    advDragStart = {
      dot: hitDot,
      pointerId: e.pointerId
    };
    svg.setPointerCapture(e.pointerId);

    const prev = $('svgPreviewLine');
    if (prev) {
      const [x, y] = hitDot.split(',').map(Number);
      prev.setAttribute('x1', toSvgX(x));
      prev.setAttribute('y1', toSvgY(y));
      prev.setAttribute('x2', toSvgX(x));
      prev.setAttribute('y2', toSvgY(y));
      prev.removeAttribute('hidden');
    }
  });

  svg.addEventListener('pointermove', e => {
    if (!advDragStart || advDragStart.pointerId !== e.pointerId) return;
    const prev = $('svgPreviewLine');
    if (prev) {
      const pt = getSvgCoords(e);
      prev.setAttribute('x2', pt.x);
      prev.setAttribute('y2', pt.y);
    }
  });

  function endDrag(e) {
    if (!advDragStart || advDragStart.pointerId !== e.pointerId) return;
    const startDot = advDragStart.dot;
    advDragStart = null;

    const prev = $('svgPreviewLine');
    if (prev) prev.setAttribute('hidden', '');

    const endDot = getHitDotFromEvent(e);
    if (endDot && endDot !== startDot) {
      if (currentTool === 'eraser') {
        message('橡皮擦模式中：請點選要擦除的線段。');
        return;
      }
      // 拖曳成功連線
      addAdvancedSegment(startDot, endDot);
      advActiveDot = null;
      renderActiveDotRing();
      message('已連成一條線段！請再選取兩個格點畫下一條線。');
    } else {
      // 若是原地放開，視為純點擊行為
      handleDotClick(startDot);
    }
  }

  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
})();

// =========================================================
// 🌟 通用 HUD 與進度更新 🌟
// =========================================================
function updateCommonHud() {
  const lv = run.levels[run.index];
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

  // 關卡進度指示
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

// =========================================================
// 🌟 檢查藏寶圖 (Check) 🌟
// =========================================================
function check() {
  if (!run || run.passed) return;

  if (run.mode === 'advanced') {
    checkAdvanced();
  } else {
    checkSimple();
  }
}

function checkSimple() {
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

  const ans = answerSimple();
  const wrong = run.mine.filter(k => !ans.has(k));
  const missing = [...ans].filter(k => !run.mine.includes(k));

  if (wrong.length || missing.length) run.failures++;

  record('check', { wrong, missing, correct: !wrong.length && !missing.length });

  if (!wrong.length && !missing.length) {
    onLevelPassed();
    return;
  }

  refreshSimple();
  message(`⚠️ 還不太對稱：多畫了 ${wrong.length} 格，漏畫了 ${missing.length} 格。請仔細檢查與對稱軸的距離！`);
}

function checkAdvanced() {
  const currentSegs = run.segments || [];
  if (!currentSegs.length) {
    message('⚠️ 先試著點選格點連出對稱線段，再來檢查吧！');
    return;
  }
  const signature = [...currentSegs].sort().join(';');
  if (signature === lastCheck) {
    message('⚠️ 線段尚未改動，調整後再行檢查！');
    return;
  }
  lastCheck = signature;

  const ans = answerAdvanced();
  const userSet = new Set(currentSegs);
  const wrong = currentSegs.filter(s => !ans.has(s));
  const missing = [...ans].filter(s => !userSet.has(s));

  if (wrong.length || missing.length) run.failures++;

  record('check', { wrong, missing, correct: !wrong.length && !missing.length });

  if (!wrong.length && !missing.length) {
    onLevelPassed();
    return;
  }

  refreshAdvanced();
  message(`⚠️ 還差一點點喔！多連了 ${wrong.length} 條線，漏連了 ${missing.length} 條線。請仔細比對各頂點到對稱軸的垂直距離！`);
}

function onLevelPassed() {
  run.passed = true;
  advActiveDot = null;
  advHintPair = null;
  const isFirstTime = !progress();
  if (isFirstTime) {
    run.results[run.index] = {
      cells: [...run.mine],
      segments: [...(run.segments || [])],
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
}

// =========================================================
// 🌟 分步提示 (Hint) 🌟
// 規則：
// 1. 第一次按：清空玩家畫的內容，直接幫畫第 1 步正確位置。
// 2. 第二次、第三次及之後按：將畫錯的清空（保留畫對的），再多給一步正確位置。
// =========================================================
function hint() {
  if (run.passed || run.failures < 2) return;
  run.hints++;

  if (run.mode === 'advanced') {
    hintAdvanced();
  } else {
    hintSimple();
  }
}

function hintSimple() {
  rememberSimple();
  const ans = answerSimple(); // 正確方格集合

  if (run.hints === 1) {
    // 第一次按提示：自動把玩家畫的東西先清空，然後直接幫忙畫一步
    run.mine = [];
    const firstCell = [...ans][0];
    if (firstCell) {
      run.mine = [firstCell];
    }
    refreshSimple();
    message('💡 已為你清空卷面，並直接標出第 1 格正確的對稱位置！請接著完成。');
    record('hint', { stage: 1, action: 'clear_and_give_first', cell: firstCell });
  } else {
    // 第二次、第三次...之後：把玩家畫錯的清空，再給他一步正確的
    const validMine = run.mine.filter(k => ans.has(k));
    const wrongCount = run.mine.length - validMine.length;

    // 找出尚未畫出的正確格
    const missing = [...ans].filter(k => !validMine.includes(k));
    let addedCell = null;
    if (missing.length > 0) {
      addedCell = missing[0];
      validMine.push(addedCell);
    }

    run.mine = validMine;
    refreshSimple();

    if (missing.length === 0) {
      message('💡 已經全部為你完成對稱格，快按下檢查藏寶圖吧！');
    } else if (wrongCount > 0) {
      message(`💡 已清除 ${wrongCount} 個畫錯的格子，並再為你補上一格正確對稱格！`);
    } else {
      message('💡 已再為你補上一步正確的對稱格，請繼續完成！');
    }

    record('hint', { stage: run.hints, action: 'clear_wrong_and_give_step', wrongCleared: wrongCount, cell: addedCell });
  }
}

function hintAdvanced() {
  rememberAdvanced();
  const ans = answerAdvanced(); // 正確線段集合

  if (run.hints === 1) {
    // 第一次按提示：自動把玩家畫的東西先清空，然後直接幫忙畫一步
    run.segments = [];
    advActiveDot = null;
    advHintPair = null;
    const firstSeg = [...ans][0];
    if (firstSeg) {
      run.segments = [firstSeg];
    }
    refreshAdvanced();
    message('💡 已為你清空畫布，並直接連出第 1 條正確的對稱線段！請接著完成。');
    record('hint', { stage: 1, action: 'clear_and_give_first', segment: firstSeg });
  } else {
    // 第二次、第三次...之後：把玩家連錯的清空，再給他一步正確的
    advActiveDot = null;
    advHintPair = null;
    const currentSegs = run.segments || [];
    const validSegs = currentSegs.filter(s => ans.has(s));
    const wrongCount = currentSegs.length - validSegs.length;

    // 找出尚未連上的正確線段
    const missing = [...ans].filter(s => !validSegs.includes(s));
    let addedSeg = null;
    if (missing.length > 0) {
      addedSeg = missing[0];
      validSegs.push(addedSeg);
    }

    run.segments = validSegs;
    refreshAdvanced();

    if (missing.length === 0) {
      message('💡 已經全部為你連好對稱線段，快按下檢查藏寶圖吧！');
    } else if (wrongCount > 0) {
      message(`💡 已清除 ${wrongCount} 條連錯的線段，並再為你連上一條正確線段！`);
    } else {
      message('💡 已再為你連上一條正確的對稱線段，請繼續完成！');
    }

    record('hint', { stage: run.hints, action: 'clear_wrong_and_give_step', wrongCleared: wrongCount, segment: addedSeg });
  }
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
  advActiveDot = null;
  if ($('puzzleModal')) $('puzzleModal').hidden = true;
  $('gameScreen').hidden = true;
  $('endScreen').hidden = false;
  $('summary').replaceChildren();
  let completed = Object.entries(run.results);
  const modeName = run.mode === 'advanced' ? '點線繪圖' : '方格填色';
  $('finalScore').textContent = `【${modeName}】收集了全部 ${completed.length} 塊藏寶圖殘卷 · 共奪得 ${completed.reduce((n, [, r]) => n + r.gold, 0)} 枚金幣！`;

  for (const [i, r] of completed) {
    let p = document.createElement('div');
    p.className = 'summary-item';
    p.innerHTML = `<strong>🏝️ 第 ${Number(i) + 1} 關 (${run.levels[i].name})</strong> · ${r.independent ? '🏆 獨立解開' : '💡 提示輔助'} <span>（重試 ${r.attempts} 次 · 耗時 ${r.seconds} 秒）</span>`;
    $('summary').append(p);
  }

  playEpicPirateTreasureCinematic();
}

// =========================================================
// 🌟 事件綁定與初始化 🌟
// =========================================================

// 模式切換按鈕
const modeSimpleBtn = $('modeBtnSimple');
const modeAdvBtn = $('modeBtnAdvanced');

if (modeSimpleBtn && modeAdvBtn) {
  modeSimpleBtn.onclick = () => {
    selectedMode = 'simple';
    modeSimpleBtn.classList.add('active');
    modeAdvBtn.classList.remove('active');
  };
  modeAdvBtn.onclick = () => {
    selectedMode = 'advanced';
    modeAdvBtn.classList.add('active');
    modeSimpleBtn.classList.remove('active');
  };
}

// 簡單模式棋盤事件
$('grid').addEventListener('pointerdown', beginSimple);
$('grid').addEventListener('pointermove', moveSimple);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('grid').addEventListener(type, finishSimple);
}
// 防止行動裝置作圖時觸發網頁上下滾動
['grid', 'dotSvg'].forEach(id => {
  const el = $(id);
  if (el) {
    el.addEventListener('touchmove', e => {
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  }
});

// 工具列按鈕
$('drawBtn').onclick = () => {
  currentTool = 'draw';
  $('drawBtn').setAttribute('aria-pressed', 'true');
  $('eraseBtn')?.setAttribute('aria-pressed', 'false');
  advActiveDot = null;
  renderActiveDotRing();
  if (run && run.mode === 'advanced') {
    message('🖌️ 畫筆已備妥：請點選兩個格點連成線段。');
  } else {
    message('🖌️ 畫筆已備妥：點選方格進行填色。');
  }
};

$('eraseBtn').onclick = () => {
  currentTool = 'eraser';
  $('eraseBtn')?.setAttribute('aria-pressed', 'true');
  $('drawBtn').setAttribute('aria-pressed', 'false');
  advActiveDot = null;
  renderActiveDotRing();
  if (run && run.mode === 'advanced') {
    message('🧹 橡皮擦已備妥：點選想刪除的線段即可擦除。');
  } else {
    message('🧹 橡皮擦已備妥：點選已填色的方格即可擦除。');
  }
};

$('undoBtn').onclick = () => {
  if (run.passed || !undo.length) return;
  if (run.mode === 'advanced') {
    run.segments = undo.pop();
    advActiveDot = null;
    advHintPair = null;
    refreshAdvanced();
  } else {
    run.mine = undo.pop();
    refreshSimple();
  }
  message('已復原上一步。');
};

$('clearBtn').onclick = () => {
  if (run.passed) return;
  if (run.mode === 'advanced') {
    if (!run.segments || !run.segments.length) return;
    rememberAdvanced();
    run.segments = [];
    advActiveDot = null;
    advHintPair = null;
    refreshAdvanced();
    message('畫布已全部清除。');
  } else {
    if (!run.mine.length) return;
    rememberSimple();
    run.mine = [];
    refreshSimple();
    message('卷面已全部清除。');
  }
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

// =========================================================
// 🌟 背景音樂管理器 (La Recherche du Trésor) 🌟
// =========================================================
let bgmAudio = null;
let bgmManualMute = false;

function initBgm() {
  if (bgmAudio) return bgmAudio;
  bgmAudio = new Audio('La%20Recherche%20du%20Tr%C3%A9sor.mp3');
  bgmAudio.loop = true;
  bgmAudio.volume = 0.35;
  return bgmAudio;
}

function playBgm() {
  if (bgmManualMute) return;
  const audio = initBgm();
  audio.play().then(() => {
    updateBgmBtn();
  }).catch(() => {
    // 瀏覽器自動播放限制，待使用者首次互動後播放
  });
}

function toggleBgm() {
  const audio = initBgm();
  if (audio.paused) {
    bgmManualMute = false;
    audio.play().then(() => {
      updateBgmBtn();
    }).catch(e => console.log('BGM error:', e));
  } else {
    bgmManualMute = true;
    audio.pause();
    updateBgmBtn();
  }
}

function updateBgmBtn() {
  const btn = $('bgmToggleBtn');
  if (!btn) return;
  const isPlaying = bgmAudio && !bgmAudio.paused;
  btn.innerHTML = isPlaying ? '🎵 音樂' : '🔇 靜音';
  btn.style.opacity = isPlaying ? '1' : '0.65';
}

if ($('bgmToggleBtn')) {
  $('bgmToggleBtn').onclick = toggleBgm;
}

// 使用者與頁面首次互動即自動啟動背景音樂
document.addEventListener('pointerdown', () => {
  if (!bgmManualMute && (!bgmAudio || bgmAudio.paused)) {
    playBgm();
  }
}, { once: true });

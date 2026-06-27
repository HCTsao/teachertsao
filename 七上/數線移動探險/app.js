// ==========================================================================
// 數線移動探險 - 遊戲邏輯控制 (app.js)
// ==========================================================================

// Web Audio API 音效合成器
class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playJump() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.quadraticRampToValueAtTime(440, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playSuccess() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.4);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  playError() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(133, now); // Detuned

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

    osc1.start();
    osc1.stop(now + 0.35);
    osc2.start();
    osc2.stop(now + 0.35);
  }
}

const synth = new SoundSynth();

// DOM 元素快取
const DOM = {
  startScreen: document.getElementById('start-screen'),
  gameScreen: document.getElementById('game-screen'),
  resultScreen: document.getElementById('result-screen'),
  
  btnModePractice: document.getElementById('btn-mode-practice'),
  btnModeChallenge: document.getElementById('btn-mode-challenge'),
  btnStartGame: document.getElementById('btn-start-game'),

  infoModeText: document.getElementById('info-mode-text'),
  infoProgressText: document.getElementById('info-progress-text'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  infoScoreBox: document.getElementById('info-score-box'),
  infoScoreVal: document.getElementById('info-score-val'),
  infoTimerBox: document.getElementById('info-timer-box'),
  infoTimerVal: document.getElementById('info-timer-val'),

  questionEquation: document.getElementById('question-equation'),
  numberLineTicks: document.getElementById('number-line-ticks-container'),
  numberLineWrapper: document.querySelector('.number-line-wrapper'),
  displacementSvg: document.getElementById('displacement-svg'),
  displacementPath: document.getElementById('displacement-path'),
  displacementPathCorrect: document.getElementById('displacement-path-correct'),
  pawn: document.getElementById('game-pawn'),

  stepStartCard: document.getElementById('step-start-card'),
  selectedStartVal: document.getElementById('selected-start-val'),
  stepStartStatus: document.getElementById('step-start-status'),

  stepMoveCard: document.getElementById('step-move-card'),
  inputSteps: document.getElementById('input-steps'),
  stepMoveStatus: document.getElementById('step-move-status'),

  stepAnswerCard: document.getElementById('step-answer-card'),
  inputFinalAnswer: document.getElementById('input-final-answer'),
  finalAnswerFormulaHint: document.getElementById('final-answer-formula-hint'),
  stepAnswerStatus: document.getElementById('step-answer-status'),
  stepAnswerGuidance: document.getElementById('step-answer-guidance'),

  stepStartGuidance: document.getElementById('step-start-guidance'),
  stepMoveGuidance: document.getElementById('step-move-guidance'),

  btnSubmit: document.getElementById('btn-submit'),
  btnNext: document.getElementById('btn-next'),

  feedbackPanel: document.getElementById('feedback-panel'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackText: document.getElementById('feedback-text'),

  resultBadgeIcon: document.getElementById('result-badge-icon'),
  resultTitle: document.getElementById('result-title'),
  resultBadgeName: document.getElementById('result-badge-name'),
  resultTotalQuestions: document.getElementById('result-total-questions'),
  resultCorrectCount: document.getElementById('result-correct-count'),
  resultAccuracy: document.getElementById('result-accuracy'),
  resultTotalTime: document.getElementById('result-total-time'),
  btnRematch: document.getElementById('btn-rematch'),
  btnHome: document.getElementById('btn-home')
};

// 全域狀態機
const GAME_STATE = {
  mode: 'practice', // practice | challenge
  questionIndex: 0,
  score: 0,
  correctCount: 0,
  currentQuestion: null,
  
  userAnswer: {
    start: null,
    dir: null, // left | right
    steps: null,
    finalAnswer: null
  },
  
  challengeTimer: null,
  challengeStartTime: 0,
  challengeTotalTime: 0,
  
  roundTypes: [],
  isProcessingAnswer: false
};

// ==========================================================================
// 初始化設置
// ==========================================================================
function initApp() {
  generateNumberLineTicks();
  setupEventListeners();
  window.addEventListener('resize', () => {
    if (GAME_STATE.userAnswer.start !== null) {
      movePawnToValue(GAME_STATE.userAnswer.start, true);
    }
    // 重繪位移箭頭
    if (GAME_STATE.currentQuestion && GAME_STATE.isProcessingAnswer) {
      drawDisplacementCurve(GAME_STATE.currentQuestion.start, GAME_STATE.currentQuestion.dest, true);
    }
  });
}

// 建立數線刻度
function generateNumberLineTicks() {
  DOM.numberLineTicks.innerHTML = '';
  for (let i = -10; i <= 10; i++) {
    const node = document.createElement('div');
    node.className = 'tick-node';
    node.dataset.val = i;
    
    if (i < 0) node.classList.add('is-negative');
    if (i > 0) node.classList.add('is-positive');
    
    node.innerHTML = `
      <div class="tick-line"></div>
      <span class="tick-label">${i}</span>
    `;
    
    node.addEventListener('click', () => handleTickClick(i));
    DOM.numberLineTicks.appendChild(node);
  }
}

// 處理數線刻度點選
function handleTickClick(val) {
  if (GAME_STATE.isProcessingAnswer) return;
  synth.playClick();
  
  // 紀錄選擇的起點
  GAME_STATE.userAnswer.start = val;
  
  // 更新刻度高亮樣式
  const tickNodes = DOM.numberLineTicks.querySelectorAll('.tick-node');
  tickNodes.forEach(node => {
    if (parseInt(node.dataset.val) === val) {
      node.classList.add('selected-start');
    } else {
      node.classList.remove('selected-start');
    }
  });

  // 更新步驟一顯示文字與樣式
  DOM.selectedStartVal.innerText = val >= 0 ? `+${val}` : val;
  DOM.selectedStartVal.className = 'chosen';
  DOM.stepStartCard.classList.add('success');
  DOM.stepStartStatus.innerHTML = '✅';

  // 開啟步驟二輸入限制
  DOM.stepMoveCard.classList.remove('disabled');
  DOM.stepMoveCard.classList.add('active');
  
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => btn.disabled = false);
  DOM.inputSteps.disabled = false;

  // 移動棋子到點選起點位置
  movePawnToValue(val, false);

  // 清空步驟二的先前狀態，並重置步驟三
  DOM.stepMoveCard.classList.remove('success', 'error');
  DOM.stepMoveStatus.innerHTML = '';
  resetStep3();
}

// 動態搬移棋子 (棋子定位)
function movePawnToValue(val, immediate = false, isJump = false) {
  const wrapperWidth = DOM.numberLineWrapper.clientWidth;
  const usableWidth = wrapperWidth - 60; // 左右各 30px 的 padding 範圍
  const percentage = (val + 10) / 20;
  const leftPos = 30 + percentage * usableWidth;
  
  const pawn = DOM.pawn;
  pawn.style.display = 'flex';
  
  if (immediate) {
    pawn.style.transition = 'none';
  } else {
    pawn.style.transition = 'left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }
  
  pawn.style.left = `${leftPos}px`;
  
  if (isJump) {
    pawn.classList.add('jumping');
    synth.playJump();
    setTimeout(() => {
      pawn.classList.remove('jumping');
    }, 350);
  }
}

// 繪製位移弧線箭頭
function drawDisplacementCurve(startVal, endVal, isCorrectResult = false) {
  const wrapperWidth = DOM.numberLineWrapper.clientWidth;
  const usableWidth = wrapperWidth - 60;
  
  const x1 = 30 + ((startVal + 10) / 20) * usableWidth;
  const x2 = 30 + ((endVal + 10) / 20) * usableWidth;
  const y = 60; // 數線軸高度中點
  
  const dist = Math.abs(x2 - x1);
  const peakY = y - Math.min(55, dist * 0.3) - 15; // 位移量越大，弧線拱得越高
  
  const pathD = `M ${x1} ${y} Q ${(x1 + x2) / 2} ${peakY} ${x2} ${y}`;
  
  if (isCorrectResult) {
    DOM.displacementPathCorrect.setAttribute('d', pathD);
    DOM.displacementPathCorrect.style.display = 'block';
    DOM.displacementPath.style.display = 'none';
  } else {
    DOM.displacementPath.setAttribute('d', pathD);
    DOM.displacementPath.style.display = 'block';
    DOM.displacementPathCorrect.style.display = 'none';
  }
}

// 清除位移弧線
function clearDisplacementCurve() {
  DOM.displacementPath.style.display = 'none';
  DOM.displacementPathCorrect.style.display = 'none';
}

// ==========================================================================
// 監聽事件設定
// ==========================================================================
function setupEventListeners() {
  // 模式切換按鈕
  DOM.btnModePractice.addEventListener('click', () => {
    synth.playClick();
    DOM.btnModePractice.classList.add('active');
    DOM.btnModeChallenge.classList.remove('active');
    GAME_STATE.mode = 'practice';
  });

  DOM.btnModeChallenge.addEventListener('click', () => {
    synth.playClick();
    DOM.btnModeChallenge.classList.add('active');
    DOM.btnModePractice.classList.remove('active');
    GAME_STATE.mode = 'challenge';
  });

  // 啟動遊戲
  DOM.btnStartGame.addEventListener('click', startGame);

  // 步驟二方向按鈕 — 選方向後開啟步驟三
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      synth.playClick();
      dirBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GAME_STATE.userAnswer.dir = btn.dataset.dir;
      unlockStep3();
    });
  });

  // 輸入格數後也要確保步驟三開啟
  DOM.inputSteps.addEventListener('input', () => {
    if (GAME_STATE.userAnswer.dir && DOM.inputSteps.value) {
      unlockStep3();
    }
  });

  // 最終答案欄位輸入後顯示送出按鈕
  DOM.inputFinalAnswer.addEventListener('input', () => {
    if (DOM.inputFinalAnswer.value !== '') {
      DOM.btnSubmit.style.display = 'block';
    } else {
      DOM.btnSubmit.style.display = 'none';
    }
  });

  // 送出答案
  DOM.btnSubmit.addEventListener('click', verifyAnswer);

  // 下一題
  DOM.btnNext.addEventListener('click', nextQuestion);

  // 結算畫面按鈕
  DOM.btnRematch.addEventListener('click', startGame);
  DOM.btnHome.addEventListener('click', () => {
    synth.playClick();
    showScreen(DOM.startScreen);
  });
}

// 重置步驟三到 disabled 狀態
function resetStep3() {
  DOM.stepAnswerCard.className = 'step-card disabled';
  DOM.stepAnswerStatus.innerHTML = '';
  DOM.stepAnswerGuidance.classList.add('hidden');
  DOM.stepAnswerGuidance.innerText = '';
  DOM.inputFinalAnswer.value = '';
  DOM.inputFinalAnswer.disabled = true;
  DOM.btnSubmit.style.display = 'none';
  GAME_STATE.userAnswer.finalAnswer = null;
}

// 解鎖步驟三
function unlockStep3() {
  const q = GAME_STATE.currentQuestion;
  DOM.stepAnswerCard.classList.remove('disabled');
  DOM.stepAnswerCard.classList.add('active');
  DOM.stepAnswerCard.classList.remove('success', 'error');
  DOM.stepAnswerStatus.innerHTML = '';
  DOM.inputFinalAnswer.disabled = false;
  // 顯示公式提示
  if (q) DOM.finalAnswerFormulaHint.innerText = q.formula;
}

// 畫面顯示切換
function showScreen(targetScreen) {
  DOM.startScreen.classList.remove('active');
  DOM.gameScreen.classList.remove('active');
  DOM.resultScreen.classList.remove('active');
  targetScreen.classList.add('active');
}

// ==========================================================================
// 遊戲核心流程
// ==========================================================================
function generateRoundTypes() {
  const base = [1, 2, 3, 4, 5, 6, 7];
  const extras = [];
  for (let i = 0; i < 3; i++) {
    extras.push(Math.floor(Math.random() * 7) + 1);
  }
  const combined = base.concat(extras);
  // Shuffle combined
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined;
}

function startGame() {
  synth.playClick();

  // 重置狀態
  GAME_STATE.questionIndex = 0;
  GAME_STATE.score = 0;
  GAME_STATE.correctCount = 0;
  GAME_STATE.isProcessingAnswer = false;
  GAME_STATE.roundTypes = generateRoundTypes();
  
  GAME_STATE.challengeStartTime = Date.now();
  if (GAME_STATE.mode === 'challenge') {
    DOM.infoScoreBox.style.display = 'block';
    DOM.infoTimerBox.style.display = 'block';
    DOM.infoModeText.innerText = '🏆 冒險挑戰模式';
    startChallengeTimer();
  } else {
    DOM.infoScoreBox.style.display = 'none';
    DOM.infoTimerBox.style.display = 'none';
    DOM.infoModeText.innerText = '💡 自由練習模式';
  }

  showScreen(DOM.gameScreen);
  loadQuestion();
}

// 計時器啟動
function startChallengeTimer() {
  clearInterval(GAME_STATE.challengeTimer);
  DOM.infoTimerVal.innerText = '0.0s';
  GAME_STATE.challengeTimer = setInterval(() => {
    const sec = ((Date.now() - GAME_STATE.challengeStartTime) / 1000).toFixed(1);
    DOM.infoTimerVal.innerText = `${sec}s`;
  }, 100);
}

// 載入題目
function loadQuestion() {
  // 生成新題目
  GAME_STATE.currentQuestion = generateQuestion();
  
  // 重置使用者回答
  GAME_STATE.userAnswer = { start: null, dir: null, steps: null };
  GAME_STATE.isProcessingAnswer = false;

  // 介面復原
  DOM.questionEquation.innerText = `${GAME_STATE.currentQuestion.formula} = ?`;
  
  // 重置數線高亮與隱藏棋子
  const tickNodes = DOM.numberLineTicks.querySelectorAll('.tick-node');
  tickNodes.forEach(node => node.classList.remove('selected-start'));
  DOM.pawn.style.display = 'none';
  clearDisplacementCurve();

  // 重置問答步驟卡片
  DOM.selectedStartVal.innerText = '請點擊數線刻度';
  DOM.selectedStartVal.className = 'placeholder-val';
  DOM.stepStartCard.className = 'step-card active';
  DOM.stepStartStatus.innerHTML = '';
  DOM.stepStartGuidance.classList.add('hidden');
  DOM.stepStartGuidance.innerText = '';

  DOM.stepMoveCard.className = 'step-card disabled';
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('active');
  });
  DOM.inputSteps.value = '';
  DOM.inputSteps.disabled = true;
  DOM.stepMoveStatus.innerHTML = '';
  DOM.stepMoveGuidance.classList.add('hidden');
  DOM.stepMoveGuidance.innerText = '';

  resetStep3();
  DOM.btnNext.style.display = 'none';
  DOM.feedbackPanel.classList.add('hidden');

  // 更新進度條
  DOM.infoProgressText.innerText = `第 ${GAME_STATE.questionIndex + 1} / 10 題`;
  DOM.progressBarFill.style.width = `${((GAME_STATE.questionIndex + 1) / 10) * 100}%`;
  if (GAME_STATE.mode === 'challenge') {
    DOM.infoScoreVal.innerText = GAME_STATE.score;
  }
}

// 題型隨機生成器
function generateQuestion() {
  const chosenType = GAME_STATE.roundTypes[GAME_STATE.questionIndex % 10];
  let a, b, start, dir, steps, dest;
  
  // 邊界控制：出發點與降落點都必須限制在 [-10, 10] 區間內
  let limitTries = 0;
  while (limitTries < 200) {
    limitTries++;
    a = Math.floor(Math.random() * 9) + 1; // 1 to 9
    b = Math.floor(Math.random() * 8) + 1; // 1 to 8 (格子數)
    
    switch (chosenType) {
      case 1: // a + (-b)
        start = a;
        dir = 'left';
        steps = b;
        dest = start - steps;
        break;
      case 2: // (-a) + b
        start = -a;
        dir = 'right';
        steps = b;
        dest = start + steps;
        break;
      case 3: // (-a) + (-b)
        start = -a;
        dir = 'left';
        steps = b;
        dest = start - steps;
        break;
      case 4: // a - b
        start = a;
        dir = 'left';
        steps = b;
        dest = start - steps;
        break;
      case 5: // a - (-b)
        start = a;
        dir = 'right';
        steps = b;
        dest = start + steps;
        break;
      case 6: // (-a) - b
        start = -a;
        dir = 'left';
        steps = b;
        dest = start - steps;
        break;
      case 7: // (-a) - (-b)
        start = -a;
        dir = 'right';
        steps = b;
        dest = start + steps;
        break;
    }

    // 驗證起點、移動終點均未跑出 -10 到 10 的刻度外
    if (start >= -10 && start <= 10 && dest >= -10 && dest <= 10) {
      break;
    }
  }

  // 格式化算式顯示 (負數加上括號以符合格式)
  const formatNum = (x) => x < 0 ? `(${x})` : `${x}`;
  let formula = '';
  
  switch (chosenType) {
    case 1: formula = `${formatNum(a)} + (-${b})`; break;
    case 2: formula = `(-${a}) + ${b}`; break;
    case 3: formula = `(-${a}) + (-${b})`; break;
    case 4: formula = `${formatNum(a)} - ${b}`; break;
    case 5: formula = `${formatNum(a)} - (-${b})`; break;
    case 6: formula = `(-${a}) - ${b}`; break;
    case 7: formula = `(-${a}) - (-${b})`; break;
  }

  return {
    type: chosenType,
    a, b, start, dir, steps, dest, formula
  };
}

// ==========================================================================
// 每驟這个错誤的引導語 (21 組)
// ==========================================================================
function getGuidance(type, errorType, q) {
  const { a, b, start, steps, formula } = q;
  const aAbs = Math.abs(a);
  const bAbs = Math.abs(b);

  // errorType: 'start' | 'dir' | 'steps' | 'final'
  const guides = {
    // 題型 1：a + (-b)
    1: {
      start:  `起點看加號「前面」的數字。「${formula}」的起點是 ${aAbs}，請指向正數軸上的「${aAbs}」！`,
      dir:    `「+(-${bAbs})」是「加負數」——加負數就是往左走！`,
      steps:  `移動格數看括號裡的數字：「(-${bAbs})」忽略負號就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向左走 ${bAbs} 格 = ${q.dest}。`
    },
    // 題型 2：(-a) + b
    2: {
      start:  `起點看第一個括號裡的數字加上負號。「${formula}」的起點是 -${aAbs}，請找負數軸上的「-${aAbs}」！`,
      dir:    `「+${bAbs}」是「加正數」——加正數就是往右走！`,
      steps:  `移動格數看加號後面的數字：「+${bAbs}」就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向右走 ${bAbs} 格 = ${q.dest}。`
    },
    // 題型 3：(-a) + (-b)
    3: {
      start:  `起點看第一個括號裡的數字。「${formula}」的起點是 -${aAbs}，請找負數軸上的「-${aAbs}」！`,
      dir:    `「+(-${bAbs})」是「加負數」——加負數就是往左走！`,
      steps:  `移動格數看第二個括號裡的數字：「(-${bAbs})」忽略負號就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向左走 ${bAbs} 格 = ${q.dest}。`
    },
    // 題型 4：a - b
    4: {
      start:  `起點看減號「前面」的數字。「${formula}」的起點是 ${aAbs}，請點正數軸上的「${aAbs}」！`,
      dir:    `「-${bAbs}」是「減正數」——減正數就是往左走！`,
      steps:  `移動格數看減號後面的數字：「-${bAbs}」就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向左走 ${bAbs} 格 = ${q.dest}。`
    },
    // 題型 5：a - (-b)
    5: {
      start:  `起點看最前面的數字。「${formula}」的起點是 ${aAbs}，請點正數軸上的「${aAbs}」！`,
      dir:    `「-(-${bAbs})」是「減負數」，負負得正，方向要反過來——往右走！`,
      steps:  `移動格數看括號裡的數字：「-(-${bAbs})」忽略所有符號就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向右走 ${bAbs} 格 = ${q.dest}。`
    },
    // 題型 6：(-a) - b
    6: {
      start:  `起點看第一個括號裡的數字。「${formula}」的起點是 -${aAbs}，請找負數軸上的「-${aAbs}」！`,
      dir:    `「-${bAbs}」是「減正數」——減正數就是往左走！`,
      steps:  `移動格數看減號後面的數字：「-${bAbs}」就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向左走 ${bAbs} 格 = ${q.dest}。`
    },
    // 題型 7：(-a) - (-b)
    7: {
      start:  `起點看第一個括號裡的數字。「${formula}」的起點是 -${aAbs}，請找負數軸上的「-${aAbs}」！`,
      dir:    `「-(-${bAbs})」是「減負數」，負負得正，方向要反過來——往右走！`,
      steps:  `移動格數看第二個括號裡的數字：「-(-${bAbs})」忽略所有符號就是 ${bAbs} 格！`,
      final:  `算式結果 = 起點 ${start} 向右走 ${bAbs} 格 = ${q.dest}。`
    }
  };

  const typeGuides = guides[type];
  if (!typeGuides) return '';
  return '💡 ' + (typeGuides[errorType] || '');
}

// 驗證答案
function verifyAnswer() {
  if (GAME_STATE.isProcessingAnswer) return;

  const stepsVal = parseInt(DOM.inputSteps.value);
  const finalAnswerVal = parseInt(DOM.inputFinalAnswer.value);

  if (GAME_STATE.userAnswer.start === null) {
    alert('請在數線上點選出發起點！');
    return;
  }
  if (!GAME_STATE.userAnswer.dir) {
    alert('請點選往左或往右的移動方向！');
    return;
  }
  if (isNaN(stepsVal) || stepsVal <= 0) {
    alert('請填寫移動的格數！');
    return;
  }
  if (isNaN(finalAnswerVal)) {
    alert('請在步驟三填寫算式的最終答案！');
    return;
  }

  GAME_STATE.userAnswer.steps = stepsVal;
  GAME_STATE.userAnswer.finalAnswer = finalAnswerVal;
  GAME_STATE.isProcessingAnswer = true;
  DOM.btnSubmit.style.display = 'none';

  // 停用所有輸入，避免干擾
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => btn.disabled = true);
  DOM.inputSteps.disabled = true;
  DOM.inputFinalAnswer.disabled = true;

  const q = GAME_STATE.currentQuestion;
  const isStartCorrect   = (GAME_STATE.userAnswer.start === q.start);
  const isDirCorrect     = (GAME_STATE.userAnswer.dir   === q.dir);
  const isStepsCorrect   = (GAME_STATE.userAnswer.steps === q.steps);
  const isFinalCorrect   = (GAME_STATE.userAnswer.finalAnswer === q.dest);

  const isAllCorrect = isStartCorrect && isDirCorrect && isStepsCorrect && isFinalCorrect;

  // ── 步驟一 回饋 + 引導 ──
  if (isStartCorrect) {
    DOM.stepStartCard.className = 'step-card success';
    DOM.stepStartStatus.innerHTML = '✅';
    DOM.stepStartGuidance.classList.add('hidden');
  } else {
    DOM.stepStartCard.className = 'step-card error';
    DOM.stepStartStatus.innerHTML = '❌';
    DOM.stepStartGuidance.innerText = getGuidance(q.type, 'start', q);
    DOM.stepStartGuidance.classList.remove('hidden');
  }

  // ── 步驟二 回饋 + 引導（方向和格數分開判斷） ──
  if (isDirCorrect && isStepsCorrect) {
    DOM.stepMoveCard.className = 'step-card success';
    DOM.stepMoveStatus.innerHTML = '✅';
    DOM.stepMoveGuidance.classList.add('hidden');
  } else {
    DOM.stepMoveCard.className = 'step-card error';
    DOM.stepMoveStatus.innerHTML = '❌';
    // 優先顯示方向錯誤的引導，若方向對但格數錯則顯示格數引導
    const moveHint = !isDirCorrect
      ? getGuidance(q.type, 'dir', q)
      : getGuidance(q.type, 'steps', q);
    // 若兩者都錯，合併顯示
    const moveHintFull = (!isDirCorrect && !isStepsCorrect)
      ? getGuidance(q.type, 'dir', q) + '\n' + getGuidance(q.type, 'steps', q)
      : moveHint;
    DOM.stepMoveGuidance.innerText = moveHintFull;
    DOM.stepMoveGuidance.classList.remove('hidden');
  }

  // ── 步驟三 回饋 + 引導 ──
  if (isFinalCorrect) {
    DOM.stepAnswerCard.className = 'step-card success';
    DOM.stepAnswerStatus.innerHTML = '✅';
    DOM.stepAnswerGuidance.classList.add('hidden');
  } else {
    DOM.stepAnswerCard.className = 'step-card error';
    DOM.stepAnswerStatus.innerHTML = '❌';
    DOM.stepAnswerGuidance.innerText = getGuidance(q.type, 'final', q);
    DOM.stepAnswerGuidance.classList.remove('hidden');
  }

  // ── 執行動畫與整體回饋 ──
  if (isAllCorrect) {
    GAME_STATE.correctCount++;
    if (GAME_STATE.mode === 'challenge') GAME_STATE.score += 10;

    playPawnMovePathAnimation(q.start, q.dest, q.steps, () => {
      synth.playSuccess();
      DOM.feedbackPanel.className = 'feedback-panel';
      DOM.feedbackIcon.innerText = '🎉';
      DOM.feedbackTitle.innerText = '三步驟全對！太棒了！';
      DOM.feedbackText.innerText = `起點 ${q.start}，向${q.dir === 'left' ? '左' : '右'}移動 ${q.steps} 格，抵達座標 ${q.dest}，算式 ${q.formula} = ${q.dest} ✓`;
      DOM.questionEquation.innerText = `${q.formula} = ${q.dest}`;
      drawDisplacementCurve(q.start, q.dest, true);
      DOM.btnNext.style.display = 'block';
    });
  } else {
    synth.playError();
    DOM.feedbackPanel.className = 'feedback-panel wrong';
    DOM.feedbackIcon.innerText = '📖';
    DOM.feedbackTitle.innerText = '有步驟答錯了！請看各步驟的提示：';
    DOM.feedbackText.innerText = '棋子即將演示正確路徑，請仔細觀察…';

    // 清理刻度高亮，顯示正確起點
    const tickNodes = DOM.numberLineTicks.querySelectorAll('.tick-node');
    tickNodes.forEach(node => {
      const v = parseInt(node.dataset.val);
      if (v === q.start) node.classList.add('selected-start');
      else node.classList.remove('selected-start');
    });

    // 棋子退回正確起點並演示正確路徑
    movePawnToValue(q.start, true);
    setTimeout(() => {
      playPawnMovePathAnimation(q.start, q.dest, q.steps, () => {
        DOM.questionEquation.innerText = `${q.formula} = ${q.dest}`;
        drawDisplacementCurve(q.start, q.dest, true);
        DOM.btnNext.style.display = 'block';
      });
    }, 800);
  }
}

// 棋子逐格移動跳躍動畫
function playPawnMovePathAnimation(startVal, endVal, totalSteps, callback) {
  let currentVal = startVal;
  const isForward = (endVal > startVal);
  let stepCount = 0;

  const timer = setInterval(() => {
    if (stepCount >= totalSteps) {
      clearInterval(timer);
      if (callback) callback();
      return;
    }

    currentVal += isForward ? 1 : -1;
    stepCount++;
    movePawnToValue(currentVal, false, true); // 啟動跳躍動畫
  }, 450);
}

// 下一題
function nextQuestion() {
  synth.playClick();
  GAME_STATE.questionIndex++;
  
  if (GAME_STATE.questionIndex >= 10) {
    // 一關結束，結算
    clearInterval(GAME_STATE.challengeTimer);
    GAME_STATE.challengeTotalTime = ((Date.now() - GAME_STATE.challengeStartTime) / 1000).toFixed(1);
    showResultScreen();
  } else {
    loadQuestion();
  }
}

// 結算畫面展示
function showResultScreen() {
  DOM.resultTotalQuestions.innerText = '10 題';
  DOM.resultCorrectCount.innerText = `${GAME_STATE.correctCount} 題`;
  const accuracy = Math.round((GAME_STATE.correctCount / 10) * 100);
  DOM.resultAccuracy.innerText = `${accuracy}%`;
  DOM.resultTotalTime.innerText = `${GAME_STATE.challengeTotalTime} 秒`;

  // 勳章派發
  if (accuracy === 100) {
    DOM.resultBadgeIcon.innerText = '👑';
    DOM.resultBadgeName.innerText = '數線移動大師 (完美通關)';
    DOM.resultTitle.innerText = '太令人驚嘆了！';
  } else if (accuracy >= 80) {
    DOM.resultBadgeIcon.innerText = '🏆';
    DOM.resultBadgeName.innerText = '數線冒險精英';
    DOM.resultTitle.innerText = '非常優秀的挑戰！';
  } else if (accuracy >= 50) {
    DOM.resultBadgeIcon.innerText = '🎖️';
    DOM.resultBadgeName.innerText = '數線開拓遊俠';
    DOM.resultTitle.innerText = '做得好，繼續加油！';
  } else {
    DOM.resultBadgeIcon.innerText = '🌱';
    DOM.resultBadgeName.innerText = '數線實習生';
    DOM.resultTitle.innerText = '多練習就能掌握規律！';
  }

  showScreen(DOM.resultScreen);
}

// DOM 加載完成後初始化
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

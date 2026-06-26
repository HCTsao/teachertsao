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
  practiceTypesCard: document.getElementById('practice-types-card'),
  btnSelectAll: document.getElementById('btn-select-all'),
  btnSelectNone: document.getElementById('btn-select-none'),
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
    steps: null
  },
  
  challengeTimer: null,
  challengeStartTime: 0,
  challengeTotalTime: 0,
  
  practiceSelectedTypes: new Set([1, 2, 3, 4, 5, 6, 7]),
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
  
  // 顯示送出按鈕
  DOM.btnSubmit.style.display = 'block';
  
  // 清空步驟二的先前狀態
  DOM.stepMoveCard.classList.remove('success', 'error');
  DOM.stepMoveStatus.innerHTML = '';
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
    DOM.practiceTypesCard.style.display = 'block';
    GAME_STATE.mode = 'practice';
  });

  DOM.btnModeChallenge.addEventListener('click', () => {
    synth.playClick();
    DOM.btnModeChallenge.classList.add('active');
    DOM.btnModePractice.classList.remove('active');
    DOM.practiceTypesCard.style.display = 'none';
    GAME_STATE.mode = 'challenge';
  });

  // 練習題型多選全選與清除
  DOM.btnSelectAll.addEventListener('click', () => {
    synth.playClick();
    const boxes = document.querySelectorAll('.type-checkbox');
    boxes.forEach(box => {
      box.checked = true;
      GAME_STATE.practiceSelectedTypes.add(parseInt(box.dataset.type));
    });
  });

  DOM.btnSelectNone.addEventListener('click', () => {
    synth.playClick();
    const boxes = document.querySelectorAll('.type-checkbox');
    boxes.forEach(box => {
      box.checked = false;
      GAME_STATE.practiceSelectedTypes.delete(parseInt(box.dataset.type));
    });
  });

  // 核取方塊點選事件
  document.querySelectorAll('.type-checkbox').forEach(box => {
    box.addEventListener('change', () => {
      const typeNum = parseInt(box.dataset.type);
      if (box.checked) {
        GAME_STATE.practiceSelectedTypes.add(typeNum);
      } else {
        GAME_STATE.practiceSelectedTypes.delete(typeNum);
      }
    });
  });

  // 啟動遊戲
  DOM.btnStartGame.addEventListener('click', startGame);

  // 步驟二方向按鈕
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      synth.playClick();
      dirBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GAME_STATE.userAnswer.dir = btn.dataset.dir;
    });
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
function startGame() {
  synth.playClick();
  
  if (GAME_STATE.mode === 'practice' && GAME_STATE.practiceSelectedTypes.size === 0) {
    alert('請至少勾選一種練習題型！');
    return;
  }

  // 重置狀態
  GAME_STATE.questionIndex = 0;
  GAME_STATE.score = 0;
  GAME_STATE.correctCount = 0;
  GAME_STATE.isProcessingAnswer = false;
  
  if (GAME_STATE.mode === 'challenge') {
    GAME_STATE.challengeStartTime = Date.now();
    DOM.infoScoreBox.style.display = 'block';
    DOM.infoTimerBox.style.display = 'block';
    DOM.infoModeText.innerText = '🏆 冒險挑戰模式';
    startChallengeTimer();
  } else {
    DOM.infoScoreBox.style.display = 'none';
    DOM.infoTimerBox.style.display = 'none';
    DOM.infoModeText.innerText = '💡 自由練習模式';
    clearInterval(GAME_STATE.challengeTimer);
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

  DOM.stepMoveCard.className = 'step-card disabled';
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('active');
  });
  DOM.inputSteps.value = '';
  DOM.inputSteps.disabled = true;
  DOM.stepMoveStatus.innerHTML = '';

  DOM.btnSubmit.style.display = 'none';
  DOM.btnNext.style.display = 'none';
  DOM.feedbackPanel.classList.add('hidden');

  // 更新進度條
  if (GAME_STATE.mode === 'challenge') {
    DOM.infoProgressText.innerText = `第 ${GAME_STATE.questionIndex + 1} / 10 題`;
    DOM.progressBarFill.style.width = `${((GAME_STATE.questionIndex + 1) / 10) * 100}%`;
    DOM.infoScoreVal.innerText = GAME_STATE.score;
  } else {
    DOM.infoProgressText.innerText = `已練習：${GAME_STATE.questionIndex + 1} 題`;
    DOM.progressBarFill.style.width = '100%';
  }
}

// 題型隨機生成器
function generateQuestion() {
  let types = [1, 2, 3, 4, 5, 6, 7];
  if (GAME_STATE.mode === 'practice') {
    types = Array.from(GAME_STATE.practiceSelectedTypes);
  }
  
  const chosenType = types[Math.floor(Math.random() * types.length)];
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

// 驗證答案
function verifyAnswer() {
  if (GAME_STATE.isProcessingAnswer) return;

  const stepsVal = parseInt(DOM.inputSteps.value);
  if (!GAME_STATE.userAnswer.start === null) {
    alert('請在數線上點選出發起點！');
    return;
  }
  if (!GAME_STATE.userAnswer.dir) {
    alert('請點選往左或往右的移動方向！');
    return;
  }
  if (isNaN(stepsVal) || stepsVal <= 0) {
    alert('請在輸入框填寫正確的移動格數！');
    return;
  }

  GAME_STATE.userAnswer.steps = stepsVal;
  GAME_STATE.isProcessingAnswer = true;
  DOM.btnSubmit.style.display = 'none';

  // 停用所有輸入框與方向按鈕避免干擾
  const dirBtns = DOM.stepMoveCard.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => btn.disabled = true);
  DOM.inputSteps.disabled = true;

  const q = GAME_STATE.currentQuestion;
  const isStartCorrect = (GAME_STATE.userAnswer.start === q.start);
  const isDirCorrect = (GAME_STATE.userAnswer.dir === q.dir);
  const isStepsCorrect = (GAME_STATE.userAnswer.steps === q.steps);

  const isAllCorrect = isStartCorrect && isDirCorrect && isStepsCorrect;

  // 驗證回饋細項
  if (isStartCorrect) {
    DOM.stepStartCard.className = 'step-card success';
    DOM.stepStartStatus.innerHTML = '✅';
  } else {
    DOM.stepStartCard.className = 'step-card error';
    DOM.stepStartStatus.innerHTML = '❌';
  }

  if (isDirCorrect && isStepsCorrect) {
    DOM.stepMoveCard.className = 'step-card success';
    DOM.stepMoveStatus.innerHTML = '✅';
  } else {
    DOM.stepMoveCard.className = 'step-card error';
    DOM.stepMoveStatus.innerHTML = '❌';
  }

  // 執行跳躍動畫流程
  if (isAllCorrect) {
    // 答對加分
    GAME_STATE.correctCount++;
    if (GAME_STATE.mode === 'challenge') {
      GAME_STATE.score += 10;
    }
    
    playPawnMovePathAnimation(q.start, q.dest, q.steps, () => {
      // 成功結束後動作
      synth.playSuccess();
      DOM.feedbackPanel.className = 'feedback-panel';
      DOM.feedbackIcon.innerText = '🎉';
      DOM.feedbackTitle.innerText = '回答正確！';
      DOM.feedbackText.innerText = `棋子起點正確，且順利向${q.dir === 'left' ? '左' : '右'}移動 ${q.steps} 格抵達座標 ${q.dest}。`;
      
      // 更新算式為正確答案
      DOM.questionEquation.innerText = `${q.formula} = ${q.dest}`;
      drawDisplacementCurve(q.start, q.dest, true);
      DOM.btnNext.style.display = 'block';
    });
  } else {
    // 答錯，播放錯誤音效，並強制演示正確軌跡給學生看
    synth.playError();
    DOM.feedbackPanel.className = 'feedback-panel wrong';
    DOM.feedbackIcon.innerText = '💡';
    DOM.feedbackTitle.innerText = '回答錯誤！正確演示如下：';
    
    let errorMsg = '';
    if (!isStartCorrect) errorMsg += `起點應為 ${q.start}；`;
    if (!isDirCorrect || !isStepsCorrect) errorMsg += `移動方向與格數應為「往${q.dir === 'left' ? '左' : '右'}移動 ${q.steps} 格」。`;
    DOM.feedbackText.innerText = errorMsg;

    // 清理非正確狀態高亮
    const tickNodes = DOM.numberLineTicks.querySelectorAll('.tick-node');
    tickNodes.forEach(node => {
      const v = parseInt(node.dataset.val);
      if (v === q.start) node.classList.add('selected-start');
      else node.classList.remove('selected-start');
    });

    // 棋子退回正確起點並依序演示正確路徑
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
  
  if (GAME_STATE.mode === 'challenge' && GAME_STATE.questionIndex >= 10) {
    // 挑戰結束，結算
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

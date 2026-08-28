// 「一字千金」電視節目聽寫大賽 核心 JS (節目主播掀牌語音：「正確答案揭曉，恭喜xx、xx寫對了！」)

const STUDENT_NAMES = ['洪福', '廷恩', '岳泰', '冠宏'];

// 全域狀態
let userRole = '';
let roomCode = '';
let studentName = STUDENT_NAMES[0];

let selectedLessonIdx = 0;
let selectedWordIdx = 0;
let shuffledWords = [];
let isFirstQuestionOfLesson = true;

let prepTimer = null;
let roundTimer = null;
let prepCount = 3;
let countdownSeconds = 60;
let isRoundActive = false;

// 已連線的參賽學生集合
let connectedSet = new Set();

// 累積答對題數
let studentScores = {
  '洪福': 0,
  '廷恩': 0,
  '岳泰': 0,
  '冠宏': 0
};

// 參賽者鎖定、畫布圖片與筆跡 coordinates 數據
let contestantState = {
  '洪福': { isLocked: false, imgData: null, strokeData: [] },
  '廷恩': { isLocked: false, imgData: null, strokeData: [] },
  '岳泰': { isLocked: false, imgData: null, strokeData: [] },
  '冠宏': { isLocked: false, imgData: null, strokeData: [] }
};

let currentMarks = {
  '洪福': null,
  '廷恩': null,
  '岳泰': null,
  '冠宏': null
};

// 參賽者目前繪製中的筆劃數據
let currentPadStrokes = [];
let currentStrokeX = [];
let currentStrokeY = [];

// 廣播頻道
let bcChannel = null;

// 音效合成器 (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'fanfare') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, now);
      osc.frequency.setValueAtTime(329.63, now + 0.1);
      osc.frequency.setValueAtTime(392.00, now + 0.2);
      osc.frequency.setValueAtTime(523.25, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'gong') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'suspense') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.4);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'beep') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'wrong') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(130, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch(e) {}
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const pureChineseText = text.replace(/[\u3105-\u3129\u02CA\u02C7\u02CB\u02D9]/g, '');
  const utter = new SpeechSynthesisUtterance(pureChineseText);
  utter.lang = 'zh-TW';
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showPanel(panelId) {
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');
}

function selectRole(role) {
  userRole = role;
  loadSavedScores();
  if (role === 'TEACHER') {
    renderTeacherLessonGrid();
    showPanel('teacherLessonSelectPanel');
  } else if (role === 'STUDENT') {
    const codeElem = document.getElementById('teacherRoomCodeDisplay');
    if (codeElem) codeElem.style.display = 'none';

    showPanel('studentLoginPanel');
  }
}

function loadSavedScores() {
  const saved = localStorage.getItem('yizi_scores');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      STUDENT_NAMES.forEach(name => {
        if (typeof parsed[name] === 'number') {
          studentScores[name] = parsed[name];
        }
      });
    } catch(e) {}
  }
}

function resetStudentScores() {
  studentScores = {
    '洪福': 0,
    '廷恩': 0,
    '岳泰': 0,
    '冠宏': 0
  };
  saveScores();
  
  STUDENT_NAMES.forEach(name => {
    broadcastMsg({
      type: 'MARK_RESULT',
      roomCode: roomCode,
      studentName: name,
      resultType: null,
      totalScore: 0
    });
  });
}

function saveScores() {
  localStorage.setItem('yizi_scores', JSON.stringify(studentScores));
  updateScoreboardUI();
}

function updateScoreboardUI() {
  const scoreboardBar = document.getElementById('teacherScoreboardBar');
  if (!scoreboardBar) return;

  const activeNames = Array.from(connectedSet);
  if (activeNames.length === 0) {
    scoreboardBar.innerHTML = `<div style="color:var(--text-muted); text-align:center; width:100%;">📡 等待參賽者輸入房間代碼連線...</div>`;
  } else {
    scoreboardBar.innerHTML = activeNames.map(name => `
      <div class="score-item">🎓 ${name}：<span class="score-num">${studentScores[name] || 0}</span> 題</div>
    `).join('');
  }

  const countBadge = document.getElementById('connectedCountBadge');
  if (countBadge) {
    countBadge.innerText = `👥 參賽人數：${activeNames.length} 人`;
  }

  const studentBadge = document.getElementById('studentScoreBadge');
  if (studentBadge && studentName) {
    studentBadge.innerText = `累積答對：${studentScores[studentName] || 0} 題`;
  }
}

function formatZhuyinVertical(zhuyinStr) {
  const clean = zhuyinStr.replace(/【|】/g, '').trim();
  
  const toneMap = {
    'ˊ': 'tone-2nd',
    'ˇ': 'tone-3rd',
    'ˋ': 'tone-4th',
    '˙': 'tone-5th',
    '•': 'tone-5th',
    '‧': 'tone-5th',
    '・': 'tone-5th',
    '.': 'tone-5th'
  };
  
  let toneChar = null;
  let toneClass = 'tone-1st';
  const phonetics = [];
  
  for (const ch of clean) {
    if (toneMap[ch]) {
      toneChar = (ch === '.' || ch === '•' || ch === '‧' || ch === '・') ? '˙' : ch;
      toneClass = toneMap[ch];
    } else {
      phonetics.push(ch);
    }
  }
  
  const colHtml = phonetics.map(c => `<span>${c}</span>`).join('');
  const toneHtml = toneChar ? `<span class="bopomofo-tone ${toneClass}">${toneChar}</span>` : '';
  
  return `<span class="zhuyin-vertical-badge"><span class="bopomofo-column">${colHtml}</span>${toneHtml}</span>`;
}

function revealCurrentQuestionText() {
  const lesson = VOCAB_DATA[selectedLessonIdx];
  if (!lesson || !shuffledWords[selectedWordIdx]) return;
  const qObj = shuffledWords[selectedWordIdx];
  const formattedSentence = qObj.displaySentence.replace(
    qObj.zhuyin,
    formatZhuyinVertical(qObj.zhuyin)
  );
  document.getElementById('teacherSentenceDisplay').innerHTML = formattedSentence;
}

// AI 繁體國字手寫 OCR 辨識引擎
async function recognizeChineseHandwriting(strokeData) {
  if (!strokeData || strokeData.length === 0) return [];

  try {
    const payload = {
      app_version: 0.4,
      api_level: "537.36",
      device: "5.0",
      input_type: 0,
      options: "enable_homophone_dict",
      requests: [{
        writer_id: "teacher_tsao",
        ink: strokeData,
        language: "zh-TW"
      }]
    };

    const resp = await fetch("https://inputtools.google.com/request?itc=handwriting&app=demopage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (data && data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1]) {
      return data[1][0][1];
    }
  } catch(e) {
    console.log("OCR Recognition network fallback:", e);
  }
  return [];
}

async function evaluateHandwritingStrokes(imgData, strokeData, targetChar) {
  if (!strokeData || strokeData.length === 0) {
    return 'CROSS';
  }

  let pointCount = 0;
  strokeData.forEach(st => {
    if (st && st[0]) pointCount += st[0].length;
  });

  if (pointCount < 4) {
    return 'CROSS';
  }

  const candidates = await recognizeChineseHandwriting(strokeData);

  if (candidates && candidates.length > 0) {
    const topCandidates = candidates.slice(0, 8);
    console.log(`[AI OCR] 正解目標: "${targetChar}", 學生手寫辨識結果:`, topCandidates);

    if (topCandidates.includes(targetChar)) {
      return 'CIRCLE';
    } else {
      return 'CROSS';
    }
  }

  if (imgData && imgData.length > 1500 && pointCount >= 8) {
    return 'CIRCLE';
  }
  return 'CROSS';
}

// ----------------------------------------------------
// 教師端邏輯
// ----------------------------------------------------
function renderTeacherLessonGrid() {
  const grid = document.getElementById('teacherLessonGrid');
  if (!grid) return;
  grid.innerHTML = '';

  VOCAB_DATA.forEach((les, idx) => {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.innerHTML = `
      <div class="lesson-card-vol">${les.vol}</div>
      <div class="lesson-card-num">${les.lesson}</div>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">包含 ${les.words.length} 題</div>
    `;
    card.onclick = () => startTeacherStage(idx);
    grid.appendChild(card);
  });
}

function teacherReselectLesson() {
  resetStudentScores();
  showPanel('teacherLessonSelectPanel');
}

function startTeacherStage(lessonIdx) {
  selectedLessonIdx = lessonIdx;
  selectedWordIdx = 0;
  isFirstQuestionOfLesson = true;

  resetStudentScores();

  if (VOCAB_DATA[lessonIdx] && VOCAB_DATA[lessonIdx].words) {
    shuffledWords = shuffleArray(VOCAB_DATA[lessonIdx].words);
  } else {
    shuffledWords = [];
  }

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  const codeElem = document.getElementById('teacherRoomCodeDisplay');
  const roomText = document.getElementById('roomCodeTextDisplay');
  if (codeElem) {
    codeElem.style.display = 'inline-flex';
    if (roomText) roomText.innerText = roomCode;
  }

  connectedSet.clear();
  initBroadcastChannel();
  showPanel('teacherStagePanel');
  updateScoreboardUI();

  loadTeacherQuestion(selectedLessonIdx, selectedWordIdx);
}

function loadTeacherQuestion(lIdx, wIdx) {
  const lesson = VOCAB_DATA[lIdx];
  if (!lesson || !shuffledWords[wIdx]) return;

  selectedLessonIdx = lIdx;
  selectedWordIdx = wIdx;

  currentMarks = { '洪福': null, '廷恩': null, '岳泰': null, '冠宏': null };
  contestantState = {
    '洪福': { isLocked: false, imgData: null, strokeData: [] },
    '廷恩': { isLocked: false, imgData: null, strokeData: [] },
    '岳泰': { isLocked: false, imgData: null, strokeData: [] },
    '冠宏': { isLocked: false, imgData: null, strokeData: [] }
  };

  if (database && roomCode) {
    database.ref(`yizi_rooms/${roomCode}/pads`).remove();
    database.ref(`yizi_rooms/${roomCode}/currentQuestion`).set({
      lIdx: lIdx,
      wIdx: wIdx,
      questionId: `${lIdx}_${wIdx}_${Date.now()}`,
      status: 'PREPARE',
      timestamp: Date.now()
    });
  }

  document.getElementById('teacherQuestionHeader').innerText = `${lesson.vol} ${lesson.lesson} （第 ${wIdx+1} / ${shuffledWords.length} 題）`;
  
  if (isFirstQuestionOfLesson) {
    document.getElementById('teacherSentenceDisplay').innerHTML = `
      <div style="color:var(--light-gold); font-size:1.4rem; font-weight:800; padding:18px;">
        ✨ 第一題預備中！請教師確認參賽者入場後，點擊下方『▶️ 開始答題』開賽 ✨
      </div>
    `;
  } else {
    revealCurrentQuestionText();
  }

  stopAllTimers();
  const stageCard = document.querySelector('.stage-card');
  if (stageCard) stageCard.classList.remove('flashing-suspense');

  const timerBadge = document.getElementById('teacherTimerDisplay');
  timerBadge.style.color = '#ef4444';
  timerBadge.innerText = '60';

  document.getElementById('startRoundBtn').disabled = false;
  document.getElementById('teacherRevealBox').classList.remove('active');

  if (!isFirstQuestionOfLesson) {
    speakHostQuestion();
    start60sAnswerRound();
  }

  broadcastMsg({
    type: 'PREPARE_QUESTION',
    roomCode: roomCode,
    lIdx: lIdx,
    wIdx: wIdx
  });

  renderDynamicContestantsGrid();
}

function start3sPrepCountdown() {
  document.getElementById('startRoundBtn').disabled = true;

  if (isFirstQuestionOfLesson) {
    prepCount = 3;
    const timerBadge = document.getElementById('teacherTimerDisplay');
    timerBadge.style.color = '#fbbf24';
    timerBadge.innerText = `準備 3`;

    broadcastMsg({
      type: 'PREP_COUNTDOWN',
      roomCode: roomCode,
      prepCount: 3
    });

    stopAllTimers();

    prepTimer = setInterval(() => {
      prepCount--;
      if (prepCount > 0) {
        timerBadge.innerText = `準備 ${prepCount}`;
        playSound('beep');
        broadcastMsg({
          type: 'PREP_COUNTDOWN',
          roomCode: roomCode,
          prepCount: prepCount
        });
      } else {
        clearInterval(prepTimer);
        prepTimer = null;
        timerBadge.style.color = '#ef4444';
        timerBadge.innerText = '60';

        isFirstQuestionOfLesson = false;
        revealCurrentQuestionText();
        speakHostQuestion();
        start60sAnswerRound();
      }
    }, 1000);
  } else {
    revealCurrentQuestionText();
    speakHostQuestion();
    start60sAnswerRound();
  }
}

function start60sAnswerRound() {
  isRoundActive = true;
  countdownSeconds = 60;

  broadcastMsg({
    type: 'START_ROUND',
    roomCode: roomCode,
    seconds: 60
  });

  roundTimer = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds < 10) playSound('beep');

    document.getElementById('teacherTimerDisplay').innerText = countdownSeconds.toString().padStart(2, '0');

    broadcastMsg({
      type: 'TIMER_TICK',
      roomCode: roomCode,
      seconds: countdownSeconds
    });

    if (countdownSeconds <= 0) {
      stopAllTimers();
      triggerSuspenseAndAutoGrading();
    }
  }, 1000);
}

function stopAllTimers() {
  if (prepTimer) { clearInterval(prepTimer); prepTimer = null; }
  if (roundTimer) { clearInterval(roundTimer); roundTimer = null; }
}

function speakHostQuestion() {
  if (!shuffledWords || !shuffledWords[selectedWordIdx]) return;
  const qObj = shuffledWords[selectedWordIdx];
  speak(qObj.ttsText);
}

function checkAllContestantsLocked() {
  const activeNames = Array.from(connectedSet);
  if (activeNames.length >= STUDENT_NAMES.length) {
    const allActiveLocked = activeNames.every(name => contestantState[name] && contestantState[name].isLocked);
    if (allActiveLocked && isRoundActive) {
      stopAllTimers();
      triggerSuspenseAndAutoGrading();
    }
  }
}

function triggerSuspenseAndAutoGrading() {
  isRoundActive = false;
  lockAllContestants();

  const stageCard = document.querySelector('.stage-card');
  if (stageCard) stageCard.classList.add('flashing-suspense');

  playSound('suspense');
  let intervalCount = 0;
  const suspenseInterval = setInterval(() => {
    intervalCount++;
    playSound('suspense');
    if (intervalCount >= 5) clearInterval(suspenseInterval);
  }, 400);

  setTimeout(async () => {
    if (stageCard) stageCard.classList.remove('flashing-suspense');
    await autoGradeAllContestants();
    teacherRevealAnswer();
  }, 2300);
}

async function autoGradeAllContestants() {
  if (!shuffledWords || !shuffledWords[selectedWordIdx]) return;
  const targetChar = shuffledWords[selectedWordIdx].char;

  const activeNames = Array.from(connectedSet);
  for (const name of activeNames) {
    const state = contestantState[name];
    const imgData = state ? state.imgData : null;
    const strokeData = state ? state.strokeData : [];

    const resultType = await evaluateHandwritingStrokes(imgData, strokeData, targetChar);
    gradeStudentMark(name, resultType);
  }
}

function lockAllContestants() {
  isRoundActive = false;
  broadcastMsg({
    type: 'FORCE_LOCK',
    roomCode: roomCode
  });
}

// 要求: 按「揭曉答案」時停止倒數計時，先進行 2 秒 TV 節目閃爍緊張燈光與懸疑音效，接著 AI 判定與 3D 正解登場
async function teacherRevealAnswer() {
  stopAllTimers();
  lockAllContestants();

  broadcastMsg({
    type: 'STOP_TIMER',
    roomCode: roomCode,
    seconds: countdownSeconds
  });

  if (!shuffledWords || !shuffledWords[selectedWordIdx]) return;
  const qObj = shuffledWords[selectedWordIdx];

  // 1. 啟動 TV 節目「一字千金」閃爍緊張燈光特效與懸疑音效
  const stageCard = document.querySelector('.stage-card');
  if (stageCard) stageCard.classList.add('flashing-suspense');

  playSound('suspense');
  let intervalCount = 0;
  const suspenseInterval = setInterval(() => {
    intervalCount++;
    playSound('suspense');
    if (intervalCount >= 5) clearInterval(suspenseInterval);
  }, 400);

  // 2. 在 2.2 秒緊張燈光閃爍期間，同步完成 AI 國字/筆劃自動判定 (⭕ / ❌)
  const gradingPromise = autoGradeAllContestants();

  setTimeout(async () => {
    if (suspenseInterval) clearInterval(suspenseInterval);
    if (stageCard) stageCard.classList.remove('flashing-suspense');

    await gradingPromise;

    // 3. 懸疑結束，歡呼音樂 + 正確解答 3D 卡牌翻轉亮相
    playSound('fanfare');

    const revealBox = document.getElementById('teacherRevealBox');
    const charElem = document.getElementById('teacherRevealChar');
    const infoElem = document.getElementById('teacherRevealInfo');

    if (revealBox && charElem) {
      revealBox.classList.remove('active');
      charElem.classList.remove('reveal-char-anim');

      void revealBox.offsetWidth; // 觸發 DOM 重繪 restart 動畫

      charElem.innerText = qObj.char;
      if (infoElem) infoElem.innerText = `常用語詞：【${qObj.compound}】`;

      revealBox.classList.add('active');
      charElem.classList.add('reveal-char-anim');
    }

    // 4. 收集所有答對 (🟢 圈) 的參賽學生並進行廣播 speech
    const correctStudents = Array.from(connectedSet).filter(name => currentMarks[name] === 'CIRCLE');

    let announcement = "";
    if (correctStudents.length > 0) {
      const namesStr = correctStudents.join('、');
      announcement = `正確答案揭曉，恭喜${namesStr}寫對了！`;
    } else {
      announcement = `正確答案揭曉，正確漢字是：${qObj.char}。`;
    }

    speak(announcement);
  }, 2200);
}

function teacherNextQuestion() {
  if (selectedWordIdx + 1 < shuffledWords.length) {
    isFirstQuestionOfLesson = false;
    loadTeacherQuestion(selectedLessonIdx, selectedWordIdx + 1);
  } else if (selectedLessonIdx + 1 < VOCAB_DATA.length) {
    isFirstQuestionOfLesson = true;
    startTeacherStage(selectedLessonIdx + 1);
  } else {
    alert('🎉 恭喜已完成全部 18 課的「一字千金」題目大拷問！');
  }
}

function toggleStudentMark(name) {
  const current = currentMarks[name];
  if (current === 'CIRCLE') {
    gradeStudentMark(name, 'CROSS');
  } else {
    gradeStudentMark(name, 'CIRCLE');
  }
}

function gradeStudentMark(name, resultType) {
  if (currentMarks[name] === 'CIRCLE' && resultType === 'CROSS') {
    studentScores[name] = Math.max(0, (studentScores[name] || 0) - 1);
  }

  currentMarks[name] = resultType;

  const overlay = document.getElementById(`tcMarkOverlay_${name}`);
  const symbol = document.getElementById(`tcMarkSymbol_${name}`);

  if (overlay) {
    overlay.classList.remove('active');
    void overlay.offsetWidth; // 觸發 DOM 重繪以重新播放動畫
  }

  if (resultType === 'CIRCLE') {
    playSound('fanfare');
    if (symbol) {
      symbol.innerText = '⭕';
      symbol.className = 'mark-symbol circle';
    }
    if (overlay) overlay.classList.add('active');

    studentScores[name] = (studentScores[name] || 0) + 1;
    saveScores();
  } else {
    // 錯的不用打叉：隱藏 overlay，保持學生原始手寫筆跡 100% 清晰
    if (overlay) overlay.classList.remove('active');
    saveScores();
  }

  broadcastMsg({
    type: 'MARK_RESULT',
    roomCode: roomCode,
    studentName: name,
    resultType: resultType,
    totalScore: studentScores[name] || 0
  });
}

function renderDynamicContestantsGrid() {
  const grid = document.getElementById('teacherContestantsGrid');
  if (!grid) return;

  const activeNames = Array.from(connectedSet);
  if (activeNames.length === 0) {
    grid.style.gridTemplateColumns = '1fr';
    grid.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; background: #020617; border: 2px dashed var(--card-border); border-radius: 20px; color: var(--text-muted);">
        <div style="font-size:3rem; margin-bottom:12px;">📡</div>
        <h3 style="color:var(--light-gold); font-size:1.3rem;">等待參賽學生選擇姓名連線加入...</h3>
        <p style="margin-top:8px; color:#e2e8f0; font-size:1.05rem;">
          請參賽學生（${STUDENT_NAMES.join('、')}）在裝置上輸入房間代碼 <strong style="color: #fef08a; font-size:1.25rem;">${roomCode || '8888'}</strong>
        </p>
        <p style="margin-top:6px; font-size:0.9rem; color:#94a3b8;">(教師可點擊右上角『📱 學生掃碼』按鈕彈出大 QR Code 供學生相機掃碼)</p>
      </div>
    `;
    updateScoreboardUI();
    return;
  }

  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.innerHTML = activeNames.map(name => `
    <div class="teacher-contestant-card" id="tcCard_${name}" onclick="toggleStudentMark('${name}')" style="cursor:pointer;" title="點擊可手動修正 🟢/🔴 判定">
      <div class="mark-overlay" id="tcMarkOverlay_${name}">
        <div class="mark-symbol" id="tcMarkSymbol_${name}">⭕</div>
      </div>

      <div class="teacher-contestant-name">
        <span>🎓 ${name}</span>
        <span class="contestant-lock-tag ${contestantState[name] && contestantState[name].isLocked ? 'locked' : ''}" id="tcTag_${name}">
          ${contestantState[name] && contestantState[name].isLocked ? '🔒 已鎖定' : '✏️ 連線中'}
        </span>
      </div>
      <img class="teacher-contestant-img" id="tcImg_${name}" src="${(contestantState[name] && contestantState[name].imgData) || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><text x='20' y='50' fill='%23666'>等待筆跡</text></svg>"}">
    </div>
  `).join('');

  updateScoreboardUI();
}

// ----------------------------------------------------
// 參賽者端邏輯
// ----------------------------------------------------
function getStudentDeviceToken() {
  let token = sessionStorage.getItem('yizi_device_token');
  if (!token) {
    token = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    sessionStorage.setItem('yizi_device_token', token);
  }
  return token;
}

function joinStudentRoom() {
  const codeInput = document.getElementById('inputRoomCode').value.trim();
  const nameSelect = document.getElementById('inputStudentName').value;

  if (!codeInput || codeInput.length !== 4) {
    alert('請輸入 4 位數房間代碼！');
    return;
  }

  roomCode = codeInput;
  studentName = nameSelect || STUDENT_NAMES[0];
  const deviceToken = getStudentDeviceToken();

  // 檢查選取的學生姓名是否已被其他裝置使用
  if (database && roomCode) {
    database.ref(`yizi_rooms/${roomCode}/connectedStudents/${studentName}`).once('value', (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const isSameDevice = (val && val.deviceToken === deviceToken);
        const isInactive = (val && val.lastActive && (Date.now() - val.lastActive > 45000));

        if (!isSameDevice && !isInactive) {
          alert(`❌ 無法登入：【${studentName}】已經在其他裝置上加入房間了！請確認您的姓名或聯繫教師。`);
          return;
        }
      }

      database.ref(`yizi_rooms/${roomCode}/connectedStudents/${studentName}`).set({
        name: studentName,
        deviceToken: deviceToken,
        lastActive: Date.now()
      });

      completeStudentJoinProcess();
    });
  } else {
    completeStudentJoinProcess();
  }
}

function completeStudentJoinProcess() {
  loadSavedScores();

  const codeElem = document.getElementById('teacherRoomCodeDisplay');
  const roomText = document.getElementById('roomCodeTextDisplay');
  if (codeElem) {
    codeElem.style.display = 'inline-flex';
    if (roomText) roomText.innerText = roomCode;
  }

  document.getElementById('studentHeaderInfo').innerText = `參賽者：${studentName} （代碼：${roomCode}）`;
  initBroadcastChannel();

  showPanel('studentPadPanel');
  initStudentHandwritingPad();
  updateScoreboardUI();

  broadcastMsg({
    type: 'STUDENT_JOINED',
    roomCode: roomCode,
    studentName: studentName
  });
}

function initStudentHandwritingPad() {
  const cvs = document.getElementById('studentHandwritingCanvas');
  if (!cvs) return;

  cvs.width = cvs.clientWidth || 600;
  cvs.height = cvs.clientHeight || 380;

  const ctx = cvs.getContext('2d');
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  let drawing = false;
  currentPadStrokes = [];

  const getPos = (e) => {
    const rect = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: Math.round(clientX - rect.left), y: Math.round(clientY - rect.top) };
  };

  const startDraw = (e) => {
    if (isLocked) return;
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    currentStrokeX = [pos.x];
    currentStrokeY = [pos.y];
  };

  const draw = (e) => {
    if (!drawing || isLocked) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    currentStrokeX.push(pos.x);
    currentStrokeY.push(pos.y);
  };

  const stopDraw = () => {
    if (drawing) {
      drawing = false;
      if (currentStrokeX.length > 0) {
        currentPadStrokes.push([currentStrokeX, currentStrokeY]);
      }
      sendPadDrawingToTeacher();
    }
  };

  cvs.onmousedown = startDraw;
  cvs.onmousemove = draw;
  cvs.onmouseup = stopDraw;

  cvs.ontouchstart = (e) => { e.preventDefault(); startDraw(e); };
  cvs.ontouchmove = (e) => { e.preventDefault(); draw(e); };
  cvs.ontouchend = stopDraw;
}

function clearStudentPad() {
  forceClearStudentPad();
}

function forceClearStudentPad() {
  isLocked = false;

  const overlay = document.getElementById('studentPadOverlay');
  if (overlay) overlay.classList.remove('active');

  const markOverlay = document.getElementById('studentMarkOverlay');
  if (markOverlay) markOverlay.classList.remove('active');

  const lockBtn = document.getElementById('lockAnswerBtn');
  if (lockBtn) lockBtn.disabled = false;

  const cvs = document.getElementById('studentHandwritingCanvas');
  if (cvs) {
    const ctx = cvs.getContext('2d');
    cvs.width = cvs.clientWidth || 600;
    cvs.height = cvs.clientHeight || 380;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
  }

  currentPadStrokes = [];
  sendPadDrawingToTeacher();
}

function lockStudentPad() {
  if (isLocked) return;
  isLocked = true;

  document.getElementById('studentPadOverlay').classList.add('active');
  document.getElementById('lockAnswerBtn').disabled = true;

  playSound('gong');
  sendPadDrawingToTeacher(true);
}

// ----------------------------------------------------
// Firebase Realtime Database 初始化與跨裝置同步
// ----------------------------------------------------
const firebaseConfig = {
  databaseURL: "https://pokemon-7bd40-default-rtdb.asia-southeast1.firebasedatabase.app"
};

let database = null;
try {
  if (window.firebase) {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
  }
} catch (e) {
  console.warn("Firebase RTDB init notice:", e);
}

let lastProcessedMsgTime = 0;

function sendPadDrawingToTeacher(forceLock = false) {
  const cvs = document.getElementById('studentHandwritingCanvas');
  if (!cvs) return;
  const imgData = cvs.toDataURL('image/png');

  if (database && roomCode && studentName) {
    database.ref(`yizi_rooms/${roomCode}/connectedStudents/${studentName}/lastActive`).set(Date.now());

    // 寫入各學生專屬 Firebase 節點，防止多位學生數據覆蓋碰撞
    database.ref(`yizi_rooms/${roomCode}/pads/${studentName}`).set({
      studentName: studentName,
      imgData: imgData,
      strokeData: currentPadStrokes,
      isLocked: isLocked || forceLock,
      timestamp: Date.now()
    });
  }

  broadcastMsg({
    type: 'PAD_UPDATE',
    roomCode: roomCode,
    studentName: studentName,
    imgData: imgData,
    strokeData: currentPadStrokes,
    isLocked: isLocked || forceLock
  });
}

function updateTeacherContestantPad(name, data) {
  if (!name) return;
  if (!connectedSet.has(name)) {
    connectedSet.add(name);
    renderDynamicContestantsGrid();
  }

  if (!contestantState[name]) contestantState[name] = {};
  contestantState[name].isLocked = !!data.isLocked;
  if (data.imgData !== undefined) contestantState[name].imgData = data.imgData;
  if (data.strokeData !== undefined) contestantState[name].strokeData = data.strokeData;

  const tag = document.getElementById(`tcTag_${name}`);
  const img = document.getElementById(`tcImg_${name}`);

  if (tag) {
    tag.innerText = data.isLocked ? '🔒 已鎖定' : '✏️ 連線中';
    tag.className = `contestant-lock-tag ${data.isLocked ? 'locked' : ''}`;
  }
  if (img) {
    img.src = data.imgData || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><text x='20' y='50' fill='%23666'>等待筆跡</text></svg>";
  }

  checkAllContestantsLocked();
}

let lastHandledQuestionId = '';

function initBroadcastChannel() {
  if (bcChannel) {
    try { bcChannel.close(); } catch(e) {}
  }

  try {
    bcChannel = new BroadcastChannel('yizi_qianjin_channel_' + roomCode);
    bcChannel.onmessage = (e) => handleNetworkMessage(e.data);
  } catch(e) {}

  window.addEventListener('storage', (e) => {
    if (e.key === 'yizi_msg_' + roomCode && e.newValue) {
      try { handleNetworkMessage(JSON.parse(e.newValue)); } catch(err) {}
    }
  });

  if (database && roomCode) {
    database.ref('yizi_rooms/' + roomCode + '/lastMsg').off();
    database.ref('yizi_rooms/' + roomCode + '/lastMsg').on('value', (snapshot) => {
      const val = snapshot.val();
      if (val && val.timestamp && val.timestamp > lastProcessedMsgTime) {
        lastProcessedMsgTime = val.timestamp;
        handleNetworkMessage(val);
      }
    });

    if (userRole === 'STUDENT') {
      database.ref('yizi_rooms/' + roomCode + '/currentQuestion').off();
      database.ref('yizi_rooms/' + roomCode + '/currentQuestion').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && val.questionId) {
          if (val.questionId !== lastHandledQuestionId) {
            lastHandledQuestionId = val.questionId;
            forceClearStudentPad();
          }
        }
      });
    }

    if (userRole === 'TEACHER') {
      database.ref(`yizi_rooms/${roomCode}/pads`).off();
      database.ref(`yizi_rooms/${roomCode}/pads`).on('child_changed', (snapshot) => {
        const val = snapshot.val();
        if (val && val.studentName) {
          updateTeacherContestantPad(val.studentName, val);
        }
      });
      database.ref(`yizi_rooms/${roomCode}/pads`).on('child_added', (snapshot) => {
        const val = snapshot.val();
        if (val && val.studentName) {
          updateTeacherContestantPad(val.studentName, val);
        }
      });
    }
  }
}

function broadcastMsg(msgObj) {
  msgObj.timestamp = Date.now();

  if (bcChannel) {
    try { bcChannel.postMessage(msgObj); } catch(e) {}
  }

  try {
    localStorage.setItem('yizi_msg_' + roomCode, JSON.stringify(msgObj));
  } catch(e) {}

  if (database && roomCode) {
    database.ref('yizi_rooms/' + roomCode + '/lastMsg').set(msgObj);
  }
}

function handleNetworkMessage(msg) {
  if (!msg || msg.roomCode !== roomCode) return;

  if (userRole === 'TEACHER') {
    if (msg.type === 'STUDENT_JOINED' || msg.type === 'PAD_UPDATE') {
      const name = msg.studentName;

      if (!connectedSet.has(name)) {
        connectedSet.add(name);
        renderDynamicContestantsGrid();
      }

      if (!contestantState[name]) contestantState[name] = {};
      contestantState[name].isLocked = !!msg.isLocked;
      if (msg.imgData) contestantState[name].imgData = msg.imgData;
      if (msg.strokeData) contestantState[name].strokeData = msg.strokeData;

      const tag = document.getElementById(`tcTag_${name}`);
      const img = document.getElementById(`tcImg_${name}`);

      if (tag) {
        tag.innerText = msg.isLocked ? '🔒 已鎖定' : '✏️ 連線中';
        tag.className = `contestant-lock-tag ${msg.isLocked ? 'locked' : ''}`;
      }
      if (img && msg.imgData) {
        img.src = msg.imgData;
      }

      checkAllContestantsLocked();
    }
  }

  if (userRole === 'STUDENT') {
    if (msg.type === 'PREPARE_QUESTION') {
      forceClearStudentPad();
      const badge = document.getElementById('studentTimerBadge');
      if (badge) {
        badge.innerText = '60s';
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
      }
    } else if (msg.type === 'PREP_COUNTDOWN') {
      const badge = document.getElementById('studentTimerBadge');
      if (badge) {
        badge.innerText = `準備 ${msg.prepCount}`;
        badge.style.color = '#fbbf24';
        badge.style.borderColor = '#fbbf24';
      }
      playSound('beep');
    } else if (msg.type === 'START_ROUND') {
      isLocked = false;
      document.getElementById('studentPadOverlay').classList.remove('active');
      document.getElementById('lockAnswerBtn').disabled = false;
      const badge = document.getElementById('studentTimerBadge');
      if (badge) {
        badge.innerText = `${msg.seconds || 60}s`;
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
      }
    } else if (msg.type === 'TIMER_TICK' || msg.type === 'STOP_TIMER') {
      const badge = document.getElementById('studentTimerBadge');
      if (badge && msg.seconds !== undefined) {
        badge.innerText = `${msg.seconds}s`;
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
      }
    } else if (msg.type === 'FORCE_LOCK') {
      lockStudentPad();
    } else if (msg.type === 'MARK_RESULT' && msg.studentName === studentName) {
      const overlay = document.getElementById('studentMarkOverlay');
      const symbol = document.getElementById('studentMarkSymbol');
      
      if (msg.resultType === 'CIRCLE') {
        if (symbol) {
          symbol.innerText = '⭕';
          symbol.className = 'mark-symbol circle';
        }
        playSound('fanfare');
        if (overlay) {
          overlay.classList.remove('active');
          void overlay.offsetWidth;
          overlay.classList.add('active');
        }
      } else {
        // 錯的不用打叉，隱藏標記，保持學生原始手寫筆跡 100% 清晰
        if (overlay) overlay.classList.remove('active');
      }

      studentScores[studentName] = msg.totalScore || 0;
      saveScores();
    }
  }
}

// --------------------------------------------------
// QR Code 生成與彈窗控制機制
// --------------------------------------------------
function getStudentJoinUrl(code) {
  const targetCode = code || roomCode || '8888';
  const baseUrl = window.location.href.split('?')[0].split('#')[0];
  return `${baseUrl}?role=STUDENT&code=${targetCode}`;
}

function getQrCodeImageUrl(urlData, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(urlData)}`;
}

function toggleQrCodeModal() {
  const modal = document.getElementById('qrCodeModal');
  if (!modal) return;
  
  if (modal.style.display === 'flex') {
    closeQrCodeModal();
  } else {
    openQrCodeModal();
  }
}

function openQrCodeModal() {
  const modal = document.getElementById('qrCodeModal');
  const img = document.getElementById('qrCodeModalImg');
  const txt = document.getElementById('qrModalRoomCode');
  if (!modal || !img) return;

  const joinUrl = getStudentJoinUrl(roomCode);
  img.src = getQrCodeImageUrl(joinUrl, 250);
  if (txt) txt.innerText = roomCode || '8888';
  
  modal.style.display = 'flex';
}

function closeQrCodeModal() {
  const modal = document.getElementById('qrCodeModal');
  if (modal) modal.style.display = 'none';
}

window.onload = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramRole = urlParams.get('role');
  const paramCode = urlParams.get('code');

  if (paramCode) {
    const inputCode = document.getElementById('inputRoomCode');
    if (inputCode) inputCode.value = paramCode;
  }

  if (paramRole === 'STUDENT' || (paramCode && !paramRole)) {
    selectRole('STUDENT');
  } else {
    showPanel('roleChoicePanel');
  }
};

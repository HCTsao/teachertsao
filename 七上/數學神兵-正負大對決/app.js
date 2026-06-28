/* app.js - 數學神兵：正負大對決 */

// ==========================================================================
// Web Audio API 音效合成器
// ==========================================================================
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
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playLaser() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    // 快速上升音階
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.25);
  }

  playExplosion() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.45);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.45);
  }

  playPowerUp() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.04, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22 + i * 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + 0.3 + i * 0.08);
    });
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 0.1 },
      { f: 783.99, t: 0.2 },
      { f: 1046.50, t: 0.3 }
    ];
    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.08, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + 0.4);
    });
  }

  playWrong() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  }

  playSkill1() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Magic Missile: short high-pitch laser sweeps
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + i * 150, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
      
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  playSkill2() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Lightning: high pitch sawtooth sweep representing lightning crackle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(2000, now + 0.3);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playSkill3() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Ultimate: deep charge up sweep + massive explosion
    // 1. Charge up sweep
    const oscCharge = this.ctx.createOscillator();
    const gainCharge = this.ctx.createGain();
    oscCharge.type = 'sine';
    oscCharge.frequency.setValueAtTime(150, now);
    oscCharge.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    gainCharge.gain.setValueAtTime(0.01, now);
    gainCharge.gain.linearRampToValueAtTime(0.06, now + 0.4);
    oscCharge.connect(gainCharge);
    gainCharge.connect(this.ctx.destination);
    oscCharge.start(now);
    oscCharge.stop(now + 0.4);

    // 2. Heavy strike explosion
    const strikeTime = now + 0.4;
    const oscStrike = this.ctx.createOscillator();
    const gainStrike = this.ctx.createGain();
    oscStrike.type = 'triangle';
    oscStrike.frequency.setValueAtTime(120, strikeTime);
    oscStrike.frequency.exponentialRampToValueAtTime(20, strikeTime + 0.5);
    
    gainStrike.gain.setValueAtTime(0.15, strikeTime);
    gainStrike.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.5);
    
    oscStrike.connect(gainStrike);
    gainStrike.connect(this.ctx.destination);
    oscStrike.start(strikeTime);
    oscStrike.stop(strikeTime + 0.5);
  }
}

const synth = new SoundSynth();

// ==========================================================================
// 遊戲狀態與關卡配置
// ==========================================================================
const GAME_STATE = {
  mode: 'campaign',    // 'campaign' (vs AI) or 'pvp' (1vs1)
  level: 1,
  stage: 1,            // 1 (小怪), 2 (中怪), 3 (魔王)
  round: 1,
  maxRounds: 12,
  
  // 玩家 1 屬性 (勇者)
  playerHp: 200,
  playerMaxHp: 200,
  playerShield: 0,
  playerDmgDealt: 0, // 單場總傷害
  
  // 玩家 2 / Boss 屬性
  bossHp: 200,
  bossMaxHp: 200,
  bossShield: 0,
  bossDmgDealt: 0,
  
  activePlayer: 1,     // 當前答題玩家 (1 或 2)
  currentQuestion: null,
  timer: null,
  timeLeft: 30,
  timeLimit: 30,
  isProcessing: false, // 防重複點擊
  
  stats: {
    correct: 0,
    total: 0
  },

  // 招式冷卻時間 (CD)
  p1Skill2Cd: 0,
  p1Skill3Cd: 0,
  p2Skill2Cd: 0,
  p2Skill3Cd: 0,

  // PvP 專屬狀態
  pvp: {
    p1Question: null,
    p2Question: null,
    p1Timer: null,
    p2Timer: null,
    p1TimeLeft: 30,
    p2TimeLeft: 30,
    p1TimeLimit: 30,
    p2TimeLimit: 30,
    p1IsProcessing: false,
    p2IsProcessing: false,
    matchTimer: null,
    matchTimeLeft: 90
  },

  // 線上連線狀態
  online: {
    peer: null,
    conn: null,
    isHost: false,
    role: '',       // 'p1' (Host/Left) or 'p2' (Guest/Right)
    roomId: '',
    connected: false
  }
};

const STAGE_HP_CONFIG = {
  1: 30, // 關卡 1 (小怪)
  2: 45, // 關卡 2 (中怪)
  3: 60  // 關卡 3 (魔王)
};

// ==========================================================================
// DOM 元素快取
// ==========================================================================
const DOM = {
  get startScreen() { return document.getElementById('start-screen'); },
  get gameScreen() { return document.getElementById('game-screen'); },
  get resultScreen() { return document.getElementById('result-screen'); },
  get modalOverlay() { return document.getElementById('modal-overlay'); },

  get btnStartGame() { return document.getElementById('btn-start-game'); },
  get btnHome() { return document.getElementById('btn-home'); },
  get btnReset() { return document.getElementById('btn-reset'); },
  get btnRematch() { return document.getElementById('btn-rematch'); },
  get btnResultHome() { return document.getElementById('btn-result-home'); },

  get modeBtns() { return document.querySelectorAll('.mode-btn'); },
  get levelBtns() { return document.querySelectorAll('.level-btn'); },
  get bossMaxHpLabel() { return document.getElementById('boss-max-hp'); },

  // 戰鬥角色欄
  get playerCombatant() { return document.getElementById('player-combatant'); },
  get playerAvatarCard() { return document.getElementById('player-avatar-card'); },
  get playerAvatarEmoji() { return document.getElementById('player-avatar-emoji'); },
  get playerNameLabel() { return document.getElementById('player-name-label'); },
  get playerHp() { return document.getElementById('player-hp'); },
  get playerHpFill() { return document.getElementById('player-hp-fill'); },
  get playerShieldFill() { return document.getElementById('player-shield-fill'); },
  get playerShieldBadge() { return document.getElementById('player-shield-badge'); },

  get bossCombatant() { return document.getElementById('boss-combatant'); },
  get bossAvatarCard() { return document.getElementById('boss-avatar-card'); },
  get bossAvatarEmoji() { return document.getElementById('boss-avatar-emoji'); },
  get bossNameLabel() { return document.getElementById('boss-name-label'); },
  get bossHp() { return document.getElementById('boss-hp'); },
  get bossHpFill() { return document.getElementById('boss-hp-fill'); },
  get bossShieldFill() { return document.getElementById('boss-shield-fill'); },
  get bossShieldBadge() { return document.getElementById('boss-shield-badge'); },

  get damagePopupOverlay() { return document.getElementById('damage-popup-overlay'); },
  get combatLog() { return document.getElementById('combat-log'); },
  get roundNum() { return document.getElementById('round-num'); },
  get currentLevelBadge() { return document.getElementById('current-level-badge'); },
  get currentLevelTitle() { return document.getElementById('current-level-title'); },

  // 答題卡與計時器
  get turnAnnouncer() { return document.getElementById('turn-announcer'); },
  get activePlayerName() { return document.getElementById('active-player-name'); },
  get timerText() { return document.getElementById('timer-text'); },
  get timerBar() { return document.getElementById('timer-bar'); },
  get questionFormula() { return document.getElementById('question-formula'); },
  get optionsContainer() { return document.getElementById('options-container'); },

  // 結算畫面
  get resultIcon() { return document.getElementById('result-icon'); },
  get winnerTitle() { return document.getElementById('winner-title'); },
  get winnerReason() { return document.getElementById('winner-reason'); },
  get statRounds() { return document.getElementById('stat-rounds'); },
  get statCorrectCount() { return document.getElementById('stat-correct-count'); },
  get statAccuracy() { return document.getElementById('stat-accuracy'); },

  // 隨機事件彈窗
  get modalCard() { return document.getElementById('modal-card'); },
  get modalBadge() { return document.getElementById('modal-badge'); },
  get modalTitle() { return document.getElementById('modal-title'); },
  get modalDesc() { return document.getElementById('modal-desc'); },
  get modalFormula() { return document.getElementById('modal-formula'); },
  get modalOptions() { return document.getElementById('modal-options'); },

  // PvP 元素
  get pvpLayout() { return document.getElementById('pvp-layout'); },
  get campaignLayout() { return document.getElementById('campaign-layout'); },
  get btnPvpHome() { return document.getElementById('btn-pvp-home'); },
  get btnPvpReset() { return document.getElementById('btn-pvp-reset'); },
  get pvpMatchTimeText() { return document.getElementById('pvp-match-time-text'); },

  // Player 1 PvP
  get pvpP1MyHp() { return document.getElementById('pvp-p1-my-hp'); },
  get pvpP1MyHpFill() { return document.getElementById('pvp-p1-my-hp-fill'); },
  get pvpP1OpHp() { return document.getElementById('pvp-p1-op-hp'); },
  get pvpP1OpHpFill() { return document.getElementById('pvp-p1-op-hp-fill'); },
  get pvpP1TimerBar() { return document.getElementById('pvp-p1-timer-bar'); },
  get pvpP1Formula() { return document.getElementById('pvp-p1-formula'); },
  get pvpP1Options() { return document.getElementById('pvp-p1-options'); },
  get pvpP1Overlay() { return document.getElementById('pvp-p1-overlay'); },

  // Player 2 PvP
  get pvpP2MyHp() { return document.getElementById('pvp-p2-my-hp'); },
  get pvpP2MyHpFill() { return document.getElementById('pvp-p2-my-hp-fill'); },
  get pvpP2OpHp() { return document.getElementById('pvp-p2-op-hp'); },
  get pvpP2OpHpFill() { return document.getElementById('pvp-p2-op-hp-fill'); },
  get pvpP2TimerBar() { return document.getElementById('pvp-p2-timer-bar'); },
  get pvpP2Formula() { return document.getElementById('pvp-p2-formula'); },
  get pvpP2Options() { return document.getElementById('pvp-p2-options'); },
  get pvpP2Overlay() { return document.getElementById('pvp-p2-overlay'); },
  get battleArena() { return document.querySelector('.battle-arena'); },
  
  // 線上連線 UI 元素
  get onlineSetup() { return document.getElementById('online-setup'); },
  get btnCreateRoom() { return document.getElementById('btn-create-room'); },
  get btnJoinRoom() { return document.getElementById('btn-join-room'); },
  get inputRoomId() { return document.getElementById('input-room-id'); },
  get onlineStatusMessage() { return document.getElementById('online-status-message'); }
};

// ==========================================================================
// 初始化設置
// ==========================================================================
function initApp() {
  setupEventListeners();
  initOnlineSetupUI();
}

function setupEventListeners() {
  // 模式選擇
  DOM.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      synth.playClick();
      DOM.modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GAME_STATE.mode = btn.dataset.mode;
      
      // 線上模式與大廳 UI 連動
      const onlineSetupCard = document.getElementById('online-setup');
      const levelSetupCard = document.getElementById('level-setup');
      if (GAME_STATE.mode === 'online') {
        onlineSetupCard.classList.remove('hidden');
        levelSetupCard.classList.remove('hidden');
        DOM.btnStartGame.classList.add('hidden');
        updateOnlineStatus('請選擇「創建連線房間」或輸入房號後「連線加入」對手。');
      } else {
        onlineSetupCard.classList.add('hidden');
        levelSetupCard.classList.remove('hidden');
        DOM.btnStartGame.classList.remove('hidden');
      }
    });
  });

  // 關卡選擇
  DOM.levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      synth.playClick();
      DOM.levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GAME_STATE.level = parseInt(btn.dataset.level);
    });
  });

  DOM.btnStartGame.addEventListener('click', () => {
    // 線上模式禁止用此按鈕啟動，必須透過 PeerJS 連線後自動啟動
    if (GAME_STATE.mode === 'online') {
      updateOnlineStatus('請先完成連線：創建房間或輸入房號加入！', 'error');
      return;
    }
    GAME_STATE.stage = 1;
    startBattle();
  });
  
  DOM.btnHome.addEventListener('click', () => {
    synth.playClick();
    clearInterval(GAME_STATE.timer);
    showScreen(DOM.startScreen);
  });

  DOM.btnReset.addEventListener('click', startBattle);
  DOM.btnRematch.addEventListener('click', () => {
    if (GAME_STATE.mode === 'online' || GAME_STATE.mode === 'pvp') {
      closeOnlineConnection();
      showScreen(DOM.startScreen);
      return;
    }
    if (GAME_STATE.mode === 'campaign') {
      if (GAME_STATE.bossHp <= 0) {
        // Player won
        if (GAME_STATE.stage < 3) {
          GAME_STATE.stage++;
        } else {
          // Beat stage 3 (the boss)
          if (GAME_STATE.level < 4) {
            GAME_STATE.level++;
            GAME_STATE.stage = 1;
          } else {
            // Already cleared level 4 stage 3
            GAME_STATE.stage = 1;
          }
        }
      } else {
        // Player lost, retry same stage
      }
    }
    startBattle();
  });
  
  DOM.btnResultHome.addEventListener('click', () => {
    synth.playClick();
    if (GAME_STATE.mode === 'online') {
      closeOnlineConnection();
    }
    showScreen(DOM.startScreen);
  });

  // PvP 模式專屬按鈕
  DOM.btnPvpHome.addEventListener('click', () => {
    synth.playClick();
    clearInterval(GAME_STATE.pvp.p1Timer);
    clearInterval(GAME_STATE.pvp.p2Timer);
    clearInterval(GAME_STATE.pvp.matchTimer);
    window.removeEventListener('resize', resizePvPLayout);
    if (GAME_STATE.mode === 'online') {
      closeOnlineConnection();
    }
    showScreen(DOM.startScreen);
  });

  DOM.btnPvpReset.addEventListener('click', startBattle);
}

function showScreen(targetScreen) {
  DOM.startScreen.classList.remove('active');
  DOM.gameScreen.classList.remove('active');
  DOM.resultScreen.classList.remove('active');
  targetScreen.classList.add('active');
}

// ==========================================================================
// 戰鬥初始化與狀態變更
// ==========================================================================
function startBattle() {
  synth.playClick();
  
  // 清理任何 PvP 定時器與監聽
  clearInterval(GAME_STATE.pvp.p1Timer);
  clearInterval(GAME_STATE.pvp.p2Timer);
  clearInterval(GAME_STATE.pvp.matchTimer);
  window.removeEventListener('resize', resizePvPLayout);

  if (GAME_STATE.mode === 'pvp') {
    // 顯示雙人對戰 Layout，隱藏單人 Layout
    DOM.campaignLayout.classList.add('hidden');
    DOM.pvpLayout.classList.remove('hidden');
    DOM.pvpLayout.classList.remove('online-pvp-mode');
    
    // 設定答題時間
    if (GAME_STATE.level === 1) {
      GAME_STATE.pvp.p1TimeLimit = 25;
      GAME_STATE.pvp.p2TimeLimit = 25;
    } else if (GAME_STATE.level === 2) {
      GAME_STATE.pvp.p1TimeLimit = 25;
      GAME_STATE.pvp.p2TimeLimit = 25;
    } else {
      GAME_STATE.pvp.p1TimeLimit = 35;
      GAME_STATE.pvp.p2TimeLimit = 35;
    }

    GAME_STATE.playerHp = 200;
    GAME_STATE.bossHp = 200; // PvP 中 bossHp 作為 Player 2 的 HP
    GAME_STATE.stats.correct = 0;
    GAME_STATE.stats.total = 0;

    updatePvpHPUI();
    updatePvpRoleLabels();
    showScreen(DOM.gameScreen);
    
    // 綁定 resize 監聽並延遲初始化以取得正確的 clientWidth
    window.addEventListener('resize', resizePvPLayout);
    setTimeout(() => {
      resizePvPLayout();
      startPvpTurn(1);
      startPvpTurn(2);
      startPvpMatchTimer();
    }, 500);

  } else {
    // 顯示戰役 Layout，隱藏雙人 Layout
    DOM.campaignLayout.classList.remove('hidden');
    DOM.pvpLayout.classList.add('hidden');
    
    // 重設血量
    GAME_STATE.playerHp = 200;
    GAME_STATE.playerMaxHp = 200;
    GAME_STATE.playerShield = 0;
    GAME_STATE.playerDmgDealt = 0;
    
    const bossMaxHp = STAGE_HP_CONFIG[GAME_STATE.stage];
    GAME_STATE.bossHp = bossMaxHp;
    GAME_STATE.bossMaxHp = bossMaxHp;
    GAME_STATE.bossShield = 0;
    GAME_STATE.bossDmgDealt = 0;
    
    GAME_STATE.round = 1;
    GAME_STATE.activePlayer = 1;
    GAME_STATE.isProcessing = false;
    
    GAME_STATE.stats.correct = 0;
    GAME_STATE.stats.total = 0;
    
    // 時間設定
    if (GAME_STATE.level === 1) GAME_STATE.timeLimit = 25;
    else if (GAME_STATE.level === 2) GAME_STATE.timeLimit = 25;
    else GAME_STATE.timeLimit = 35; // 混合及絕對值給更多時間

    // 畫面配置
    updateRoundUI();
    updateHPBars();
    setupRoleLabels();
    
    showScreen(DOM.gameScreen);
    
    setTimeout(startTurn, 500);
  }
}

// 配置角色名稱與圖案
function setupRoleLabels() {
  const titles = {
    1: '加減算術挑戰',
    2: '乘除運算挑戰',
    3: '進階四則混合',
    4: '進階絕對值大考驗'
  };
  DOM.currentLevelBadge.innerText = `Level ${GAME_STATE.level}`;
  DOM.currentLevelTitle.innerText = titles[GAME_STATE.level];

  if (GAME_STATE.mode === 'pvp') {
    DOM.playerNameLabel.innerText = '勇者 玩家 1';
    DOM.playerAvatarEmoji.innerText = '🧙‍♂️';
    
    DOM.bossNameLabel.innerText = '戰士 玩家 2';
    DOM.bossAvatarEmoji.innerText = '🥷';
    DOM.bossCombatant.classList.remove('boss-theme');
  } else {
    DOM.playerNameLabel.innerText = '勇者 玩家 1';
    DOM.playerAvatarEmoji.innerText = '🧙‍♂️';
    
    const stageNames = {
      1: '輕型機械獸 (關卡 1)',
      2: '精英守衛者 (關卡 2)',
      3: '終極機械魔王 (關卡 3) 👑'
    };
    DOM.bossNameLabel.innerText = stageNames[GAME_STATE.stage] || '負極機械獸';
    DOM.bossAvatarEmoji.innerText = GAME_STATE.stage === 3 ? '🐉' : (GAME_STATE.stage === 2 ? '🤖' : '👾');
  }
}

// 實時線上對決：動態更新「你」與「對手」標籤，套用紅框與左右視角對調
function updatePvpRoleLabels() {
  const p1NameEl = document.getElementById('pvp-p1-name');
  const p2NameEl = document.getElementById('pvp-p2-name');
  if (!p1NameEl || !p2NameEl) return;

  if (GAME_STATE.mode === 'online') {
    if (GAME_STATE.online.role === 'p1') {
      p1NameEl.innerText = '你';
      p2NameEl.innerText = '對手';
    } else {
      p2NameEl.innerText = '你';
      p1NameEl.innerText = '對手';
    }
  } else {
    p1NameEl.innerText = '玩家 1';
    p2NameEl.innerText = '玩家 2';
  }
  
  // 清除本地高亮與對調
  DOM.pvpLayout.classList.remove('pvp-swapped');
  const leftContainer = DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container');
  const rightContainer = DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
  if (leftContainer) leftContainer.classList.remove('pvp-local-highlight');
  if (rightContainer) rightContainer.classList.remove('pvp-local-highlight');

  // 如果是線上對決，套用外框與位置對調
  if (GAME_STATE.mode === 'online') {
    if (GAME_STATE.online.role === 'p1') {
      if (leftContainer) leftContainer.classList.add('pvp-local-highlight');
    } else {
      DOM.pvpLayout.classList.add('pvp-swapped');
      if (rightContainer) rightContainer.classList.add('pvp-local-highlight');
    }
  }
}

function updateRoundUI() {
  DOM.roundNum.innerText = GAME_STATE.round;
}

// 渲染血量與盾牌 (UI)
function updateHPBars() {
  // 玩家 1 HP
  DOM.playerHp.innerText = Math.max(0, GAME_STATE.playerHp);
  const p1Percent = (GAME_STATE.playerHp / GAME_STATE.playerMaxHp) * 100;
  DOM.playerHpFill.style.width = `${Math.max(0, p1Percent)}%`;
  
  const p1ShieldPercent = (GAME_STATE.playerShield / GAME_STATE.playerMaxHp) * 100;
  DOM.playerShieldFill.style.width = `${p1ShieldPercent}%`;
  
  if (GAME_STATE.playerShield > 0) {
    DOM.playerShieldBadge.classList.remove('hidden');
    DOM.playerShieldBadge.innerText = `🛡️ ${GAME_STATE.playerShield}`;
  } else {
    DOM.playerShieldBadge.classList.add('hidden');
  }

  // 玩家 2 / Boss HP
  DOM.bossHp.innerText = Math.max(0, GAME_STATE.bossHp);
  if (DOM.bossMaxHpLabel) {
    DOM.bossMaxHpLabel.innerText = GAME_STATE.bossMaxHp;
  }
  const p2Percent = (GAME_STATE.bossHp / GAME_STATE.bossMaxHp) * 100;
  DOM.bossHpFill.style.width = `${Math.max(0, p2Percent)}%`;
  
  const p2ShieldPercent = (GAME_STATE.bossShield / GAME_STATE.bossMaxHp) * 100;
  DOM.bossShieldFill.style.width = `${p2ShieldPercent}%`;
  
  if (GAME_STATE.bossShield > 0) {
    DOM.bossShieldBadge.classList.remove('hidden');
    DOM.bossShieldBadge.innerText = `🛡️ ${GAME_STATE.bossShield}`;
  } else {
    DOM.bossShieldBadge.classList.add('hidden');
  }
}

// ==========================================================================
// 答題與戰鬥狀態機
// ==========================================================================
function startTurn() {
  if (checkBattleOver()) return;
  GAME_STATE.isProcessing = false;

  // 減少玩家 1 招式冷卻
  if (GAME_STATE.p1Skill2Cd > 0) {
    GAME_STATE.p1Skill2Cd--;
  }
  if (GAME_STATE.p1Skill3Cd > 0) {
    GAME_STATE.p1Skill3Cd--;
  }

  // 更新行動者 UI 提示
  if (GAME_STATE.mode === 'pvp') {
    if (GAME_STATE.activePlayer === 1) {
      DOM.turnAnnouncer.innerHTML = `輪到 <span id="active-player-name" class="text-blue">玩家 1</span> 的回合`;
    } else {
      DOM.turnAnnouncer.innerHTML = `輪到 <span id="active-player-name" class="text-pink">玩家 2</span> 的回合`;
    }
  } else {
    // 戰役模式只有玩家 1 答題
    GAME_STATE.activePlayer = 1;
    DOM.turnAnnouncer.innerHTML = `輪到 <span id="active-player-name" class="text-blue">玩家 1</span> 的心算回合`;
  }

  // 產生新題目
  GAME_STATE.currentQuestion = generateQuestion(GAME_STATE.level, GAME_STATE.stage);
  displayQuestion(GAME_STATE.currentQuestion);
  startTimer();
}

function startTimer() {
  clearInterval(GAME_STATE.timer);
  GAME_STATE.timeLeft = GAME_STATE.timeLimit;
  updateTimerUI();

  GAME_STATE.timer = setInterval(() => {
    GAME_STATE.timeLeft -= 0.1;
    if (GAME_STATE.timeLeft <= 0) {
      clearInterval(GAME_STATE.timer);
      handleTimeout();
    }
    updateTimerUI();
  }, 100);
}

function updateTimerUI() {
  const percent = (GAME_STATE.timeLeft / GAME_STATE.timeLimit) * 100;
  DOM.timerBar.style.width = `${percent}%`;
  DOM.timerText.innerText = Math.max(0, Math.ceil(GAME_STATE.timeLeft));
  
  if (percent < 30) {
    DOM.timerBar.classList.add('warning');
    DOM.timerText.style.color = '#db2777';
  } else {
    DOM.timerBar.classList.remove('warning');
    DOM.timerText.style.color = 'inherit';
  }
}

// 逾時處理
function handleTimeout() {
  if (GAME_STATE.isProcessing) return;
  GAME_STATE.isProcessing = true;
  synth.playWrong();

  GAME_STATE.stats.total++;
  
  writeLog('⏰ 時間到！未能及時答題，遭受反擊！', 'text-pink');
  
  // 被打扣血
  if (GAME_STATE.mode === 'pvp') {
    const defender = GAME_STATE.activePlayer;
    const attacker = defender === 1 ? 2 : 1;
    triggerAttackEffect(attacker, defender, 6, '超時懲罰');
  } else {
    // 戰役模式 Boss 反擊玩家 1
    triggerAttackEffect(2, 1, 6, '超時懲罰');
  }

  setTimeout(nextTurn, 1600);
}

function displayQuestion(q) {
  DOM.questionFormula.innerText = q.formula;
  DOM.optionsContainer.innerHTML = '';

  q.options.forEach((val, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-card';
    btn.dataset.index = idx;

    btn.innerHTML = `
      <div class="card-inner">
        <span class="card-value">${val >= 0 ? '+' + val : val}</span>
      </div>
    `;

    btn.addEventListener('click', () => checkAnswer(idx));
    DOM.optionsContainer.appendChild(btn);
  });
}

// 驗證答案
function checkAnswer(selectedIdx) {
  if (GAME_STATE.isProcessing) return;
  GAME_STATE.isProcessing = true;
  clearInterval(GAME_STATE.timer);

  const q = GAME_STATE.currentQuestion;
  const isCorrect = (selectedIdx === q.correctIdx);
  const cards = DOM.optionsContainer.querySelectorAll('.answer-card');
  
  GAME_STATE.stats.total++;
  
  // 標示選項對錯
  cards[selectedIdx].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) {
    cards[q.correctIdx].classList.add('correct');
  }

  if (isCorrect) {
    GAME_STATE.stats.correct++;
    synth.playLaser();
    
    // 答對了，延遲顯示招式選擇畫面
    setTimeout(showCampaignSkillSelection, 600);
  } else {
    synth.playWrong();
    writeLog(`💥 答錯了！受到電磁反作用力衝擊反彈！`, 'text-pink');
    
    // 答錯反擊：對手反擊答錯的人
    triggerAttackEffect(2, 1, 6, '防衛反擊');
    setTimeout(nextTurn, 1600);
  }
}

// 傷害判定與動畫特效
function triggerAttackEffect(attacker, defender, rawDmg, attackName) {
  // 1. 取得 DOM 節點
  const attackerEl = attacker === 1 ? DOM.playerCombatant : DOM.bossCombatant;
  const defenderEl = defender === 1 ? DOM.playerCombatant : DOM.bossCombatant;
  const attackerCard = attacker === 1 ? DOM.playerAvatarCard : DOM.bossAvatarCard;
  const defenderCard = defender === 1 ? DOM.playerAvatarCard : DOM.bossAvatarCard;
  
  // 1b. 播放怪獸反擊法球動畫
  if (attacker === 2) {
    spawnProjectile(DOM.battleArena, '☄️', 'boss-projectile');
  }
  
  // 2. 播放攻擊者衝撞動畫
  const attackClass = attacker === 1 ? 'player-dash-attack' : 'boss-dash-attack';
  attackerEl.classList.add(attackClass);
  setTimeout(() => {
    attackerEl.classList.remove(attackClass);
  }, 500);

  // 3. 播放防禦者抖動與紅閃受擊動畫 (延遲 200ms 等攻擊衝擊抵達)
  setTimeout(() => {
    defenderEl.classList.add('combatant-shake');
    defenderCard.classList.add('flash-hurt');
    
    setTimeout(() => {
      defenderEl.classList.remove('combatant-shake');
      defenderCard.classList.remove('flash-hurt');
    }, 400);

    // 4. 計算護盾抵扣
    let dmg = rawDmg;
    let shieldDmg = 0;
    let actualDmg = 0;

    if (defender === 1) {
      // 扣減玩家 1
      if (GAME_STATE.playerShield >= dmg) {
        GAME_STATE.playerShield -= dmg;
        shieldDmg = dmg;
      } else {
        shieldDmg = GAME_STATE.playerShield;
        actualDmg = dmg - shieldDmg;
        GAME_STATE.playerShield = 0;
        GAME_STATE.playerHp -= actualDmg;
      }
      GAME_STATE.bossDmgDealt += dmg;
    } else {
      // 扣減玩家 2 / Boss
      if (GAME_STATE.bossShield >= dmg) {
        GAME_STATE.bossShield -= dmg;
        shieldDmg = dmg;
      } else {
        shieldDmg = GAME_STATE.bossShield;
        actualDmg = dmg - shieldDmg;
        GAME_STATE.bossShield = 0;
        GAME_STATE.bossHp -= actualDmg;
      }
      GAME_STATE.playerDmgDealt += dmg;
    }

    // 5. 渲染浮動傷害數字
    const rect = defenderEl.getBoundingClientRect();
    const parentRect = DOM.damagePopupOverlay.getBoundingClientRect();
    
    const popupX = rect.left + rect.width / 2 - parentRect.left;
    const popupY = rect.top + rect.height / 3 - parentRect.top;
    
    // 生成受擊傷害氣泡
    if (actualDmg > 0) {
      spawnDamageText(`-${actualDmg} HP`, popupX, popupY, defender === 1 ? 'dmg-player' : 'dmg-boss');
    }
    if (shieldDmg > 0) {
      spawnDamageText(`-${shieldDmg} 🛡️`, popupX, popupY + 22, 'dmg-shield');
    }

    synth.playExplosion();
    updateHPBars();
  }, 200);
}

function spawnDamageText(text, x, y, className) {
  const el = document.createElement('div');
  el.className = `float-damage ${className}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerText = text;
  
  DOM.damagePopupOverlay.appendChild(el);
  
  // 動畫結束後移除
  setTimeout(() => el.remove(), 900);
}

// 回合轉換
function nextTurn() {
  if (checkBattleOver()) return;

  // 清除選擇高亮
  const cards = DOM.optionsContainer.querySelectorAll('.answer-card');
  cards.forEach(c => c.classList.remove('correct', 'wrong'));

  if (GAME_STATE.mode === 'pvp') {
    // PvP 模式輪流答題
    GAME_STATE.activePlayer = GAME_STATE.activePlayer === 1 ? 2 : 1;
    if (GAME_STATE.activePlayer === 1) {
      GAME_STATE.round++;
      updateRoundUI();
    }
  } else {
    // 戰役模式只有玩家 1 答題
    GAME_STATE.round++;
    updateRoundUI();
  }

  startTurn();
}

// 檢查結束條件
function checkBattleOver() {
  let isOver = false;
  let winner = 0;
  let reason = '';

  if (GAME_STATE.bossHp <= 0) {
    winner = 1;
    reason = GAME_STATE.mode === 'pvp' ? '🔵 玩家 1 成功擊敗玩家 2！' : '🔵 率先擊破機械獸防禦核心！';
    isOver = true;
  } else if (GAME_STATE.playerHp <= 0) {
    winner = 2;
    reason = GAME_STATE.mode === 'pvp' ? '🔴 玩家 2 成功擊敗玩家 1！' : '🔴 勇者 HP 歸零，機械核心防守成功！';
    isOver = true;
  } else if (GAME_STATE.round > GAME_STATE.maxRounds) {
    isOver = true;
    // 比較剩餘血量比例
    const p1Ratio = GAME_STATE.playerHp / GAME_STATE.playerMaxHp;
    const p2Ratio = GAME_STATE.bossHp / GAME_STATE.bossMaxHp;

    if (p1Ratio > p2Ratio) {
      winner = 1;
      reason = `⏰ 達到 12 回合上限！我方血量比例占優 (${Math.round(p1Ratio*100)}% vs ${Math.round(p2Ratio*100)}%)`;
    } else if (p2Ratio > p1Ratio) {
      winner = 2;
      reason = GAME_STATE.mode === 'pvp' ? `⏰ 達到 12 回合上限！玩家 2 血量占優` : `⏰ 達到 12 回合上限！機械獸防禦成功`;
    } else {
      winner = 0;
      reason = '⏰ 達到 12 回合上限，兩方剩餘血量比例完全一致！';
    }
  }

  if (isOver) {
    clearInterval(GAME_STATE.timer);
    showBattleResult(winner, reason);
    return true;
  }
  return false;
}

function showBattleResult(winner, reason) {
  synth.playWin();

  if (GAME_STATE.mode === 'online') {
    const isMyWin = (winner === 1 && GAME_STATE.online.role === 'p1') || (winner === 2 && GAME_STATE.online.role === 'p2');
    if (winner === 0) {
      DOM.winnerTitle.innerText = '勢均力敵，平局！';
      DOM.winnerTitle.className = 'winner-title';
      DOM.resultIcon.innerText = '🤝';
    } else if (isMyWin) {
      DOM.winnerTitle.innerText = '你 獲得勝利！';
      DOM.winnerTitle.className = 'winner-title text-blue';
      DOM.resultIcon.innerText = '🏆';
    } else {
      DOM.winnerTitle.innerText = '對手 獲得勝利！';
      DOM.winnerTitle.className = 'winner-title text-pink';
      DOM.resultIcon.innerText = '💥';
    }
  } else {
    if (winner === 1) {
      DOM.winnerTitle.innerText = GAME_STATE.mode === 'pvp' ? '玩家 1 獲得勝利！' : '戰役突破成功！';
      DOM.winnerTitle.className = 'winner-title text-blue';
      DOM.resultIcon.innerText = '🏆';
    } else if (winner === 2) {
      const name = GAME_STATE.mode === 'pvp' ? '玩家 2' : '機械獸';
      DOM.winnerTitle.innerText = `${name} 獲得勝利！`;
      DOM.winnerTitle.className = 'winner-title text-pink';
      DOM.resultIcon.innerText = GAME_STATE.mode === 'pvp' ? '🏆' : '💥';
    } else {
      DOM.winnerTitle.innerText = '勢均力敵，平局！';
      DOM.winnerTitle.className = 'winner-title';
      DOM.resultIcon.innerText = '🤝';
    }
  }

  DOM.winnerReason.innerText = reason;
  DOM.statRounds.innerText = GAME_STATE.mode === 'pvp' ? '實時對決' : `${Math.min(GAME_STATE.round, GAME_STATE.maxRounds)} 回合`;
  
  if (GAME_STATE.mode === 'pvp') {
    DOM.statCorrectCount.innerText = '即時對戰';
    DOM.statAccuracy.innerText = '100% 鬥志';
  } else {
    DOM.statCorrectCount.innerText = `${GAME_STATE.stats.correct} 題`;
    const total = GAME_STATE.stats.total || 1;
    const accuracy = Math.round((GAME_STATE.stats.correct / total) * 100);
    DOM.statAccuracy.innerText = `${accuracy}%`;
  }

  // 更新 Rematch 按鈕的文字顯示
  const rematchText = DOM.btnRematch.querySelector('span');
  if (rematchText) {
    if (GAME_STATE.mode === 'campaign') {
      if (winner === 1) {
        if (GAME_STATE.stage < 3) {
          const nextStage = GAME_STATE.stage + 1;
          rematchText.innerText = `挑戰關卡升級 (關卡 ${nextStage} - HP: ${STAGE_HP_CONFIG[nextStage]})`;
        } else {
          if (GAME_STATE.level < 4) {
            rematchText.innerText = `進入 Level ${GAME_STATE.level + 1}`;
          } else {
            rematchText.innerText = `重新挑戰 Level 4`;
          }
        }
      } else {
        rematchText.innerText = `重新挑戰 (關卡 ${GAME_STATE.stage})`;
      }
    } else {
      rematchText.innerText = `再玩一次`;
    }
  }

  showScreen(DOM.resultScreen);
}

// ==========================================================================
// 課本隨機加分事件 (溫度計、水庫、中點)
// ==========================================================================
function triggerRandomTextbookEvent() {
  clearInterval(GAME_STATE.timer);
  const type = Math.floor(Math.random() * 3) + 1;

  if (type === 1) {
    // A: 溫度計溫差題
    DOM.modalBadge.innerText = '溫度計戰術事件';
    DOM.modalTitle.innerText = '❄️ 溫度算術大突襲！';
    DOM.modalDesc.innerText = '算出正確的高低溫差，即可發動「溫度冰封爆擊」對敵方造成 18 點巨額傷害！';
    
    const high = 35;
    const low = -15;
    const ans = high - low; // 50
    DOM.modalFormula.innerText = `高溫為 ${high}°C，低溫為 ${low}°C，相差？`;

    const options = generateUniqueOptions(ans, [-50, 20, -20, 45, 55]);
    renderModalButtons(options, ans, (btn, val) => resolveTextbookEvent(val === ans, 18, 0, '溫度冰封爆擊'));
  } 
  else if (type === 2) {
    // B: 水庫水位乘法題
    DOM.modalBadge.innerText = '水庫水位戰術事件';
    DOM.modalTitle.innerText = '🌊 水位乘除大突襲！';
    DOM.modalDesc.innerText = '算出正確的水庫水位變化，即可召喚「水流脈衝」為自己加持 8 點護盾值！';

    const change = -3; // 每天下降 3 公分
    const daysAgo = -3; // 3天前
    const ans = change * daysAgo; // 9
    DOM.modalFormula.innerText = `每天水位變化為 ${change} 公分，${Math.abs(daysAgo)} 天前的變化量為？`;

    const options = generateUniqueOptions(ans, [-9, -6, 6, 12, -12]);
    renderModalButtons(options, ans, (btn, val) => resolveTextbookEvent(val === ans, 0, 8, '水流防禦盾'));
  } 
  else {
    // C: 中點坐標題
    DOM.modalBadge.innerText = '中點防禦事件';
    DOM.modalTitle.innerText = '🎁 中點坐標定位！';
    DOM.modalDesc.innerText = '定位出兩名玩家坐標的中點，即可獲得 10 點護盾，並對敵方造成 10 點重創！';

    // 取得當前血量模擬坐標，避免全部為正數 (p1, p2, ans 至少有一個小於 0)
    let p1Coord, p2Coord, ans;
    do {
      p1Coord = getRandomInteger(-12, 12, [0]);
      p2Coord = getRandomInteger(-12, 12, [0, -p1Coord]); // 避免和為0
      ans = Math.round((p1Coord + p2Coord) / 2);
    } while (p1Coord > 0 && p2Coord > 0 && ans > 0);
    DOM.modalFormula.innerText = `A(${p1Coord >= 0 ? '+' + p1Coord : p1Coord}) 與 B(${p2Coord >= 0 ? '+' + p2Coord : p2Coord}) 的中點為？`;

    const options = generateUniqueOptions(ans, [-1, 1, -2, 2, -5, 5]);
    renderModalButtons(options, ans, (btn, val) => resolveTextbookEvent(val === ans, 10, 10, '中點衝擊波'));
  }

  DOM.modalOverlay.classList.remove('hidden');
}

function renderModalButtons(options, correctVal, onChoose) {
  DOM.modalOptions.innerHTML = '';
  options.forEach(val => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-btn';
    btn.innerText = val >= 0 ? `+${val}` : val;
    btn.addEventListener('click', () => {
      onChoose(btn, val);
    });
    DOM.modalOptions.appendChild(btn);
  });
}

function resolveTextbookEvent(isSuccess, dmg, shield, actionName) {
  const btns = DOM.modalOptions.querySelectorAll('.modal-btn');
  btns.forEach(b => b.disabled = true);

  const attacker = GAME_STATE.activePlayer;
  const defender = attacker === 1 ? 2 : 1;

  if (isSuccess) {
    synth.playChime ? synth.playChime() : synth.playPowerUp();
    writeLog(`🚀 事件挑戰成功！成功發動了「${actionName}」！`, 'text-blue');
    
    // 應用獎勵
    if (dmg > 0) {
      triggerAttackEffect(attacker, defender, dmg, actionName);
    }
    if (shield > 0) {
      if (attacker === 1) {
        GAME_STATE.playerShield += shield;
        if (GAME_STATE.playerShield > 15) GAME_STATE.playerShield = 15;
      } else {
        GAME_STATE.bossShield += shield;
        if (GAME_STATE.bossShield > 15) GAME_STATE.bossShield = 15;
      }
      updateHPBars();
      
      // 顯示護盾泡
      const targetEl = attacker === 1 ? DOM.playerCombatant : DOM.bossCombatant;
      const rect = targetEl.getBoundingClientRect();
      const parentRect = DOM.damagePopupOverlay.getBoundingClientRect();
      spawnDamageText(`+${shield} 🛡️`, rect.left + rect.width / 2 - parentRect.left, rect.top + rect.height / 3 - parentRect.top, 'dmg-shield');
    }
  } else {
    synth.playWrong();
    writeLog(`💥 事件挑戰失敗！被反噬造成反作用力扣血！`, 'text-pink');
    triggerAttackEffect(defender, attacker, 4, '能量回流反噬');
  }

  setTimeout(() => {
    DOM.modalOverlay.classList.add('hidden');
    nextTurn();
  }, 1600);
}

// ==========================================================================
// 雙人對抗 (PvP Split Screen) 邏輯與輔助函式
// ==========================================================================
function resizePvPLayout() {
  const layout = DOM.pvpLayout;
  if (!layout || layout.classList.contains('hidden')) return;
  const rect = layout.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const halfW = w / 2;
  
  // 動態調整旋轉容器的寬高（寬度設為父容器高度，高度設為父容器半寬）
  document.documentElement.style.setProperty('--pvp-rotated-width', `${h}px`);
  document.documentElement.style.setProperty('--pvp-rotated-height', `${halfW}px`);
}

function startPvpTurn(playerId) {
  if (checkPvpGameOver()) return;
  
  const isLocal = (GAME_STATE.mode !== 'online') || 
                  (playerId === 1 && GAME_STATE.online.role === 'p1') || 
                  (playerId === 2 && GAME_STATE.online.role === 'p2');
  
  if (playerId === 1) {
    if (GAME_STATE.p1Skill2Cd > 0) {
      GAME_STATE.p1Skill2Cd--;
    }
    if (GAME_STATE.p1Skill3Cd > 0) {
      GAME_STATE.p1Skill3Cd--;
    }
    GAME_STATE.pvp.p1IsProcessing = false;
    
    if (isLocal) {
      GAME_STATE.pvp.p1Question = generateQuestion(GAME_STATE.level, getRandomInteger(1, 3));
      if (GAME_STATE.mode === 'online') {
        sendOnlineMessage({
          type: 'sync_question',
          playerId: 1,
          question: GAME_STATE.pvp.p1Question
        });
      }
      displayPvpQuestion(1, GAME_STATE.pvp.p1Question);
      startPvpTimer(1);
    }
  } else {
    if (GAME_STATE.p2Skill2Cd > 0) {
      GAME_STATE.p2Skill2Cd--;
    }
    if (GAME_STATE.p2Skill3Cd > 0) {
      GAME_STATE.p2Skill3Cd--;
    }
    GAME_STATE.pvp.p2IsProcessing = false;
    
    if (isLocal) {
      GAME_STATE.pvp.p2Question = generateQuestion(GAME_STATE.level, getRandomInteger(1, 3));
      if (GAME_STATE.mode === 'online') {
        sendOnlineMessage({
          type: 'sync_question',
          playerId: 2,
          question: GAME_STATE.pvp.p2Question
        });
      }
      displayPvpQuestion(2, GAME_STATE.pvp.p2Question);
      startPvpTimer(2);
    }
  }
}

function startPvpTimer(playerId) {
  if (playerId === 1) {
    clearInterval(GAME_STATE.pvp.p1Timer);
    GAME_STATE.pvp.p1TimeLeft = GAME_STATE.pvp.p1TimeLimit;
    updatePvpTimerUI(1);
    
    GAME_STATE.pvp.p1Timer = setInterval(() => {
      GAME_STATE.pvp.p1TimeLeft -= 0.1;
      if (GAME_STATE.pvp.p1TimeLeft <= 0) {
        clearInterval(GAME_STATE.pvp.p1Timer);
        handlePvpTimeout(1);
      }
      updatePvpTimerUI(1);
    }, 100);
  } else {
    clearInterval(GAME_STATE.pvp.p2Timer);
    GAME_STATE.pvp.p2TimeLeft = GAME_STATE.pvp.p2TimeLimit;
    updatePvpTimerUI(2);
    
    GAME_STATE.pvp.p2Timer = setInterval(() => {
      GAME_STATE.pvp.p2TimeLeft -= 0.1;
      if (GAME_STATE.pvp.p2TimeLeft <= 0) {
        clearInterval(GAME_STATE.pvp.p2Timer);
        handlePvpTimeout(2);
      }
      updatePvpTimerUI(2);
    }, 100);
  }
}

function updatePvpTimerUI(playerId) {
  if (playerId === 1) {
    const percent = (GAME_STATE.pvp.p1TimeLeft / GAME_STATE.pvp.p1TimeLimit) * 100;
    const bar = DOM.pvpP1TimerBar;
    if (bar) {
      bar.style.width = `${percent}%`;
      if (percent < 30) {
        bar.classList.add('warning');
      } else {
        bar.classList.remove('warning');
      }
    }
  } else {
    const percent = (GAME_STATE.pvp.p2TimeLeft / GAME_STATE.pvp.p2TimeLimit) * 100;
    const bar = DOM.pvpP2TimerBar;
    if (bar) {
      bar.style.width = `${percent}%`;
      if (percent < 30) {
        bar.classList.add('warning');
      } else {
        bar.classList.remove('warning');
      }
    }
  }
}

function handlePvpTimeout(playerId) {
  if (playerId === 1) {
    if (GAME_STATE.pvp.p1IsProcessing) return;
    GAME_STATE.pvp.p1IsProcessing = true;
    synth.playWrong();
    
    GAME_STATE.playerHp = Math.max(0, GAME_STATE.playerHp - 6);
    updatePvpHPUI();
    flashPvpOverlay(1, 'wrong');
    
    const container = DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container');
    spawnProjectile(container, '☄️', 'pvp-boss-projectile');
    
    if (GAME_STATE.mode === 'online') {
      sendOnlineMessage({
        type: 'timeout',
        playerId: 1
      });
    }
    
    setTimeout(() => {
      startPvpTurn(1);
    }, 800);
  } else {
    if (GAME_STATE.pvp.p2IsProcessing) return;
    GAME_STATE.pvp.p2IsProcessing = true;
    synth.playWrong();
    
    GAME_STATE.bossHp = Math.max(0, GAME_STATE.bossHp - 6);
    updatePvpHPUI();
    flashPvpOverlay(2, 'wrong');
    
    const container = DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
    spawnProjectile(container, '☄️', 'pvp-boss-projectile');
    
    if (GAME_STATE.mode === 'online') {
      sendOnlineMessage({
        type: 'timeout',
        playerId: 2
      });
    }
    
    setTimeout(() => {
      startPvpTurn(2);
    }, 800);
  }
}

function displayPvpQuestion(playerId, q) {
  const formulaEl = playerId === 1 ? DOM.pvpP1Formula : DOM.pvpP2Formula;
  const optionsEl = playerId === 1 ? DOM.pvpP1Options : DOM.pvpP2Options;
  
  if (!formulaEl || !optionsEl) return;
  
  formulaEl.innerText = q.formula;
  optionsEl.innerHTML = '';
  optionsEl.classList.remove('skills-view');
  
  const isLocal = (GAME_STATE.mode !== 'online') || 
                  (playerId === 1 && GAME_STATE.online.role === 'p1') || 
                  (playerId === 2 && GAME_STATE.online.role === 'p2');
  
  q.options.forEach((val, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pvp-btn';
    btn.innerText = val >= 0 ? `+${val}` : val;
    if (isLocal) {
      btn.addEventListener('click', () => checkPvpAnswer(playerId, idx));
    } else {
      btn.classList.add('disabled');
      btn.disabled = true;
    }
    optionsEl.appendChild(btn);
  });
}

function spawnProjectile(parentEl, emoji, className) {
  if (!parentEl) return;
  const proj = document.createElement('div');
  proj.className = `skill-projectile ${className}`;
  proj.innerText = emoji;
  parentEl.appendChild(proj);
  setTimeout(() => {
    proj.remove();
  }, 800);
}

function playSkillEffects(attacker, defender, skillNum, dmg, skillName) {
  // 1. Play sound
  if (skillNum === 1) {
    synth.playSkill1();
  } else if (skillNum === 2) {
    synth.playSkill2();
  } else if (skillNum === 3) {
    synth.playSkill3();
  }
  
  // 2. Play projectile animation
  if (attacker === 1) {
    const emojis = { 1: '🚀', 2: '⚡', 3: '⚔️' };
    const classes = { 1: 'missile-projectile', 2: 'lightning-projectile', 3: 'slash-projectile' };
    spawnProjectile(DOM.battleArena, emojis[skillNum], classes[skillNum]);
  }
  
  // 3. Play flash effect on the defender's avatar card
  const targetCard = defender === 1 ? DOM.playerAvatarCard : DOM.bossAvatarCard;
  let flashClass = '';
  if (skillNum === 1) flashClass = 'flash-missile';
  else if (skillNum === 2) flashClass = 'flash-lightning';
  else if (skillNum === 3) flashClass = 'flash-ultimate';
  
  if (targetCard && flashClass) {
    targetCard.classList.add(flashClass);
    setTimeout(() => targetCard.classList.remove(flashClass), 800);
  }
  
  // 4. Play screen shake for Skill 3
  if (skillNum === 3) {
    DOM.gameScreen.classList.add('shake-screen-active');
    setTimeout(() => DOM.gameScreen.classList.remove('shake-screen-active'), 500);
  }
  
  // 5. Trigger the base attack animations and HP deductions
  triggerAttackEffect(attacker, defender, dmg, skillName);
}

function playPvpSkillEffects(attackerId, defenderId, skillNum, dmg, skillName) {
  // 1. Play sound
  if (skillNum === 1) {
    synth.playSkill1();
  } else if (skillNum === 2) {
    synth.playSkill2();
  } else if (skillNum === 3) {
    synth.playSkill3();
  }
  
  // 2. Determine emojis and classes for PvP
  const emojis = { 1: '🚀', 2: '⚡', 3: '⚔️' };
  const skillTypes = { 1: 'missile', 2: 'lightning', 3: 'slash' };
  
  const attackerContainer = attackerId === 1 ? DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container') : DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
  const defenderContainer = defenderId === 1 ? DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container') : DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
  
  if (attackerContainer) {
    spawnProjectile(attackerContainer, emojis[skillNum], `pvp-${skillTypes[skillNum]}-projectile`);
  }
  if (defenderContainer) {
    spawnProjectile(defenderContainer, emojis[skillNum], 'pvp-boss-projectile');
  }
  
  // 3. Play flash effect on the defender's PvP half container or overlay
  const defenderOverlay = defenderId === 1 ? DOM.pvpP1Overlay : DOM.pvpP2Overlay;
  let flashClass = '';
  if (skillNum === 1) flashClass = 'flash-missile';
  else if (skillNum === 2) flashClass = 'flash-lightning';
  else if (skillNum === 3) flashClass = 'flash-ultimate';
  
  if (defenderOverlay && flashClass) {
    defenderOverlay.classList.add(flashClass);
    setTimeout(() => defenderOverlay.classList.remove(flashClass), 800);
  }
  
  // 4. Play screen shake for Skill 3
  if (skillNum === 3) {
    DOM.gameScreen.classList.add('shake-screen-active');
    setTimeout(() => DOM.gameScreen.classList.remove('shake-screen-active'), 500);
  }
  
  // 5. Flash correct overlay on attacker
  const attackerOverlay = attackerId === 1 ? DOM.pvpP1Overlay : DOM.pvpP2Overlay;
  if (attackerOverlay) {
    attackerOverlay.classList.add('flash-correct');
    setTimeout(() => attackerOverlay.classList.remove('flash-correct'), 300);
  }

  // 6. Apply damage and update UI
  if (defenderId === 1) {
    GAME_STATE.playerHp = Math.max(0, GAME_STATE.playerHp - dmg);
  } else {
    GAME_STATE.bossHp = Math.max(0, GAME_STATE.bossHp - dmg);
  }
  updatePvpHPUI();
}


function showCampaignSkillSelection() {
  writeLog(`🎉 答對了！請選擇招式進行攻擊！`, 'text-blue');
  
  DOM.optionsContainer.innerHTML = '';
  DOM.optionsContainer.classList.add('skills-view');
  
  const skills = [
    { name: '魔法飛彈', minDmg: 5, maxDmg: 8, cd: 0, desc: '威力 5-8 (無冷卻)' },
    { name: '雷火術', minDmg: 9, maxDmg: 13, cd: 2, desc: '威力 9-13 (冷卻 2 回合)' },
    { name: '終極神兵斬', minDmg: 17, maxDmg: 22, cd: 3, desc: '威力 17-22 (冷卻 3 回合)' }
  ];
  
  skills.forEach((skill, idx) => {
    const card = document.createElement('div');
    card.className = 'skill-card';
    
    let isCd = false;
    let currentCd = 0;
    if (idx === 1 && GAME_STATE.p1Skill2Cd > 0) {
      isCd = true;
      currentCd = GAME_STATE.p1Skill2Cd;
    } else if (idx === 2 && GAME_STATE.p1Skill3Cd > 0) {
      isCd = true;
      currentCd = GAME_STATE.p1Skill3Cd;
    }
    
    if (isCd) {
      card.classList.add('disabled');
      card.innerHTML = `
        <span class="skill-name">${skill.name}</span>
        <span class="skill-desc">冷卻中 (剩 ${currentCd} 回合)</span>
      `;
    } else {
      card.innerHTML = `
        <span class="skill-name">${skill.name}</span>
        <span class="skill-desc">${skill.desc}</span>
      `;
      card.addEventListener('click', () => {
        DOM.optionsContainer.classList.remove('skills-view');
        DOM.optionsContainer.innerHTML = '';
        
        if (idx === 1) {
          GAME_STATE.p1Skill2Cd = 2;
        } else if (idx === 2) {
          GAME_STATE.p1Skill3Cd = 3;
        }
        
        const dmg = getRandomInteger(skill.minDmg, skill.maxDmg);
        writeLog(`⚔️ 玩家 1 使用了「${skill.name}」！`, 'text-blue');
        
        playSkillEffects(1, 2, idx + 1, dmg, skill.name);
        
        setTimeout(nextTurn, 1600);
      });
    }
    DOM.optionsContainer.appendChild(card);
  });
}

function showPvpSkillSelection(playerId) {
  const optionsEl = playerId === 1 ? DOM.pvpP1Options : DOM.pvpP2Options;
  if (!optionsEl) return;
  
  const isLocal = (GAME_STATE.mode !== 'online') || 
                  (playerId === 1 && GAME_STATE.online.role === 'p1') || 
                  (playerId === 2 && GAME_STATE.online.role === 'p2');
                  
  if (!isLocal) {
    optionsEl.innerHTML = '<div style="font-size:0.9rem; color:var(--text-light-gray); font-weight:700; text-align:center; width:100%; padding:15px;">對手正在選擇招式...</div>';
    return;
  }
  
  optionsEl.innerHTML = '';
  optionsEl.classList.add('skills-view');
  
  const skills = [
    { name: '魔法飛彈', minDmg: 5, maxDmg: 8, cd: 0, desc: '威力 5-8 (無CD)' },
    { name: '雷火術', minDmg: 9, maxDmg: 13, cd: 2, desc: '威力 9-13 (CD 2)' },
    { name: '神兵斬', minDmg: 17, maxDmg: 22, cd: 3, desc: '威力 17-22 (CD 3)' }
  ];
  
  const skill2Cd = playerId === 1 ? GAME_STATE.p1Skill2Cd : GAME_STATE.p2Skill2Cd;
  const skill3Cd = playerId === 1 ? GAME_STATE.p1Skill3Cd : GAME_STATE.p2Skill3Cd;
  
  skills.forEach((skill, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pvp-skill-btn';
    
    let isCd = false;
    let currentCd = 0;
    if (idx === 1 && skill2Cd > 0) {
      isCd = true;
      currentCd = skill2Cd;
    } else if (idx === 2 && skill3Cd > 0) {
      isCd = true;
      currentCd = skill3Cd;
    }
    
    if (isCd) {
      btn.classList.add('disabled');
      btn.innerHTML = `
        <span class="skill-name">${skill.name}</span>
        <span class="skill-desc">CD: ${currentCd}</span>
      `;
    } else {
      btn.innerHTML = `
        <span class="skill-name">${skill.name}</span>
        <span class="skill-desc">${skill.desc}</span>
      `;
      btn.addEventListener('click', () => {
        optionsEl.classList.remove('skills-view');
        optionsEl.innerHTML = '';
        
        if (idx === 1) {
          if (playerId === 1) GAME_STATE.p1Skill2Cd = 2;
          else GAME_STATE.p2Skill2Cd = 2;
        } else if (idx === 2) {
          if (playerId === 1) GAME_STATE.p1Skill3Cd = 3;
          else GAME_STATE.p2Skill3Cd = 3;
        }
        
        const dmg = getRandomInteger(skill.minDmg, skill.maxDmg);
        const defenderId = playerId === 1 ? 2 : 1;
        
        playPvpSkillEffects(playerId, defenderId, idx + 1, dmg, skill.name);
        
        if (GAME_STATE.mode === 'online') {
          sendOnlineMessage({
            type: 'use_skill',
            attackerId: playerId,
            skillNum: idx + 1,
            dmg: dmg,
            skillName: skill.name
          });
        }
        
        setTimeout(() => {
          startPvpTurn(playerId);
        }, 1200);
      });
    }
    optionsEl.appendChild(btn);
  });
}

function checkPvpAnswer(playerId, selectedIdx) {
  if (playerId === 1) {
    if (GAME_STATE.pvp.p1IsProcessing) return;
    GAME_STATE.pvp.p1IsProcessing = true;
    clearInterval(GAME_STATE.pvp.p1Timer);
    
    const q = GAME_STATE.pvp.p1Question;
    const isCorrect = (selectedIdx === q.correctIdx);
    const buttons = DOM.pvpP1Options.querySelectorAll('.pvp-btn');
    
    buttons[selectedIdx].classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      buttons[q.correctIdx].classList.add('correct');
    }
    
    if (isCorrect) {
      synth.playLaser();
      if (GAME_STATE.mode === 'online') {
        sendOnlineMessage({
          type: 'state_change',
          playerId: 1,
          state: 'selecting_skill'
        });
      }
      setTimeout(() => {
        showPvpSkillSelection(1);
      }, 600);
    } else {
      synth.playWrong();
      GAME_STATE.playerHp = Math.max(0, GAME_STATE.playerHp - 6);
      flashPvpOverlay(1, 'wrong');
      const container = DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container');
      spawnProjectile(container, '☄️', 'pvp-boss-projectile');
      updatePvpHPUI();
      if (GAME_STATE.mode === 'online') {
        sendOnlineMessage({
          type: 'wrong_answer',
          playerId: 1
        });
      }
      setTimeout(() => {
        startPvpTurn(1);
      }, 1000);
    }
  } else {
    if (GAME_STATE.pvp.p2IsProcessing) return;
    GAME_STATE.pvp.p2IsProcessing = true;
    clearInterval(GAME_STATE.pvp.p2Timer);
    
    const q = GAME_STATE.pvp.p2Question;
    const isCorrect = (selectedIdx === q.correctIdx);
    const buttons = DOM.pvpP2Options.querySelectorAll('.pvp-btn');
    
    buttons[selectedIdx].classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      buttons[q.correctIdx].classList.add('correct');
    }
    
    if (isCorrect) {
      synth.playLaser();
      if (GAME_STATE.mode === 'online') {
        sendOnlineMessage({
          type: 'state_change',
          playerId: 2,
          state: 'selecting_skill'
        });
      }
      setTimeout(() => {
        showPvpSkillSelection(2);
      }, 600);
    } else {
      synth.playWrong();
      GAME_STATE.bossHp = Math.max(0, GAME_STATE.bossHp - 6);
      flashPvpOverlay(2, 'wrong');
      const container = DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
      spawnProjectile(container, '☄️', 'pvp-boss-projectile');
      updatePvpHPUI();
      if (GAME_STATE.mode === 'online') {
        sendOnlineMessage({
          type: 'wrong_answer',
          playerId: 2
        });
      }
      setTimeout(() => {
        startPvpTurn(2);
      }, 1000);
    }
  }
}

function flashPvpOverlay(playerId, type) {
  const overlay = playerId === 1 ? DOM.pvpP1Overlay : DOM.pvpP2Overlay;
  if (!overlay) return;
  const className = type === 'correct' ? 'flash-correct' : 'flash-wrong';
  overlay.classList.add(className);
  setTimeout(() => {
    overlay.classList.remove(className);
  }, 300);
}

function updatePvpHPUI() {
  const p1Hp = GAME_STATE.playerHp;
  const p2Hp = GAME_STATE.bossHp;
  
  // P1 視角面板 (我方 P1, 對手 P2)
  if (DOM.pvpP1MyHp) DOM.pvpP1MyHp.innerText = p1Hp;
  if (DOM.pvpP1MyHpFill) DOM.pvpP1MyHpFill.style.width = `${(p1Hp / 200) * 100}%`;
  if (DOM.pvpP1OpHp) DOM.pvpP1OpHp.innerText = p2Hp;
  if (DOM.pvpP1OpHpFill) DOM.pvpP1OpHpFill.style.width = `${(p2Hp / 200) * 100}%`;
  
  // P2 視角面板 (我方 P2, 對手 P1)
  if (DOM.pvpP2MyHp) DOM.pvpP2MyHp.innerText = p2Hp;
  if (DOM.pvpP2MyHpFill) DOM.pvpP2MyHpFill.style.width = `${(p2Hp / 200) * 100}%`;
  if (DOM.pvpP2OpHp) DOM.pvpP2OpHp.innerText = p1Hp;
  if (DOM.pvpP2OpHpFill) DOM.pvpP2OpHpFill.style.width = `${(p1Hp / 200) * 100}%`;
}

function startPvpMatchTimer() {
  clearInterval(GAME_STATE.pvp.matchTimer);
  GAME_STATE.pvp.matchTimeLeft = 90;
  if (DOM.pvpMatchTimeText) DOM.pvpMatchTimeText.innerText = GAME_STATE.pvp.matchTimeLeft;
  
  // 線上模式：訪客端由房主同步時間，不在此處計時
  if (GAME_STATE.mode === 'online' && !GAME_STATE.online.isHost) {
    return;
  }
  
  GAME_STATE.pvp.matchTimer = setInterval(() => {
    GAME_STATE.pvp.matchTimeLeft--;
    if (DOM.pvpMatchTimeText) DOM.pvpMatchTimeText.innerText = GAME_STATE.pvp.matchTimeLeft;
    
    if (GAME_STATE.mode === 'online') {
      sendOnlineMessage({
        type: 'match_time',
        time: GAME_STATE.pvp.matchTimeLeft
      });
    }
    
    if (GAME_STATE.pvp.matchTimeLeft <= 0) {
      clearInterval(GAME_STATE.pvp.matchTimer);
      clearInterval(GAME_STATE.pvp.p1Timer);
      clearInterval(GAME_STATE.pvp.p2Timer);
      endPvpGame('timeUp');
    }
    
    if (checkPvpGameOver()) {
      clearInterval(GAME_STATE.pvp.matchTimer);
    }
  }, 1000);
}

function checkPvpGameOver() {
  if (GAME_STATE.playerHp <= 0 || GAME_STATE.bossHp <= 0) {
    clearInterval(GAME_STATE.pvp.p1Timer);
    clearInterval(GAME_STATE.pvp.p2Timer);
    clearInterval(GAME_STATE.pvp.matchTimer);
    endPvpGame('hpZero');
    return true;
  }
  return false;
}

function endPvpGame(reasonType) {
  let winner = 0;
  let reason = '';
  
  const p1Hp = GAME_STATE.playerHp;
  const p2Hp = GAME_STATE.bossHp;
  
  if (GAME_STATE.mode === 'online') {
    const isP1 = (GAME_STATE.online.role === 'p1');
    if (reasonType === 'hpZero') {
      if (p1Hp <= 0 && p2Hp <= 0) {
        winner = 0;
        reason = '雙方同時倒下，平手！';
      } else if (p1Hp <= 0) {
        winner = 2;
        reason = isP1 ? '🔴 對手擊敗了你！' : '🟢 你擊敗了對手！';
      } else {
        winner = 1;
        reason = isP1 ? '🟢 你擊敗了對手！' : '🔴 對手擊敗了你！';
      }
    } else {
      if (p1Hp > p2Hp) {
        winner = 1;
        reason = isP1 ? `⏰ 時間到！你的血量較高 (${p1Hp} vs ${p2Hp})` : `⏰ 時間到！對手血量較高 (${p1Hp} vs ${p2Hp})`;
      } else if (p2Hp > p1Hp) {
        winner = 2;
        reason = isP1 ? `⏰ 時間到！對手血量較高 (${p2Hp} vs ${p1Hp})` : `⏰ 時間到！你的血量較高 (${p2Hp} vs ${p1Hp})`;
      } else {
        winner = 0;
        reason = `⏰ 時間到！雙方血量相同 (${p1Hp} vs ${p2Hp})，平手！`;
      }
    }
  } else {
    if (reasonType === 'hpZero') {
      if (p1Hp <= 0 && p2Hp <= 0) {
        winner = 0;
        reason = '雙方同時倒下，平手！';
      } else if (p1Hp <= 0) {
        winner = 2;
        reason = '🔴 玩家 2 擊敗玩家 1！';
      } else {
        winner = 1;
        reason = '🔵 玩家 1 擊敗玩家 2！';
      }
    } else {
      if (p1Hp > p2Hp) {
        winner = 1;
        reason = `⏰ 時間到！玩家 1 血量較高 (${p1Hp} vs ${p2Hp})`;
      } else if (p2Hp > p1Hp) {
        winner = 2;
        reason = `⏰ 時間到！玩家 2 血量較高 (${p2Hp} vs ${p1Hp})`;
      } else {
        winner = 0;
        reason = `⏰ 時間到！雙方血量相同 (${p1Hp} vs ${p2Hp})，平手！`;
      }
    }
  }
  
  clearInterval(GAME_STATE.pvp.p1Timer);
  clearInterval(GAME_STATE.pvp.p2Timer);
  clearInterval(GAME_STATE.pvp.matchTimer);
  window.removeEventListener('resize', resizePvPLayout);
  
  showBattleResult(winner, reason);
}

// ==========================================================================
// 題庫輔助與格式化工具
// ==========================================================================
function isAllPositive(numbers, answer) {
  return numbers.every(n => n >= 0) && answer >= 0;
}

function formatBracketGroup(a, b, op) {
  const hasParentheses = (a < 0 || b < 0);
  const leftBracket = hasParentheses ? '[' : '(';
  const rightBracket = hasParentheses ? ']' : ')';
  return `${leftBracket} ${formatNumber(a)} ${op} ${formatNumber(b)} ${rightBracket}`;
}

function formatAbsoluteBracketGroup(a, b, op) {
  const hasParentheses = (a < 0 || b < 0);
  const leftBracket = hasParentheses ? '[' : '(';
  const rightBracket = hasParentheses ? ']' : ')';
  return `${leftBracket} | ${formatNumber(a)} | ${op} | ${formatNumber(b)} | ${rightBracket}`;
}

// ==========================================================================
// 題庫動態生成器
// ==========================================================================
function generateQuestion(level, stage = 1) {
  let formula = '';
  let answer = 0;
  let operands = [];

  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    formula = '';
    answer = 0;
    operands = [];

    switch (level) {
      case 1: { // 加減
        if (stage === 1) {
          // Stage 1: 2 numbers
          const a = getRandomInteger(-15, 15, [0]);
          const b = getRandomInteger(-15, 15, [0]);
          const op = Math.random() < 0.5 ? '+' : '-';
          formula = `${formatNumber(a)} ${op} ${formatNumber(b)} = ?`;
          answer = op === '+' ? a + b : a - b;
          operands = [a, b];
        } else if (stage === 2) {
          // Stage 2: 3 numbers
          const a = getRandomInteger(-15, 15, [0]);
          const b = getRandomInteger(-15, 15, [0]);
          const c = getRandomInteger(-15, 15, [0]);
          const op1 = Math.random() < 0.5 ? '+' : '-';
          const op2 = Math.random() < 0.5 ? '+' : '-';
          formula = `${formatNumber(a)} ${op1} ${formatNumber(b)} ${op2} ${formatNumber(c)} = ?`;
          const temp = op1 === '+' ? a + b : a - b;
          answer = op2 === '+' ? temp + c : temp - c;
          operands = [a, b, c];
        } else {
          // Stage 3: 4 numbers
          const a = getRandomInteger(-15, 15, [0]);
          const b = getRandomInteger(-15, 15, [0]);
          const c = getRandomInteger(-15, 15, [0]);
          const d = getRandomInteger(-15, 15, [0]);
          const op1 = Math.random() < 0.5 ? '+' : '-';
          const op2 = Math.random() < 0.5 ? '+' : '-';
          const op3 = Math.random() < 0.5 ? '+' : '-';
          formula = `${formatNumber(a)} ${op1} ${formatNumber(b)} ${op2} ${formatNumber(c)} ${op3} ${formatNumber(d)} = ?`;
          let temp = op1 === '+' ? a + b : a - b;
          temp = op2 === '+' ? temp + c : temp - c;
          answer = op3 === '+' ? temp + d : temp - d;
          operands = [a, b, c, d];
        }
        break;
      }
      case 2: { // 乘除
        if (stage === 1) {
          // Stage 1: 2 numbers
          const isMult = Math.random() < 0.5;
          if (isMult) {
            const a = getRandomInteger(-10, 10, [0, 1, -1]);
            const b = getRandomInteger(-10, 10, [0, 1, -1]);
            formula = `${formatNumber(a)} × ${formatNumber(b)} = ?`;
            answer = a * b;
            operands = [a, b];
          } else {
            const q = getRandomInteger(-9, 9, [0]);
            const d = getRandomInteger(-10, 10, [0, 1, -1]);
            const a = q * d;
            formula = `${formatNumber(a)} ÷ ${formatNumber(d)} = ?`;
            answer = q;
            operands = [a, d];
          }
        } else if (stage === 2) {
          // Stage 2: 3 numbers
          const template = Math.floor(Math.random() * 3);
          if (template === 0) {
            // a * b * c
            const a = getRandomInteger(-6, 6, [0, 1, -1]);
            const b = getRandomInteger(-5, 5, [0, 1, -1]);
            const c = getRandomInteger(-4, 4, [0, 1, -1]);
            formula = `${formatNumber(a)} × ${formatNumber(b)} × ${formatNumber(c)} = ?`;
            answer = a * b * c;
            operands = [a, b, c];
          } else if (template === 1) {
            // a * b / c
            const c = getRandomInteger(-6, 6, [0, 1, -1]);
            const q = getRandomInteger(-8, 8, [0]);
            const product = q * c;
            const factors = [];
            for (let i = -Math.abs(product); i <= Math.abs(product); i++) {
              if (i !== 0 && product % i === 0 && Math.abs(i) <= 12 && Math.abs(product / i) <= 12) {
                factors.push(i);
              }
            }
            const a = factors.length > 0 ? factors[Math.floor(Math.random() * factors.length)] : q;
            const b = product / a;
            formula = `${formatNumber(a)} × ${formatNumber(b)} ÷ ${formatNumber(c)} = ?`;
            answer = q;
            operands = [a, b, c];
          } else {
            // a / b * c
            const b = getRandomInteger(-6, 6, [0, 1, -1]);
            const q1 = getRandomInteger(-8, 8, [0]);
            const a = q1 * b;
            const c = getRandomInteger(-5, 5, [0, 1, -1]);
            formula = `${formatNumber(a)} ÷ ${formatNumber(b)} × ${formatNumber(c)} = ?`;
            answer = q1 * c;
            operands = [a, b, c];
          }
        } else {
          // Stage 3: 4 numbers
          const template = Math.floor(Math.random() * 3);
          if (template === 0) {
            // a * b * c * d
            const a = getRandomInteger(-4, 4, [0, 1, -1]);
            const b = getRandomInteger(-3, 3, [0, 1, -1]);
            const c = getRandomInteger(-3, 3, [0, 1, -1]);
            const d = getRandomInteger(-2, 2, [0, 1, -1]);
            formula = `${formatNumber(a)} × ${formatNumber(b)} × ${formatNumber(c)} × ${formatNumber(d)} = ?`;
            answer = a * b * c * d;
            operands = [a, b, c, d];
          } else if (template === 1) {
            // a * b * c / d
            const d = getRandomInteger(-5, 5, [0, 1, -1]);
            const q = getRandomInteger(-6, 6, [0]);
            const product = q * d;
            const factorsA = [];
            for (let i = -Math.abs(product); i <= Math.abs(product); i++) {
              if (i !== 0 && product % i === 0 && Math.abs(i) <= 10) {
                factorsA.push(i);
              }
            }
            const a = factorsA.length > 0 ? factorsA[Math.floor(Math.random() * factorsA.length)] : q;
            const remain = product / a;
            const factorsB = [];
            for (let i = -Math.abs(remain); i <= Math.abs(remain); i++) {
              if (i !== 0 && remain % i === 0 && Math.abs(i) <= 10) {
                factorsB.push(i);
              }
            }
            const b = factorsB.length > 0 ? factorsB[Math.floor(Math.random() * factorsB.length)] : 1;
            const c = remain / b;
            formula = `${formatNumber(a)} × ${formatNumber(b)} × ${formatNumber(c)} ÷ ${formatNumber(d)} = ?`;
            answer = q;
            operands = [a, b, c, d];
          } else {
            // a / b * c * d
            const b = getRandomInteger(-5, 5, [0, 1, -1]);
            const q = getRandomInteger(-6, 6, [0]);
            const a = q * b;
            const c = getRandomInteger(-4, 4, [0, 1, -1]);
            const d = getRandomInteger(-3, 3, [0, 1, -1]);
            formula = `${formatNumber(a)} ÷ ${formatNumber(b)} × ${formatNumber(c)} × ${formatNumber(d)} = ?`;
            answer = q * c * d;
            operands = [a, b, c, d];
          }
        }
        break;
      }
      case 3: { // 混合運算
        if (stage === 1) {
          // Stage 1: 3 numbers without brackets
          const template = Math.floor(Math.random() * 3);
          if (template === 0) {
            // a + b * c
            const a = getRandomInteger(-12, 12, [0]);
            const b = getRandomInteger(-8, 8, [0, 1, -1]);
            const c = getRandomInteger(-6, 6, [0, 1, -1]);
            formula = `${formatNumber(a)} + ${formatNumber(b)} × ${formatNumber(c)} = ?`;
            answer = a + b * c;
            operands = [a, b, c];
          } else if (template === 1) {
            // a * b - c
            const a = getRandomInteger(-8, 8, [0, 1, -1]);
            const b = getRandomInteger(-6, 6, [0, 1, -1]);
            const c = getRandomInteger(-15, 15, [0]);
            formula = `${formatNumber(a)} × ${formatNumber(b)} - ${formatNumber(c)} = ?`;
            answer = a * b - c;
            operands = [a, b, c];
          } else {
            // a - b / c
            const c = getRandomInteger(-6, 6, [0, 1, -1]);
            const q = getRandomInteger(-8, 8, [0]);
            const b = q * c;
            const a = getRandomInteger(-15, 15, [0]);
            formula = `${formatNumber(a)} - ${formatNumber(b)} ÷ ${formatNumber(c)} = ?`;
            answer = a - q;
            operands = [a, b, c];
          }
        } else if (stage === 2) {
          // Stage 2: 3 numbers with brackets
          const template = Math.floor(Math.random() * 2);
          if (template === 0) {
            // [a + b] * c (or (a+b)*c if both positive)
            const a = getRandomInteger(-10, 10, [0]);
            const b = getRandomInteger(-10, 10, [0, -a]);
            const c = getRandomInteger(-5, 5, [0, 1, -1]);
            formula = `${formatBracketGroup(a, b, '+')} × ${formatNumber(c)} = ?`;
            answer = (a + b) * c;
            operands = [a, b, c];
          } else {
            // [a - b] / c
            const c = getRandomInteger(-5, 5, [0, 1, -1]);
            const q = getRandomInteger(-6, 6, [0]);
            const diff = q * c;
            const b = getRandomInteger(-15, 15);
            const a = diff + b;
            formula = `${formatBracketGroup(a, b, '-')} ÷ ${formatNumber(c)} = ?`;
            answer = q;
            operands = [a, b, c];
          }
        } else {
          // Stage 3: 4 numbers (mixed with/without brackets)
          const template = Math.floor(Math.random() * 2);
          if (template === 0) {
            // a * c + b * c (分配律)
            const c = getRandomInteger(-5, 5, [0, 1, -1]);
            const a = getRandomInteger(10, 45);
            const b = 100 - a;
            formula = `${formatNumber(a)} × ${formatNumber(c)} + ${formatNumber(b)} × ${formatNumber(c)} = ?`;
            answer = (a + b) * c;
            operands = [a, b, c];
          } else {
            // [a + b] * c - d
            const a = getRandomInteger(-8, 8, [0]);
            const b = getRandomInteger(-8, 8, [0, -a]);
            const c = getRandomInteger(-4, 4, [0, 1, -1]);
            const d = getRandomInteger(-15, 15, [0]);
            formula = `${formatBracketGroup(a, b, '+')} × ${formatNumber(c)} - ${formatNumber(d)} = ?`;
            answer = (a + b) * c - d;
            operands = [a, b, c, d];
          }
        }
        break;
      }
      case 4: { // 絕對值
        if (stage === 1) {
          // Stage 1: 2 numbers
          const template = Math.floor(Math.random() * 2);
          if (template === 0) {
            // |a| - |b|
            const a = getRandomInteger(-25, 25, [0]);
            const b = getRandomInteger(-25, 25, [0]);
            formula = `| ${formatNumber(a)} | - | ${formatNumber(b)} | = ?`;
            answer = Math.abs(a) - Math.abs(b);
            operands = [a, b];
          } else {
            // |a| + b
            const a = getRandomInteger(-25, 25, [0]);
            const b = getRandomInteger(-15, 15, [0]);
            formula = `| ${formatNumber(a)} | + ${formatNumber(b)} = ?`;
            answer = Math.abs(a) + b;
            operands = [a, b];
          }
        } else if (stage === 2) {
          // Stage 2: 3 numbers
          const template = Math.floor(Math.random() * 2);
          if (template === 0) {
            // |a * b| - c
            const a = getRandomInteger(-6, 6, [0]);
            const b = getRandomInteger(-6, 6, [0]);
            const c = getRandomInteger(-15, 15, [0]);
            formula = `| ${formatNumber(a)} × ${formatNumber(b)} | - ${formatNumber(c)} = ?`;
            answer = Math.abs(a * b) - c;
            operands = [a, b, c];
          } else {
            // a + | b + c |
            const a = getRandomInteger(-15, 15, [0]);
            const b = getRandomInteger(-12, 12, [0]);
            const c = getRandomInteger(-12, 12, [0]);
            formula = `${formatNumber(a)} + | ${formatNumber(b)} + ${formatNumber(c)} | = ?`;
            answer = a + Math.abs(b + c);
            operands = [a, b, c];
          }
        } else {
          // Stage 3: 4 numbers
          const template = Math.floor(Math.random() * 2);
          if (template === 0) {
            // |a * b| - |c + d|
            const a = getRandomInteger(-5, 5, [0]);
            const b = getRandomInteger(-4, 4, [0]);
            const c = getRandomInteger(-10, 10, [0]);
            const d = getRandomInteger(-10, 10, [0, -c]);
            formula = `| ${formatNumber(a)} × ${formatNumber(b)} | - | ${formatNumber(c)} + ${formatNumber(d)} | = ?`;
            answer = Math.abs(a * b) - Math.abs(c + d);
            operands = [a, b, c, d];
          } else {
            // [ |a| - |b| ] * c + d
            const a = getRandomInteger(-15, 15, [0]);
            const b = getRandomInteger(-15, 15, [0]);
            const c = getRandomInteger(-4, 4, [0, 1, -1]);
            const d = getRandomInteger(-10, 10, [0]);
            formula = `${formatAbsoluteBracketGroup(a, b, '-')} × ${formatNumber(c)} + ${formatNumber(d)} = ?`;
            answer = (Math.abs(a) - Math.abs(b)) * c + d;
            operands = [a, b, c, d];
          }
        }
        break;
      }
    }

    if (!isAllPositive(operands, answer)) {
      break;
    }
  }

  const options = generateUniqueOptions(answer, [-1, 1, -2, 2, -10, 10, -answer, answer + 5]);
  const correctIdx = options.indexOf(answer);

  return { formula, options, answer, correctIdx };
}

function formatNumber(num) {
  if (num < 0) {
    return `(${num})`;
  }
  return num.toString();
}

function getRandomInteger(min, max, exclude = []) {
  let val;
  do {
    val = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (exclude.includes(val));
  return val;
}

function generateUniqueOptions(correctVal, offsets) {
  const options = new Set();
  options.add(correctVal);

  if (correctVal !== 0) {
    options.add(-correctVal);
  }

  offsets.forEach(offset => {
    if (options.size < 4) {
      options.add(correctVal + offset);
    }
  });

  while (options.size < 4) {
    const randomOffset = getRandomInteger(-15, 15, [0]);
    options.add(correctVal + randomOffset);
  }

  const arr = Array.from(options);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function writeLog(text, className = '') {
  DOM.combatLog.innerText = text;
  DOM.combatLog.className = `combat-log ${className}`;
}

// ==========================================================================
// 線上對決 P2P 連線模組 (PeerJS P2P Connection Module)
// ==========================================================================
function initOnlineSetupUI() {
  const onlineSetupCard = document.getElementById('online-setup');
  const levelSetupCard = document.getElementById('level-setup');

  // 監聽模式選擇 (在 setupEventListeners 的 click 事件之後額外做 UI 切換)
  DOM.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === 'online') {
        onlineSetupCard.classList.remove('hidden');
        levelSetupCard.classList.remove('hidden');
        DOM.btnStartGame.classList.add('hidden');
        updateOnlineStatus('請選擇「創建連線房間」或輸入房號後「連線加入」對手。');
      } else {
        onlineSetupCard.classList.add('hidden');
        levelSetupCard.classList.remove('hidden');
        DOM.btnStartGame.classList.remove('hidden');
      }
    });
  });

  // 創建房間按鈕
  document.getElementById('btn-create-room').addEventListener('click', () => {
    synth.playClick();
    setupPeerAsHost();
  });

  // 加入房間按鈕
  document.getElementById('btn-join-room').addEventListener('click', () => {
    synth.playClick();
    const roomId = document.getElementById('input-room-id').value.trim().toUpperCase();
    if (!roomId || roomId.length < 1 || roomId.length > 6) {
      updateOnlineStatus('請輸入房號（1~6 位英數字）！', 'error');
      return;
    }
    setupPeerAsGuest(roomId);
  });

  // Enter 鍵直接加入
  document.getElementById('input-room-id').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-join-room').click();
    }
  });
}

function updateOnlineStatus(text, type = '') {
  const el = DOM.onlineStatusMessage;
  if (!el) return;
  el.innerText = text;
  el.className = 'online-status';
  if (type === 'success') el.classList.add('success');
  if (type === 'error') el.classList.add('error');
}

function setupPeerAsHost() {
  updateOnlineStatus('正在連線至 Peer 伺服器並建立房間...');
  closeOnlineConnection();

  // 產生 4 位隨機房號
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  GAME_STATE.online.roomId = code;
  GAME_STATE.online.isHost = true;
  GAME_STATE.online.role = 'p1'; // 房主固定為 P1 (左半屏)

  try {
    GAME_STATE.online.peer = new Peer('math-hero-' + code, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      },
      debug: 1
    });

    GAME_STATE.online.peer.on('open', (id) => {
      updateOnlineStatus(`房間建立成功！房號：【${code}】\n請將房號告知對手，等待對手連線加入...`, 'success');
    });

    GAME_STATE.online.peer.on('connection', (connection) => {
      GAME_STATE.online.conn = connection;
      setupConnectionEvents(connection);
    });

    GAME_STATE.online.peer.on('error', (err) => {
      console.error(err);
      if (err.type === 'unavailable-id') {
        setupPeerAsHost();
      } else {
        updateOnlineStatus('連線伺服器失敗，請重試！ (錯誤類型: ' + err.type + ')', 'error');
      }
    });
  } catch (e) {
    console.error(e);
    updateOnlineStatus('建立房間發生異常，請重試！', 'error');
  }
}

function setupPeerAsGuest(roomId) {
  updateOnlineStatus(`正在連線加入房間 ${roomId}...`);
  closeOnlineConnection();

  GAME_STATE.online.roomId = roomId;
  GAME_STATE.online.isHost = false;
  GAME_STATE.online.role = 'p2'; // 訪客固定為 P2 (右半屏)

  try {
    GAME_STATE.online.peer = new Peer(null, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      },
      debug: 1
    });

    GAME_STATE.online.peer.on('open', (id) => {
      const connection = GAME_STATE.online.peer.connect('math-hero-' + roomId);
      GAME_STATE.online.conn = connection;
      setupConnectionEvents(connection);
    });

    GAME_STATE.online.peer.on('error', (err) => {
      console.error(err);
      if (err.type === 'peer-not-found') {
        updateOnlineStatus('找不到該房間！請確認房號是否正確，或房主是否已建立房間。', 'error');
      } else {
        updateOnlineStatus('連線伺服器失敗，請確認房號或網路狀態！ (錯誤: ' + err.type + ')', 'error');
      }
    });
  } catch (e) {
    console.error(e);
    updateOnlineStatus('加入房間發生異常，請重試！', 'error');
  }
}

function setupConnectionEvents(connection) {
  const onOpen = () => {
    if (GAME_STATE.online.connected) return;
    GAME_STATE.online.connected = true;
    updateOnlineStatus('對手已連線！即將進入遊戲...', 'success');

    setTimeout(() => {
      if (GAME_STATE.online.isHost) {
        sendOnlineMessage({
          type: 'init_game',
          level: GAME_STATE.level
        });
        startOnlineBattle();
      }
    }, 1000);
  };

  if (connection.open) {
    onOpen();
  } else {
    connection.on('open', onOpen);
  }

  connection.on('data', (data) => {
    handleOnlineMessage(data);
  });

  connection.on('close', () => {
    handleOnlineDisconnect();
  });

  connection.on('error', (err) => {
    console.error(err);
    handleOnlineDisconnect();
  });
}

function sendOnlineMessage(msg) {
  if (GAME_STATE.online.conn && GAME_STATE.online.connected) {
    GAME_STATE.online.conn.send(msg);
  }
}

function closeOnlineConnection() {
  GAME_STATE.online.connected = false;
  if (GAME_STATE.online.conn) {
    GAME_STATE.online.conn.close();
    GAME_STATE.online.conn = null;
  }
  if (GAME_STATE.online.peer) {
    GAME_STATE.online.peer.destroy();
    GAME_STATE.online.peer = null;
  }
}

function startOnlineBattle() {
  GAME_STATE.mode = 'online';
  
  DOM.campaignLayout.classList.add('hidden');
  DOM.pvpLayout.classList.remove('hidden');
  DOM.pvpLayout.classList.add('online-pvp-mode');

  GAME_STATE.playerHp = 200;
  GAME_STATE.bossHp = 200;
  GAME_STATE.stats.correct = 0;
  GAME_STATE.stats.total = 0;

  if (GAME_STATE.level === 1 || GAME_STATE.level === 2) {
    GAME_STATE.pvp.p1TimeLimit = 25;
    GAME_STATE.pvp.p2TimeLimit = 25;
  } else {
    GAME_STATE.pvp.p1TimeLimit = 35;
    GAME_STATE.pvp.p2TimeLimit = 35;
  }

  updatePvpHPUI();
  updatePvpRoleLabels();
  showScreen(DOM.gameScreen);

  setTimeout(() => {
    if (GAME_STATE.online.role === 'p1') {
      startPvpTurn(1);
    } else {
      startPvpTurn(2);
    }

    if (GAME_STATE.online.isHost) {
      startPvpMatchTimer();
    }
  }, 500);
}

function handleOnlineMessage(data) {
  if (!data || !data.type) return;

  switch (data.type) {
    case 'init_game':
      GAME_STATE.level = data.level;
      startOnlineBattle();
      break;

    case 'sync_question':
      if (data.playerId === 1) {
        GAME_STATE.pvp.p1Question = data.question;
        renderSpectatorQuestion(1, data.question);
      } else {
        GAME_STATE.pvp.p2Question = data.question;
        renderSpectatorQuestion(2, data.question);
      }
      break;

    case 'state_change':
      if (data.state === 'selecting_skill') {
        showPvpSkillSelection(data.playerId);
      }
      break;

    case 'use_skill':
      const attackerId = data.attackerId;
      const defenderId = attackerId === 1 ? 2 : 1;
      playPvpSkillEffects(attackerId, defenderId, data.skillNum, data.dmg, data.skillName);
      
      setTimeout(() => {
        if (GAME_STATE.online.role === 'p1') {
          // P1 is local, P2 is remote. Guest continues.
        } else {
          // P2 is local, P1 is remote. Host continues.
        }
      }, 1200);
      break;

    case 'wrong_answer':
      if (data.playerId === 1) {
        GAME_STATE.playerHp = Math.max(0, GAME_STATE.playerHp - 6);
        flashPvpOverlay(1, 'wrong');
        const container = DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container');
        spawnProjectile(container, '☄️', 'pvp-boss-projectile');
      } else {
        GAME_STATE.bossHp = Math.max(0, GAME_STATE.bossHp - 6);
        flashPvpOverlay(2, 'wrong');
        const container = DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
        spawnProjectile(container, '☄️', 'pvp-boss-projectile');
      }
      updatePvpHPUI();
      synth.playWrong();
      break;

    case 'timeout':
      if (data.playerId === 1) {
        GAME_STATE.playerHp = Math.max(0, GAME_STATE.playerHp - 6);
        flashPvpOverlay(1, 'wrong');
        const container = DOM.pvpLayout.querySelector('.pvp-left .pvp-rotated-container');
        spawnProjectile(container, '☄️', 'pvp-boss-projectile');
      } else {
        GAME_STATE.bossHp = Math.max(0, GAME_STATE.bossHp - 6);
        flashPvpOverlay(2, 'wrong');
        const container = DOM.pvpLayout.querySelector('.pvp-right .pvp-rotated-container');
        spawnProjectile(container, '☄️', 'pvp-boss-projectile');
      }
      updatePvpHPUI();
      synth.playWrong();
      break;

    case 'match_time':
      GAME_STATE.pvp.matchTimeLeft = data.time;
      if (DOM.pvpMatchTimeText) DOM.pvpMatchTimeText.innerText = data.time;
      if (data.time <= 0) {
        endPvpGame('timeUp');
      }
      break;
  }
}

function renderSpectatorQuestion(playerId, q) {
  const formulaEl = playerId === 1 ? DOM.pvpP1Formula : DOM.pvpP2Formula;
  const optionsEl = playerId === 1 ? DOM.pvpP1Options : DOM.pvpP2Options;
  if (!formulaEl || !optionsEl) return;

  formulaEl.innerText = q.formula;
  optionsEl.innerHTML = '';
  optionsEl.classList.remove('skills-view');

  q.options.forEach((val) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pvp-btn disabled';
    btn.disabled = true;
    btn.innerText = val >= 0 ? `+${val}` : val;
    optionsEl.appendChild(btn);
  });
}

function handleOnlineDisconnect() {
  if (!GAME_STATE.online.connected) return;
  GAME_STATE.online.connected = false;

  // 如果遊戲已經正常結束分出勝負，不執行斷線覆寫
  const isGameOver = (GAME_STATE.playerHp <= 0 || GAME_STATE.bossHp <= 0 || GAME_STATE.pvp.matchTimeLeft <= 0);
  if (isGameOver) {
    closeOnlineConnection();
    return;
  }

  clearInterval(GAME_STATE.pvp.p1Timer);
  clearInterval(GAME_STATE.pvp.p2Timer);
  clearInterval(GAME_STATE.pvp.matchTimer);

  synth.playWrong();
  
  DOM.winnerTitle.innerText = '對手已斷線離線！';
  DOM.winnerTitle.className = 'winner-title text-pink';
  DOM.winnerReason.innerText = '連線意外中斷，我方獲得本次對決勝利 🏆';
  DOM.resultIcon.innerText = '🔌';
  
  DOM.statRounds.innerText = '線上連線';
  DOM.statCorrectCount.innerText = '對方斷線';
  DOM.statAccuracy.innerText = '自動獲勝';

  const rematchText = DOM.btnRematch.querySelector('span');
  if (rematchText) rematchText.innerText = '返回大廳';
  
  showScreen(DOM.resultScreen);
  closeOnlineConnection();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

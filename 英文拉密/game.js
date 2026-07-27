/**
 * 英文拉密 (Rummikub Word) - 核心遊戲引擎 (v25 慢速英文 & 中文分號停頓1秒語音)
 */

class SoundFX {
    constructor() {
        this.ctx = null;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.2) {
        try {
            this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playShuffleSound() {
        try {
            this.init();
            const now = this.ctx.currentTime;
            for (let i = 0; i < 8; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200 + Math.random() * 300, now + i * 0.1);
                gain.gain.setValueAtTime(0.2, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.08);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.08);
            }
        } catch (e) {}
    }

    playTileClick() {
        this.playTone(600, 'triangle', 0.05, 0.35);
    }

    playTileDrop() {
        this.playTone(320, 'sine', 0.08, 0.45);
    }

    playSuccess() {
        try {
            this.init();
            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.3, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.2);
            });
        } catch (e) {}
    }

    playError() {
        this.playTone(180, 'sawtooth', 0.3, 0.5);
    }

    playDraw() {
        this.playTone(440, 'sine', 0.1, 0.25);
    }

    playWin() {
        try {
            this.init();
            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                gain.gain.setValueAtTime(0.45, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.4);
            });
        } catch (e) {}
    }
}

const sfx = new SoundFX();

// 雙語發音 (英文放慢語速至 0.65，中文遇到分號 ； 停頓 0.5 秒；連續重複播放 2 次)
window.speakBilingual = function(word, chineseMeaning, repeatTimes = 2) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const playOnce = (countLeft) => {
        if (countLeft <= 0) return;

        const utteranceEn = new SpeechSynthesisUtterance(word.toLowerCase());
        utteranceEn.lang = 'en-US';
        utteranceEn.rate = 0.65;

        utteranceEn.onend = async () => {
            if (chineseMeaning) {
                const parts = chineseMeaning.split(/[；;]/).map(p => p.trim()).filter(Boolean);
                
                for (let i = 0; i < parts.length; i++) {
                    if (i > 0) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                    await new Promise(resolve => {
                        let zhText = parts[i];
                        // 修正 TTS 發音：將「和」替換為同音同調字「翰」，以確保正確發音為 ㄏㄢˋ (hàn)
                        if (zhText === '和') {
                            zhText = '翰';
                        } else {
                            zhText = zhText.replace(/^和(?=[\s\S]*)/, '翰');
                        }
                        const utteranceZh = new SpeechSynthesisUtterance(zhText);
                        utteranceZh.lang = 'zh-TW';
                        utteranceZh.rate = 0.72;
                        utteranceZh.onend = resolve;
                        utteranceZh.onerror = resolve;
                        window.speechSynthesis.speak(utteranceZh);
                    });
                }
            }

            // 第一次播完後，若尚有重複次數，停頓 600ms 後重複播放下一遍
            if (countLeft > 1) {
                await new Promise(r => setTimeout(r, 600));
                playOnce(countLeft - 1);
            }
        };

        window.speechSynthesis.speak(utteranceEn);
    };

    playOnce(repeatTimes);
};

// 單獨英文單字朗讀 (連續重複播放 2 次)
window.speakWord = function(word, repeatTimes = 2) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const playOnce = (countLeft) => {
        if (countLeft <= 0) return;
        const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
        utterance.lang = 'en-US';
        utterance.rate = 0.65;
        utterance.onend = async () => {
            if (countLeft > 1) {
                await new Promise(r => setTimeout(r, 500));
                playOnce(countLeft - 1);
            }
        };
        window.speechSynthesis.speak(utterance);
    };

    playOnce(repeatTimes);
};

const TILE_DISTRIBUTION = {
    A: 10, B: 2, C: 4, D: 4, E: 10, F: 2, G: 3, H: 3, I: 7, J: 1, K: 2, L: 7, M: 3, N: 6,
    O: 8, P: 4, Q: 1, R: 7, S: 7, T: 8, U: 4, V: 1, W: 2, X: 1, Y: 2, Z: 1,
    JOKER: 2
};

class RummikubGame {
    constructor() {
        this.GRID_ROWS = 11;
        this.GRID_COLS = 24;

        this.players = [
            { id: 0, name: '玩家 (你)', isAI: false, hand: [], isIceBroken: false, score: 0, avatar: '👩‍🦱' },
            { id: 1, name: 'AI 小明', isAI: true, hand: [], isIceBroken: false, score: 0, avatar: '👵' },
            { id: 2, name: 'AI 小華', isAI: true, hand: [], isIceBroken: false, score: 0, avatar: '👱‍♀️' },
            { id: 3, name: 'AI 小美', isAI: true, hand: [], isIceBroken: false, score: 0, avatar: '👩' }
        ];
        this.currentPlayerIndex = 0;
        this.allTiles = [];
        this.drawPile = [];
        
        this.boardGrid = this.createEmptyGrid();

        this.playedWordsHistory = [];
        this.turnSnapshot = null;
        this.turnStartWords = new Set();
        this.playedFromHandThisTurn = new Set();
        this.timer = null;
        this.timeLeft = 180;
        this.selectedTileId = null;
        this.selectedTileSource = null;
        this.gameEnded = false;
        
        this.hintIndex = 0;
        this.currentSlideIndex = 0;
        this.slideAutoPlayInterval = null;

        this.initDOM();
    }

    createEmptyGrid() {
        return Array.from({ length: this.GRID_ROWS }, () => Array(this.GRID_COLS).fill(null));
    }

    initDOM() {
        this.startGameOverlayEl = document.getElementById('start-game-overlay');
        this.btnStartGame = document.getElementById('btn-start-game');

        this.boardGridEl = document.getElementById('board-grid');
        this.rackGridEl = document.getElementById('rack-grid');
        this.drawPileCountEl = document.getElementById('draw-count');
        this.stacksGridEl = document.getElementById('stacks-grid');
        this.turnMessageEl = document.getElementById('turn-message');
        this.timerEl = document.getElementById('timer-count');
        this.btnEndTurn = document.getElementById('btn-end-turn');
        this.btnDrawTile = document.getElementById('btn-draw-tile');
        this.btnHint = document.getElementById('btn-hint');
        this.btnResetTurn = document.getElementById('btn-reset-turn');

        this.introOverlayEl = document.getElementById('intro-overlay');
        this.introStatusTextEl = document.getElementById('intro-status-text');
        this.shuffleStageEl = document.getElementById('shuffle-stage');
        this.orderCardsGridEl = document.getElementById('order-cards-grid');

        this.slideModalEl = document.getElementById('slide-modal');
        this.slideWordTextEl = document.getElementById('slide-word-text');
        this.slideChiTextEl = document.getElementById('slide-chi-text');
        this.slideMetaTextEl = document.getElementById('slide-meta-text');
        this.btnSlidePrev = document.getElementById('btn-slide-prev');
        this.btnSlideNext = document.getElementById('btn-slide-next');
        this.btnSlideSpeak = document.getElementById('btn-slide-speak');
        this.btnSlidePlay = document.getElementById('btn-slide-play');

        this.jokerModalEl = document.getElementById('joker-modal');
        this.jokerLettersGridEl = document.getElementById('joker-letters-grid');
        this.confirmModalEl = document.getElementById('confirm-modal');
        this.rulesModalEl = document.getElementById('rules-modal');
        this.confirmModalMsgEl = document.getElementById('confirm-modal-msg');
        this.confirmModalOkBtn = document.getElementById('confirm-modal-ok');
        this.confirmModalCancelBtn = document.getElementById('confirm-modal-cancel');

        this.bgmPlayerEl = document.getElementById('bgm-player');
        this.btnToggleBgm = document.getElementById('btn-toggle-bgm');
        this.bgmVolumeSliderEl = document.getElementById('bgm-volume-slider');
        this.isBgmPlaying = false;
        
        if (this.bgmPlayerEl) {
            this.bgmPlayerEl.volume = 0.8;
        }

        if (this.bgmVolumeSliderEl) {
            this.bgmVolumeSliderEl.value = 0.8;
            this.bgmVolumeSliderEl.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (this.bgmPlayerEl) {
                    this.bgmPlayerEl.volume = vol;
                }
            });
        }

        if (this.btnToggleBgm) {
            this.btnToggleBgm.textContent = '🎵 背景音樂: 開';
            this.btnToggleBgm.classList.add('primary-btn');
        }
        // 初始化與監聽等比例縮放適配
        this.updateViewportScale();
        window.addEventListener('resize', () => this.updateViewportScale());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateViewportScale(), 150);
        });

        this.bindEvents();
    }

    updateViewportScale() {
        const appRoot = document.getElementById('app-root');
        if (!appRoot) return;

        const baseWidth = 1080;
        const baseHeight = 660;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scaleX = windowWidth / baseWidth;
        const scaleY = windowHeight / baseHeight;

        // 取寬高縮放比之較小值，確保全畫面 100% 等比例適配且無視窗溢出
        const scale = Math.min(scaleX, scaleY);

        appRoot.style.transform = `scale(${scale})`;

        // 行動裝置直向螢幕提示
        const rotateTipEl = document.getElementById('rotate-screen-tip');
        if (rotateTipEl) {
            if (windowWidth < 768 && windowWidth < windowHeight) {
                rotateTipEl.classList.add('show');
            } else {
                rotateTipEl.classList.remove('show');
            }
        }
    }

    bindEvents() {
        if (this.btnStartGame) {
            let started = false;
            const handleStart = (e) => {
                if (started) return;
                started = true;
                if (e) e.preventDefault();
                this.toggleBgm(true);
                if (this.startGameOverlayEl) {
                    this.startGameOverlayEl.classList.add('hidden');
                }
                this.startNewGame();
            };
            this.btnStartGame.addEventListener('pointerdown', handleStart);
            this.btnStartGame.addEventListener('click', handleStart);
        }

        this.btnEndTurn.addEventListener('click', () => this.handleEndTurn());
        this.btnDrawTile.addEventListener('click', () => this.handleDrawTile());
        this.btnHint.addEventListener('click', () => this.handleProvideHint());
        this.btnResetTurn.addEventListener('click', () => this.handleResetTurn());

        if (this.btnToggleBgm) {
            this.btnToggleBgm.addEventListener('click', () => this.toggleBgm());
        }
        
        // 綁定全螢幕/視窗任意互動（觸控、按鍵、滑動、點擊）立刻開啟背景音樂
        const autoPlayHandler = () => {
            this.tryAutoPlayBgm();
            window.removeEventListener('pointerdown', autoPlayHandler);
            window.removeEventListener('keydown', autoPlayHandler);
            window.removeEventListener('touchstart', autoPlayHandler);
            window.removeEventListener('mousemove', autoPlayHandler);
            window.removeEventListener('click', autoPlayHandler);
        };
        window.addEventListener('pointerdown', autoPlayHandler);
        window.addEventListener('keydown', autoPlayHandler);
        window.addEventListener('touchstart', autoPlayHandler);
        window.addEventListener('mousemove', autoPlayHandler);
        window.addEventListener('click', autoPlayHandler);

        document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        
        // 綁定鍵盤 F11 攔截，等同於按下遊戲內的全螢幕按鈕
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });

        // 監聽全螢幕狀態切換事件（無論透過 F11、Esc 鍵或點擊按鈕），即時同步按鈕文字
        document.addEventListener('fullscreenchange', () => {
            const btnEl = document.getElementById('btn-fullscreen');
            if (document.fullscreenElement) {
                if (btnEl) btnEl.textContent = '✕ 退出全螢幕';
            } else {
                if (btnEl) btnEl.textContent = '⛶ 全螢幕 (Fullscreen)';
            }
        });

        document.getElementById('btn-sort-az').addEventListener('click', () => this.sortRack('az'));
        document.getElementById('btn-sort-vowel').addEventListener('click', () => this.sortRack('vowel'));
        document.getElementById('btn-rules').addEventListener('click', () => this.toggleModal('rules-modal', true));
        document.getElementById('close-rules').addEventListener('click', () => this.toggleModal('rules-modal', false));
        document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());

        document.getElementById('close-slide-modal').addEventListener('click', () => this.closeSlidePresentation());
        // close-joker-modal 按鈕已移除（Joker Modal 透過確認或選字母後自動關閉）
        document.getElementById('close-confirm-modal').addEventListener('click', () => this.toggleModal('confirm-modal', false));

        this.btnSlidePrev.addEventListener('click', () => this.prevSlide());
        this.btnSlideNext.addEventListener('click', () => this.nextSlide());
        this.btnSlideSpeak.addEventListener('click', () => this.speakCurrentSlide());
        this.btnSlidePlay.addEventListener('click', () => this.toggleSlideAutoPlay());

        this.rackGridEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.rackGridEl.classList.add('drag-over');
        });
        this.rackGridEl.addEventListener('dragleave', () => {
            this.rackGridEl.classList.remove('drag-over');
        });
        this.rackGridEl.addEventListener('drop', (e) => {
            e.preventDefault();
            this.rackGridEl.classList.remove('drag-over');
            const tileDataStr = e.dataTransfer.getData('text/plain');
            if (tileDataStr) {
                const data = JSON.parse(tileDataStr);
                if (data.source === 'board') {
                    this.moveTileFromBoardToRack(data.id);
                }
            }
        });

        // 點擊牌架空白區：若有選中的桌面牌，則送回手牌
        this.rackGridEl.addEventListener('click', (e) => {
            if (this.selectedTileId && this.selectedTileSource === 'board') {
                this.moveTileFromBoardToRack(this.selectedTileId);
                this.clearTileSelection();
            }
        });
    }

    toggleFullscreen() {
        const btnEl = document.getElementById('btn-fullscreen');
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                if (btnEl) btnEl.textContent = '✕ 退出全螢幕';
            }).catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    if (btnEl) btnEl.textContent = '⛶ 全螢幕 (Fullscreen)';
                }).catch(() => {});
            }
        }
    }

    toggleBgm(forceState = null) {
        if (!this.bgmPlayerEl) return;
        const targetState = forceState !== null ? forceState : !this.isBgmPlaying;

        if (targetState) {
            this.bgmPlayerEl.play().then(() => {
                this.isBgmPlaying = true;
                if (this.btnToggleBgm) {
                    this.btnToggleBgm.textContent = '🎵 背景音樂: 開';
                    this.btnToggleBgm.classList.add('primary-btn');
                }
            }).catch(() => {
                // 自動播放因瀏覽器限制掛起時，保持「開」意圖，等待任何用戶手勢解鎖播放
                this.isBgmPlaying = false;
                if (this.btnToggleBgm) {
                    this.btnToggleBgm.textContent = '🎵 背景音樂: 開';
                    this.btnToggleBgm.classList.add('primary-btn');
                }
            });
        } else {
            this.bgmPlayerEl.pause();
            this.isBgmPlaying = false;
            if (this.btnToggleBgm) {
                this.btnToggleBgm.textContent = '🎵 背景音樂: 關';
                this.btnToggleBgm.classList.remove('primary-btn');
            }
        }
    }

    tryAutoPlayBgm() {
        if (!this.isBgmPlaying) {
            this.toggleBgm(true);
        }
    }

    openJokerModal(tile, callback) {
        const inputEl   = document.getElementById('joker-letter-input');
        const confirmEl = document.getElementById('joker-letter-confirm');
        const gridEl    = this.jokerLettersGridEl;

        // 清空輸入框
        inputEl.value = '';
        gridEl.innerHTML = '';

        // 確認函數
        const confirmLetter = () => {
            const char = inputEl.value.trim().toUpperCase();
            if (!/^[A-Z]$/.test(char)) {
                inputEl.style.borderColor = '#ef4444';
                inputEl.focus();
                return;
            }
            inputEl.style.borderColor = '';
            tile.assignedLetter = char;
            this.toggleModal('joker-modal', false);
            this.showToast(`😊 百搭牌已設定為字母: [${char}]`);
            if (callback) callback();
        };

        // 確認按鈕
        confirmEl.onclick = confirmLetter;

        // Enter 鍵確認
        inputEl.onkeydown = (e) => { if (e.key === 'Enter') confirmLetter(); };

        // 輸入自動轉大寫
        inputEl.oninput = () => {
            inputEl.value = inputEl.value.toUpperCase();
            inputEl.style.borderColor = '';
        };

        // 26 字母快速按鈕
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const char of alphabet) {
            const btn = document.createElement('button');
            btn.className = 'joker-letter-btn';
            btn.textContent = char;
            btn.addEventListener('click', () => {
                inputEl.value = char;
                confirmLetter();
            });
            gridEl.appendChild(btn);
        }

        this.toggleModal('joker-modal', true);
        // 開啟 modal 後自動聞焦輸入框
        setTimeout(() => inputEl.focus(), 80);
    }

    openConfirmModal(msg, onOk) {
        this.confirmModalMsgEl.textContent = msg;
        
        const handleOk = () => {
            this.toggleModal('confirm-modal', false);
            this.confirmModalOkBtn.removeEventListener('click', handleOk);
            this.confirmModalCancelBtn.removeEventListener('click', handleCancel);
            onOk();
        };

        const handleCancel = () => {
            this.toggleModal('confirm-modal', false);
            this.confirmModalOkBtn.removeEventListener('click', handleOk);
            this.confirmModalCancelBtn.removeEventListener('click', handleCancel);
        };

        this.confirmModalOkBtn.addEventListener('click', handleOk);
        this.confirmModalCancelBtn.addEventListener('click', handleCancel);

        this.toggleModal('confirm-modal', true);
    }

    startNewGame() {
        this.gameEnded = false;
        clearInterval(this.timer);
        this.hintIndex = 0;

        this.allTiles = [];
        let idCounter = 1;
        let jokerCounter = 1;
        for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) {
                const isJ = (letter === 'JOKER');
                this.allTiles.push({
                    id: `tile-${idCounter++}`,
                    letter: isJ ? 'JOKER' : letter,
                    isJoker: isJ,
                    jokerNum: isJ ? jokerCounter++ : null,
                    assignedLetter: null
                });
            }
        }

        this.players.forEach(p => {
            p.hand = [];
            p.isIceBroken = false;
            p.score = 0;
        });
        this.boardGrid = this.createEmptyGrid();
        this.playedWordsHistory = [];

        this.runOpeningSequence();
    }

    async runOpeningSequence() {
        this.introOverlayEl.classList.add('active');
        this.shuffleStageEl.style.display = 'flex';
        this.orderCardsGridEl.style.display = 'none';

        this.introStatusTextEl.textContent = '🔀 正在將 112 張拉密牌放在桌上洗勻...';
        this.renderShuffleStage();
        sfx.playShuffleSound();
        await this.sleep(2200);

        this.drawPile = [...this.allTiles];
        this.shuffle(this.drawPile);

        this.introStatusTextEl.textContent = '🎴 每位玩家隨機抽 1 張牌，比比看誰的字母最接近 A...';
        this.shuffleStageEl.style.display = 'none';
        this.orderCardsGridEl.style.display = 'grid';
        
        const startingPlayerIdx = await this.determineStartingPlayer();
        await this.sleep(2000);

        this.introStatusTextEl.textContent = '🃏 將剩餘牌每 7 張疊成一堆，並發給每位玩家 14 張手牌...';
        await this.dealInitialHands();
        
        this.introOverlayEl.classList.remove('active');
        this.currentPlayerIndex = startingPlayerIdx;
        this.showToast(`🎮 開局完成！起始玩家：${this.players[startingPlayerIdx].name}`);
        this.renderAll();
        this.startTurn();
    }

    renderShuffleStage() {
        this.shuffleStageEl.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const tile = document.createElement('div');
            tile.className = 'shuffling-tile';
            tile.style.top = `${Math.random() * 140}px`;
            tile.style.left = `${Math.random() * 240}px`;
            tile.style.animationDelay = `${i * 0.12}s`;
            this.shuffleStageEl.appendChild(tile);
        }
    }

    determineStartingPlayer() {
        return new Promise((resolve) => {
            this.orderCardsGridEl.innerHTML = '';
            
            const drawnResults = [];
            const availableNonJokers = [...this.drawPile.filter(t => !t.isJoker)];
            this.shuffle(availableNonJokers);
            const usedLetters = new Set();

            this.players.forEach(p => {
                const idx = availableNonJokers.findIndex(t => !usedLetters.has(t.letter));
                const sampleTile = idx !== -1 ? availableNonJokers.splice(idx, 1)[0] : availableNonJokers.pop();
                if (sampleTile) {
                    usedLetters.add(sampleTile.letter);
                }
                drawnResults.push({ player: p, tile: sampleTile });
            });

            let bestIdx = 0;
            let minCharCode = 999;
            drawnResults.forEach((res, idx) => {
                const code = res.tile.letter.charCodeAt(0);
                if (code < minCharCode) {
                    minCharCode = code;
                    bestIdx = idx;
                }
            });

            drawnResults.forEach((res, idx) => {
                const card = document.createElement('div');
                card.className = 'order-card-unit';
                card.innerHTML = `
                    <div class="order-card-name">${res.player.avatar} ${res.player.name}</div>
                    <div class="rummi-tile">${res.tile.isJoker ? '<img src="images.png" style="width:28px;height:28px;object-fit:contain;">' : res.tile.letter}</div>
                    <div style="font-size:16px; color:${idx === bestIdx ? '#10b981' : '#94a3b8'}; font-weight:bold;">
                        ${idx === bestIdx ? '👑 最接近 A (先出牌)' : '字母 ' + res.tile.letter}
                    </div>
                `;
                this.orderCardsGridEl.appendChild(card);
            });

            sfx.playSuccess();
            resolve(bestIdx);
        });
    }

    async dealInitialHands() {
        for (let round = 0; round < 14; round++) {
            for (let pIdx = 0; pIdx < 4; pIdx++) {
                if (this.drawPile.length > 0) {
                    const tile = this.drawPile.pop();
                    this.players[pIdx].hand.push(tile);
                    sfx.playDraw();
                }
            }
            await this.sleep(60);
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    saveTurnSnapshot() {
        this.turnSnapshot = {
            players: JSON.parse(JSON.stringify(this.players)),
            boardGrid: JSON.parse(JSON.stringify(this.boardGrid)),
            playedFromHandThisTurn: new Set(this.playedFromHandThisTurn)
        };
    }

    restoreTurnSnapshot() {
        if (!this.turnSnapshot) return;
        this.players = JSON.parse(JSON.stringify(this.turnSnapshot.players));
        this.boardGrid = JSON.parse(JSON.stringify(this.turnSnapshot.boardGrid));
        this.playedFromHandThisTurn = new Set(this.turnSnapshot.playedFromHandThisTurn);
        this.renderAll();
    }

    startTurn() {
        if (this.gameEnded) return;

        clearInterval(this.timer);
        this.timeLeft = 180;
        this.playedFromHandThisTurn.clear();
        this.saveTurnSnapshot();

        this.turnStartWords = new Set(this.getBoardWordSets().map(setItem => this.getSetWordString(setItem.map(i => i.tile)).toUpperCase()));

        const p = this.players[this.currentPlayerIndex];
        this.updateTurnUI();
        
        this.startTimer();

        if (p.isAI) {
            this.turnMessageEl.innerHTML = `⏳ 輪到 <strong>${p.name}</strong> 正在仔細看手牌與思考單字中...`;
            setTimeout(() => this.executeAITurn(p), 3800);
        } else {
            if (!p.isIceBroken) {
                this.turnMessageEl.innerHTML = `👉 輪到 <strong>你的回合</strong>！【尚未破冰】請打出至少 4 個字母的單字進行破冰 (或點擊 💡 提示 觀看建議)`;
            } else {
                this.turnMessageEl.innerHTML = `👉 輪到 <strong>你的回合</strong>！【已破冰】可自由重組共用桌面並至少打出 1 張手牌`;
            }
        }
    }

    startTimer() {
        this.timerEl.textContent = `${this.timeLeft}s`;
        this.timerEl.classList.remove('warning');

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.timerEl.textContent = `${this.timeLeft}s`;

            if (this.timeLeft <= 20) {
                this.timerEl.classList.add('warning');
            }

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                sfx.playError();
                this.showToast('⏰ 回合超時！復原共用桌面並罰抽 1 張牌');
                this.handleTurnTimeoutPenalty();
            }
        }, 1000);
    }

    handleTurnTimeoutPenalty() {
        this.restoreTurnSnapshot();
        const p = this.players[this.currentPlayerIndex];
        if (this.drawPile.length > 0) {
            p.hand.push(this.drawPile.pop());
            sfx.playDraw();
        }
        this.renderAll();
        this.nextTurn();
    }

    nextTurn() {
        clearInterval(this.timer);
        this.clearTileSelection();
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
        this.startTurn();
    }

    getBoardWordSets() {
        const sets = [];
        for (let r = 0; r < this.GRID_ROWS; r++) {
            let currentSet = [];
            for (let c = 0; c < this.GRID_COLS; c++) {
                const tile = this.boardGrid[r][c];
                if (tile) {
                    currentSet.push({ tile, row: r, col: c });
                } else {
                    if (currentSet.length > 0) {
                        sets.push(currentSet);
                        currentSet = [];
                    }
                }
            }
            if (currentSet.length > 0) {
                sets.push(currentSet);
            }
        }
        return sets;
    }

    getExistingBoardWords() {
        const existing = new Set();
        this.getBoardWordSets().forEach(setItem => {
            const word = this.getSetWordString(setItem.map(i => i.tile)).toLowerCase();
            existing.add(word);
        });
        this.playedWordsHistory.forEach(item => {
            existing.add(item.word.toLowerCase());
        });
        return existing;
    }

    validateCurrentBoard() {
        const wordSets = this.getBoardWordSets();

        for (const setItem of wordSets) {
            const tiles = setItem.map(i => i.tile);
            if (tiles.length < 2) {
                const wordStr = this.getSetWordString(tiles);
                return { valid: false, reason: `單字塊「${wordStr}」長度不足 2 個字母 (拉密規則要求長度 >= 2)` };
            }
        }

        const formedWords = [];
        for (const setItem of wordSets) {
            const tiles = setItem.map(i => i.tile);
            const word = this.getSetWordString(tiles).toLowerCase();
            if (!isValidRummikubWord(word)) {
                return { valid: false, reason: `「${word.toUpperCase()}」不是合法的英文單字 (提示：不同單字之間必須保留至少 1 個空白格子！)` };
            }
            formedWords.push(word);
        }

        const wordCount = {};
        for (const w of formedWords) {
            wordCount[w] = (wordCount[w] || 0) + 1;
            if (wordCount[w] > 1) {
                return { valid: false, reason: `共用桌面上出現重複單字「${w.toUpperCase()}」(拉密規則不允許重複單字)` };
            }
        }

        return { valid: true, formedWords };
    }

    getSetWordString(tiles) {
        return tiles.map(tile => tile.isJoker ? (tile.assignedLetter || '?') : tile.letter).join('');
    }

    recordPlayedWords(player, formedWords) {
        formedWords.forEach(word => {
            const baseWord = getWordBaseLemma(word);
            const upper = baseWord.toUpperCase();
            if (!this.playedWordsHistory.some(item => item.word === upper)) {
                this.playedWordsHistory.push({
                    word: upper,
                    chinese: getWordChineseMeaning(baseWord),
                    player: player.name,
                    length: baseWord.length
                });
            }
        });
    }

    handleEndTurn() {
        if (this.gameEnded) {
            this.toggleModal('victory-modal', true);
            return;
        }

        const p = this.players[this.currentPlayerIndex];
        if (p.isAI) return;

        if (this.playedFromHandThisTurn.size === 0) {
            sfx.playError();
            this.showToast('⚠️ 你本回合尚未打出任何手牌！必須至少打出 1 張手牌或選擇「抽牌」');
            return;
        }

        const validation = this.validateCurrentBoard();
        if (!validation.valid) {
            sfx.playError();
            this.showToast(`❌ ${validation.reason}`);
            return;
        }

        const newWordsThisTurn = validation.formedWords
            .map(w => w.toUpperCase())
            .filter(w => !this.turnStartWords || !this.turnStartWords.has(w));

        if (!p.isIceBroken) {
            // 破冰檢查 1：不可使用百搭牌 (Joker)
            const usedJokerInIceBreak = Array.from(this.playedFromHandThisTurn).some(t => t.isJoker);
            if (usedJokerInIceBreak) {
                sfx.playError();
                this.showToast('⚠️ 破冰出牌不能使用百搭牌（Joker）！必須全數使用實體字母牌破冰。');
                return;
            }

            // 破冰檢查 2：必須包含至少一個 4 個字母（含）以上的全新單字
            const has4LetterWord = newWordsThisTurn.some(w => w.length >= 4);
            if (!has4LetterWord) {
                sfx.playError();
                this.showToast('⚠️ 破冰行動要求！首次出牌必須包含至少一個 4 個字母（含）以上的完整單字！');
                return;
            }
        }

        this.recordPlayedWords(p, validation.formedWords);

        const wordsMsg = newWordsThisTurn.length > 0 ? newWordsThisTurn.join(', ') : validation.formedWords.map(w => w.toUpperCase()).join(', ');

        if (!p.isIceBroken) {
            p.isIceBroken = true;
            sfx.playSuccess();
            this.showToast(`🎉 恭喜破冰成功！本輪拼出單字: ${wordsMsg}`);
        } else {
            sfx.playSuccess();
            this.showToast(`✅ 回合完成！本輪出牌單字: ${wordsMsg}`);
        }

        if (p.hand.length === 0) {
            this.handleVictory(p);
            return;
        }

        this.nextTurn();
    }

    handleDrawTile() {
        let p = this.players[this.currentPlayerIndex];
        if (p.isAI) return;

        const executeDraw = () => {
            if (this.drawPile.length > 0) {
                const newTile = this.drawPile.pop();
                p.hand.push(newTile);
                sfx.playDraw();
                this.showToast(`📥 抽了一張牌: [${newTile.letter === 'JOKER' ? '百搭牌' : newTile.letter}]`);
            } else {
                this.showToast('⚠️ 抽牌堆已空！無法抽牌');
            }

            this.renderAll();
            this.nextTurn();
        };

        if (this.playedFromHandThisTurn.size > 0) {
            this.openConfirmModal('你已將手牌打到共用桌上，選擇「抽牌」將會重置本回合桌面的動作，確定嗎？', () => {
                this.restoreTurnSnapshot();
                p = this.players[this.currentPlayerIndex];
                executeDraw();
            });
        } else {
            executeDraw();
        }
    }

    handleProvideHint() {
        const p = this.players[this.currentPlayerIndex];
        if (p.isAI) return;

        sfx.playTileClick();

        // 收集玩家當前所有真正可動用的手牌（包含牌架上的手牌 + 本回合暫時擺在桌面上的手牌）
        const availableHand = [...p.hand];
        this.playedFromHandThisTurn.forEach(tileId => {
            for (let r = 0; r < this.GRID_ROWS; r++) {
                for (let c = 0; c < this.GRID_COLS; c++) {
                    if (this.boardGrid[r][c] && this.boardGrid[r][c].id === tileId) {
                        availableHand.push(this.boardGrid[r][c]);
                    }
                }
            }
        });

        const allPossibleHints = [];
        // 取出已經存在於桌面上的單字
        const boardWords = this.getExistingBoardWords();

        if (!p.isIceBroken) {
            // 未破冰提示：長度 >= 3，且不可使用百搭牌 (allowJoker = false)，僅限原型單字
            ELEMENTARY_WORDS_LIST.forEach(word => {
                const wordLower = word.toLowerCase();
                if (wordLower === getWordBaseLemma(wordLower) && word.length >= 3 && !boardWords.has(wordLower)) {
                    const tilesMatched = this.matchWordWithHand(word, availableHand, false);
                    if (tilesMatched) {
                        const meaning = getWordChineseMeaning(word);
                        allPossibleHints.push(`💡 破冰提示：手上的牌可以拼出一個 ${word.length} 個字母，意思是「${meaning}」的單字！`);
                    }
                }
            });

            if (allPossibleHints.length === 0) {
                this.showToast('💡 破冰提示：尚未破冰（首次出牌需長度 >= 3 且不能用鬼牌），目前手牌無法完成破冰，建議選擇「抽牌」！');
                return;
            }

            const selectedHint = allPossibleHints[this.hintIndex % allPossibleHints.length];
            this.hintIndex++;
            this.showToast(selectedHint);
            return;
        }

        // 已破冰提示 1：搜尋桌面接龍延伸 (僅限原型單字)
        const wordSets = this.getBoardWordSets();
        for (const setItem of wordSets) {
            const currentStr = this.getSetWordString(setItem.map(i => i.tile)).toLowerCase();

            for (const targetWord of ELEMENTARY_WORDS_LIST) {
                const targetLower = targetWord.toLowerCase();
                // 僅限原型單字，排除態變化與複數型態
                if (targetLower !== getWordBaseLemma(targetLower)) continue;
                if (targetLower.length <= currentStr.length) continue;
                if (boardWords.has(targetLower)) continue;

                // 後綴接龍
                if (targetLower.startsWith(currentStr)) {
                    const suffixNeeded = targetLower.substring(currentStr.length);
                    const tilesMatched = this.matchWordWithHand(suffixNeeded, availableHand, true);
                    if (tilesMatched) {
                        const meaning = getWordChineseMeaning(targetWord);
                        allPossibleHints.push(`💡 接龍提示：手上的牌可以接在桌面「${currentStr.toUpperCase()}」後面，變成「${meaning}」的意思！`);
                    }
                }

                // 前綴接龍
                if (targetLower.endsWith(currentStr)) {
                    const prefixNeeded = targetLower.substring(0, targetLower.length - currentStr.length);
                    const tilesMatched = this.matchWordWithHand(prefixNeeded, availableHand, true);
                    if (tilesMatched) {
                        const meaning = getWordChineseMeaning(targetWord);
                        allPossibleHints.push(`💡 接龍提示：手上的牌可以接在桌面「${currentStr.toUpperCase()}」前面，變成「${meaning}」的意思！`);
                    }
                }
            }
        }

        // 已破冰提示 2：手牌獨立組字 (僅限原型單字)
        ELEMENTARY_WORDS_LIST.forEach(word => {
            const wordLower = word.toLowerCase();
            if (wordLower === getWordBaseLemma(wordLower) && word.length >= 2 && !boardWords.has(wordLower)) {
                const tilesMatched = this.matchWordWithHand(word, availableHand, true);
                if (tilesMatched) {
                    const meaning = getWordChineseMeaning(word);
                    allPossibleHints.push(`💡 出牌提示：手上的牌可以拼出一個 ${word.length} 個字母，意思是「${meaning}」的單字！`);
                }
            }
        });

        if (allPossibleHints.length === 0) {
            this.showToast('💡 出牌提示：目前手牌無法組成或接龍任何單字，建議選擇「抽牌」！');
            return;
        }

        const selectedHint = allPossibleHints[this.hintIndex % allPossibleHints.length];
        this.hintIndex++;
        this.showToast(selectedHint);
    }

    handleResetTurn() {
        const p = this.players[this.currentPlayerIndex];
        if (p.isAI) return;
        this.restoreTurnSnapshot();
        sfx.playTileClick();
        this.showToast('🔄 已還原本回合共用桌面與手牌');
    }

    async executeAITurn(aiPlayer) {
        if (this.gameEnded) return;

        // 1. 延長 AI 思考時間，提升對弈沉浸感與真實感
        this.showToast(`🤖 ${aiPlayer.name} 思考中...`);
        await this.sleep(2500);

        let hasPlayedTile = false;

        // 2. 如果未破冰，嘗試尋找一組破冰單字 (破冰不能使用百搭牌)
        if (!aiPlayer.isIceBroken) {
            const move = this.findAIIceBreakingMove(aiPlayer.hand);
            if (move) {
                const placedPositions = await this.placeTilesSequenceOnGrid(move.tiles);
                if (placedPositions) {
                    const playedIds = new Set(move.tiles.map(mt => mt.id));
                    aiPlayer.hand = aiPlayer.hand.filter(t => !playedIds.has(t.id));
                    aiPlayer.isIceBroken = true;
                    hasPlayedTile = true;
                    this.recordPlayedWords(aiPlayer, [move.word]);
                    sfx.playSuccess();
                    this.showToast(`🤖 ${aiPlayer.name} 破冰成功！拼出單字: ${move.word.toUpperCase()} (${getWordChineseMeaning(move.word)})`);
                    
                    await this.animateAITilePlacement(placedPositions);
                    this.renderAll();
                    await this.sleep(1200);

                    if (aiPlayer.hand.length === 0) {
                        this.handleVictory(aiPlayer);
                        return;
                    }
                }
            }
        } else {
            // 3. 已破冰：嘗試出一組單字/接龍 (AI 一次只出一組牌)
            const move = this.findAIRegularMove(aiPlayer.hand);
            if (move) {
                let placedPositions = null;
                if (move.type === 'new') {
                    placedPositions = await this.placeTilesSequenceOnGrid(move.tiles);
                } else if (move.type === 'extend_suffix' || move.type === 'extend_prefix') {
                    placedPositions = await this.executeBoardExtensionMove(move);
                }

                if (placedPositions && placedPositions.length > 0) {
                    const playedIds = new Set(move.tiles.map(mt => mt.id));
                    aiPlayer.hand = aiPlayer.hand.filter(t => !playedIds.has(t.id));
                    hasPlayedTile = true;
                    this.recordPlayedWords(aiPlayer, [move.word]);
                    sfx.playTileDrop();

                    const actionText = (move.type === 'new') ? '出牌' : '桌面接龍延伸';
                    this.showToast(`🤖 ${aiPlayer.name} ${actionText}: ${move.word.toUpperCase()} (${getWordChineseMeaning(move.word)})`);
                    
                    await this.animateAITilePlacement(placedPositions);
                    this.renderAll();
                    await this.sleep(1200);

                    if (aiPlayer.hand.length === 0) {
                        this.handleVictory(aiPlayer);
                        return;
                    }
                }
            }
        }

        // 4. 如果本回合無法出牌，則抽一張牌
        if (!hasPlayedTile) {
            if (this.drawPile.length > 0) {
                aiPlayer.hand.push(this.drawPile.pop());
                sfx.playDraw();
                this.showToast(`🤖 ${aiPlayer.name} 無法出牌，抽了一張牌`);
            } else {
                this.showToast(`🤖 ${aiPlayer.name} 無法出牌且抽牌堆已空，跳過回合`);
            }
            await this.sleep(1200);
        }

        this.renderAll();
        this.nextTurn();
    }

    async executeBoardExtensionMove(move) {
        const { row, startCol, tiles } = move;
        const placedPositions = [];
        for (let i = 0; i < tiles.length; i++) {
            if (this.boardGrid[row][startCol + i] === null) {
                this.boardGrid[row][startCol + i] = tiles[i];
                placedPositions.push({ r: row, c: startCol + i, tile: tiles[i] });
            }
        }
        this.autoFixRowWordSpacings(row);
        return placedPositions;
    }

    canPlaceWordAt(r, startC, len) {
        if (startC - 1 >= 0 && this.boardGrid[r][startC - 1] !== null) {
            return false;
        }
        if (startC + len < this.GRID_COLS && this.boardGrid[r][startC + len] !== null) {
            return false;
        }
        for (let i = 0; i < len; i++) {
            if (startC + i >= this.GRID_COLS) return false;
            if (this.boardGrid[r][startC + i] !== null) return false;
        }
        return true;
    }

    async placeTilesSequenceOnGrid(tiles) {
        const len = tiles.length;

        for (let r = 0; r < this.GRID_ROWS; r++) {
            for (let startC = 0; startC <= this.GRID_COLS - len; startC++) {
                if (this.canPlaceWordAt(r, startC, len)) {
                    const placedPositions = [];
                    for (let i = 0; i < len; i++) {
                        this.boardGrid[r][startC + i] = tiles[i];
                        placedPositions.push({ r, c: startC + i, tile: tiles[i] });
                    }
                    this.autoFixRowWordSpacings(r);
                    return placedPositions;
                }
            }
        }
        return null;
    }

    async animateAITilePlacement(placedPositions) {
        if (!placedPositions || placedPositions.length === 0) return;
        for (const item of placedPositions) {
            const cellEl = this.boardGridEl.querySelector(`.board-cell[data-row="${item.r}"][data-col="${item.c}"]`);
            if (cellEl) {
                cellEl.innerHTML = '';
                const tileEl = this.createTileElement(item.tile, 'board', item.r, item.c);
                tileEl.classList.add('tile-drop-anim');
                cellEl.appendChild(tileEl);
                sfx.playTileDrop();
            }
            await this.sleep(280);
        }
    }

    findAIIceBreakingMove(hand) {
        const existingWords = this.getExistingBoardWords();
        for (const word of AI_1200_WORDS_LIST) {
            // 破冰：需為全新單字 (長度 >= 3)，且不在桌面上，且【不允許使用百搭牌 (Joker)】
            if (word.length >= 3 && !existingWords.has(word.toLowerCase())) {
                const tilesMatched = this.matchWordWithHand(word, hand, false);
                if (tilesMatched) {
                    return { type: 'new', word, tiles: tilesMatched };
                }
            }
        }
        return null;
    }

    findAIRegularMove(hand) {
        const existingWords = this.getExistingBoardWords();

        // 優先搜尋 1：對桌面上既有的單字進行手牌延伸接龍（例：CAT -> CATS, IN -> WIN）
        const extendMove = this.findAIExtendBoardWordMove(hand, existingWords);
        if (extendMove) return extendMove;

        // 搜尋 2：手牌獨立拼出桌面上未曾出現過的全新合法單字
        for (const word of AI_1200_WORDS_LIST) {
            if (word.length >= 2 && !existingWords.has(word.toLowerCase())) {
                const tilesMatched = this.matchWordWithHand(word, hand, true);
                if (tilesMatched) {
                    return { type: 'new', word, tiles: tilesMatched };
                }
            }
        }
        return null;
    }

    findAIExtendBoardWordMove(hand, existingWords) {
        const wordSets = this.getBoardWordSets();

        for (const setItem of wordSets) {
            const currentStr = this.getSetWordString(setItem.map(i => i.tile)).toLowerCase();
            const r = setItem[0].row;
            const startC = setItem[0].col;
            const endC = setItem[setItem.length - 1].col;

            for (const targetWord of AI_1200_WORDS_LIST) {
                const targetLower = targetWord.toLowerCase();
                if (targetLower.length <= currentStr.length) continue;
                if (existingWords.has(targetLower)) continue;

                // 情況 A：後綴延伸接龍 (例：CAT -> CATS, PLAY -> PLAYED)
                if (targetLower.startsWith(currentStr)) {
                    const suffixNeeded = targetLower.substring(currentStr.length);
                    const suffixLen = suffixNeeded.length;

                    if (endC + suffixLen < this.GRID_COLS) {
                        let canPlace = true;
                        for (let i = 1; i <= suffixLen; i++) {
                            if (this.boardGrid[r][endC + i] !== null) {
                                canPlace = false;
                                break;
                            }
                        }
                        if (endC + suffixLen + 1 < this.GRID_COLS && this.boardGrid[r][endC + suffixLen + 1] !== null) {
                            canPlace = false;
                        }

                        if (canPlace) {
                            const tilesMatched = this.matchWordWithHand(suffixNeeded, hand, true);
                            if (tilesMatched) {
                                return {
                                    type: 'extend_suffix',
                                    word: targetWord,
                                    row: r,
                                    startCol: endC + 1,
                                    tiles: tilesMatched
                                };
                            }
                        }
                    }
                }

                // 情況 B：前綴延伸接龍 (例：IN -> WIN, AT -> BAT)
                if (targetLower.endsWith(currentStr)) {
                    const prefixNeeded = targetLower.substring(0, targetLower.length - currentStr.length);
                    const prefixLen = prefixNeeded.length;

                    if (startC - prefixLen >= 0) {
                        let canPlace = true;
                        for (let i = 1; i <= prefixLen; i++) {
                            if (this.boardGrid[r][startC - i] !== null) {
                                canPlace = false;
                                break;
                            }
                        }
                        if (startC - prefixLen - 1 >= 0 && this.boardGrid[r][startC - prefixLen - 1] !== null) {
                            canPlace = false;
                        }

                        if (canPlace) {
                            const tilesMatched = this.matchWordWithHand(prefixNeeded, hand, true);
                            if (tilesMatched) {
                                return {
                                    type: 'extend_prefix',
                                    word: targetWord,
                                    row: r,
                                    startCol: startC - prefixLen,
                                    tiles: tilesMatched
                                };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    matchWordWithHand(word, hand, allowJoker = true) {
        // 深拷貝手牌陣列物件，防止測試時污染真實手牌的 assignedLetter
        const remainingHand = hand.map(t => ({ ...t }));
        const resultTiles = [];

        for (const char of word.toUpperCase()) {
            const exactIdx = remainingHand.findIndex(t => !t.isJoker && t.letter === char);
            if (exactIdx !== -1) {
                resultTiles.push(remainingHand.splice(exactIdx, 1)[0]);
            } else {
                if (!allowJoker) return null; // 破冰或指定不允許鬼牌時直接失敗

                const jokerIdx = remainingHand.findIndex(t => t.isJoker);
                if (jokerIdx !== -1) {
                    const jokerTile = remainingHand.splice(jokerIdx, 1)[0];
                    jokerTile.assignedLetter = char;
                    resultTiles.push(jokerTile);
                } else {
                    return null;
                }
            }
        }
        return resultTiles;
    }

    autoFixRowWordSpacings(r) {
        let sets = [];
        let cur = [];
        for (let c = 0; c < this.GRID_COLS; c++) {
            if (this.boardGrid[r][c]) {
                cur.push({ tile: this.boardGrid[r][c], c });
            } else {
                if (cur.length > 0) {
                    sets.push(cur);
                    cur = [];
                }
            }
        }
        if (cur.length > 0) sets.push(cur);

        if (sets.length <= 1) return;

        for (let i = 0; i < sets.length - 1; i++) {
            const seg1 = sets[i];
            const seg2 = sets[i + 1];

            const seg1End = seg1[seg1.length - 1].c;
            const seg2Start = seg2[0].c;

            if (seg2Start <= seg1End + 1) {
                const shiftAmount = (seg1End + 2) - seg2Start;
                const lastTileCol = sets[sets.length - 1][sets[sets.length - 1].length - 1].c;
                if (lastTileCol + shiftAmount < this.GRID_COLS) {
                    for (let sIdx = sets.length - 1; sIdx >= i + 1; sIdx--) {
                        const targetSet = sets[sIdx];
                        for (let tIdx = targetSet.length - 1; tIdx >= 0; tIdx--) {
                            const item = targetSet[tIdx];
                            this.boardGrid[r][item.c + shiftAmount] = item.tile;
                            this.boardGrid[r][item.c] = null;
                            item.c = item.c + shiftAmount;
                        }
                    }
                }
            }
        }
    }

    placeTileOnGrid(tileId, row, col, source) {
        const p = this.players[this.currentPlayerIndex];
        if (p.isAI) return;

        // 嚴格確保出牌座標在牌桌邊界範圍內
        if (row < 0 || row >= this.GRID_ROWS || col < 0 || col >= this.GRID_COLS) {
            this.showToast('⚠️ 出牌位置已超出牌桌範圍！');
            return;
        }

        let tile = null;
        if (source === 'rack') {
            const idx = p.hand.findIndex(t => t.id === tileId);
            if (idx !== -1) {
                tile = p.hand.splice(idx, 1)[0];
                this.playedFromHandThisTurn.add(tile.id);
            }
        } else if (source === 'board') {
            for (let r = 0; r < this.GRID_ROWS; r++) {
                for (let c = 0; c < this.GRID_COLS; c++) {
                    if (this.boardGrid[r][c] && this.boardGrid[r][c].id === tileId) {
                        tile = this.boardGrid[r][c];
                        this.boardGrid[r][c] = null;
                        break;
                    }
                }
            }
        }

        if (tile) {
            const doPlace = () => {
                if (this.boardGrid[row][col] !== null) {
                    // 若目標位置有牌，右移其他牌，但確保最右端不溢出
                    for (let c = this.GRID_COLS - 1; c > col; c--) {
                        this.boardGrid[row][c] = this.boardGrid[row][c - 1];
                    }
                }

                this.boardGrid[row][col] = tile;
                this.autoFixRowWordSpacings(row);
                sfx.playTileDrop();
                this.renderAll();
            };

            if (tile.isJoker && !tile.assignedLetter) {
                this.openJokerModal(tile, doPlace);
            } else {
                doPlace();
            }
        }
    }

    moveTileFromBoardToRack(tileId) {
        const p = this.players[this.currentPlayerIndex];
        if (p.isAI) return;

        let tile = null;
        for (let r = 0; r < this.GRID_ROWS; r++) {
            for (let c = 0; c < this.GRID_COLS; c++) {
                if (this.boardGrid[r][c] && this.boardGrid[r][c].id === tileId) {
                    tile = this.boardGrid[r][c];
                    this.boardGrid[r][c] = null;
                    break;
                }
            }
        }

        if (tile) {
            if (tile.isJoker) tile.assignedLetter = null;
            p.hand.push(tile);
            this.playedFromHandThisTurn.delete(tile.id);
            sfx.playTileClick();
            this.renderAll();
        }
    }

    reorderRackTile(draggedTileId, targetTileId) {
        const hand = this.players[0].hand;
        const fromIdx = hand.findIndex(t => t.id === draggedTileId);
        const toIdx = hand.findIndex(t => t.id === targetTileId);
        if (fromIdx !== -1 && toIdx !== -1) {
            const [movedTile] = hand.splice(fromIdx, 1);
            hand.splice(toIdx, 0, movedTile);
            sfx.playTileClick();
            this.renderRack();
        }
    }

    handleVictory(winner) {
        this.gameEnded = true;
        clearInterval(this.timer);
        sfx.playWin();

        // 遊戲結束：停止背景音樂
        if (this.bgmPlayerEl) {
            this.bgmPlayerEl.pause();
            this.isBgmPlaying = false;
            if (this.btnToggleBgm) {
                this.btnToggleBgm.textContent = '🎵 背景音樂: 關';
                this.btnToggleBgm.classList.remove('primary-btn');
            }
        }

        let winnerScore = 0;
        let detailsHtml = `<h3>🏆 遊戲結束！勝者：${winner.name}</h3><ul>`;

        this.players.forEach(p => {
            if (p.id !== winner.id) {
                let pScore = 0;
                p.hand.forEach(t => {
                    pScore += t.isJoker ? 30 : 1;
                });
                winnerScore += pScore;
                p.score = -pScore;
                detailsHtml += `<li>${p.name}: 扣 ${pScore} 分 (剩餘 ${p.hand.length} 張手牌)</li>`;
            }
        });

        winner.score = winnerScore;
        detailsHtml += `<li><strong>${winner.name} 獲得總分: +${winnerScore} 分</strong></li></ul>`;

        detailsHtml += `
            <div class="word-review-section">
                <div class="word-review-title">
                    <span>📖 本局單字學習總複習 (${this.playedWordsHistory.length} 個單字)</span>
                    ${this.playedWordsHistory.length > 0 ? `<button class="btn-icon primary-btn" onclick="game.startSlidePresentation()">▶ 帶領學生複習單字簡報秀</button>` : ''}
                </div>
                <div class="word-review-grid">
        `;

        if (this.playedWordsHistory.length === 0) {
            detailsHtml += `<div style="grid-column: 1/-1; color:#94a3b8;">本局暫無組出的單字紀錄。</div>`;
        } else {
            this.playedWordsHistory.forEach(item => {
                const lowerWord = item.word.toLowerCase();
                detailsHtml += `
                    <div class="word-review-card">
                        <div class="review-eng">
                            <span>${lowerWord}</span>
                            <button class="btn-speak" title="聽雙語發音" onclick="speakBilingual('${lowerWord}', '${item.chinese}')">🔊</button>
                        </div>
                        <div class="review-chi">${item.chinese}</div>
                        <div class="review-meta">${item.length} 個字母 • ${item.player} 出牌</div>
                    </div>
                `;
            });
        }

        detailsHtml += `
                </div>
            </div>
        `;

        const modalBody = document.getElementById('victory-body');
        modalBody.innerHTML = detailsHtml;
        this.toggleModal('victory-modal', true);

        // 遊戲結束後：出牌按鈕改為「複習」
        if (this.btnEndTurn) {
            this.btnEndTurn.innerHTML = `<span class="pill-icon">📖</span><span class="pill-label">複習</span>`;
            this.btnEndTurn.disabled = false;
        }
    }

    startSlidePresentation() {
        if (this.playedWordsHistory.length === 0) return;
        this.currentSlideIndex = 0;
        this.toggleModal('victory-modal', false);
        this.toggleModal('slide-modal', true);
        this.renderSlide(0);
    }

    closeSlidePresentation() {
        clearInterval(this.slideAutoPlayInterval);
        this.slideAutoPlayInterval = null;
        this.btnSlidePlay.textContent = '▶ 自動輪播';
        this.toggleModal('slide-modal', false);
    }

    renderSlide(idx) {
        if (this.playedWordsHistory.length === 0) return;
        this.currentSlideIndex = (idx + this.playedWordsHistory.length) % this.playedWordsHistory.length;
        const item = this.playedWordsHistory[this.currentSlideIndex];

        this.slideWordTextEl.textContent = item.word.toLowerCase().split('').join(' ');
        this.slideChiTextEl.textContent = item.chinese;
        this.slideMetaTextEl.textContent = `${item.length} 個字母 • ${item.player} 出牌 (第 ${this.currentSlideIndex + 1} / ${this.playedWordsHistory.length} 頁)`;

        window.speakBilingual(item.word, item.chinese);
    }

    prevSlide() {
        this.renderSlide(this.currentSlideIndex - 1);
    }

    nextSlide() {
        this.renderSlide(this.currentSlideIndex + 1);
    }

    speakCurrentSlide() {
        const item = this.playedWordsHistory[this.currentSlideIndex];
        if (item) {
            window.speakBilingual(item.word, item.chinese);
        }
    }

    toggleSlideAutoPlay() {
        if (this.slideAutoPlayInterval) {
            clearInterval(this.slideAutoPlayInterval);
            this.slideAutoPlayInterval = null;
            this.btnSlidePlay.textContent = '▶ 自動輪播';
            this.showToast('⏸ 已暫停自動輪播');
        } else {
            this.btnSlidePlay.textContent = '⏸ 暫停輪播';
            this.showToast('▶ 開啟 5 秒自動輪播');
            this.slideAutoPlayInterval = setInterval(() => {
                this.nextSlide();
            }, 5000);
        }
    }

    sortRack(type) {
        const p = this.players[0];
        if (type === 'az') {
            p.hand.sort((a, b) => a.letter.localeCompare(b.letter));
        } else if (type === 'vowel') {
            const vowels = 'AEIOU';
            p.hand.sort((a, b) => {
                const aV = vowels.includes(a.letter) ? 0 : 1;
                const bV = vowels.includes(b.letter) ? 0 : 1;
                if (aV !== bV) return aV - bV;
                return a.letter.localeCompare(b.letter);
            });
        }
        sfx.playTileClick();
        this.renderRack();
    }

    clearTileSelection() {
        this.selectedTileId = null;
        this.selectedTileSource = null;
        document.querySelectorAll('.rummi-tile.selected').forEach(el => el.classList.remove('selected'));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    renderAll() {
        this.renderPlayersBar();
        this.renderBoard();
        this.renderRack();
        this.updateTurnUI();
    }

    renderPlayersBar() {
        const barEl = document.getElementById('players-bar');
        barEl.innerHTML = '';

        this.players.forEach((p, idx) => {
            const isActive = (idx === this.currentPlayerIndex);
            const card = document.createElement('div');
            card.className = `player-card ${isActive ? 'active' : ''}`;
            card.innerHTML = `
                <div class="player-avatar-box">
                    <div class="player-avatar">${p.avatar}</div>
                    ${isActive ? `<div class="turn-indicator-arrow">⬅</div>` : ''}
                </div>
                <div class="player-name">${p.name}</div>
                <span class="badge-ice ${p.isIceBroken ? 'broken' : 'unbroken'}">
                    ${p.isIceBroken ? '已破冰' : '未破冰'}
                </span>
                <div class="player-tiles-badge">🂠 ${p.hand.length} 張</div>
            `;
            barEl.appendChild(card);
        });
    }

    renderBoard() {
        this.boardGridEl.innerHTML = '';
        this.drawPileCountEl.textContent = `抽牌堆: ${this.drawPile.length} 張`;

        this.renderDrawStacks();

        const wordSets = this.getBoardWordSets();
        
        const matrixEl = document.createElement('div');
        matrixEl.className = 'board-grid-matrix';

        for (let r = 0; r < this.GRID_ROWS; r++) {
            const rowEl = document.createElement('div');
            rowEl.className = 'board-row';

            for (let c = 0; c < this.GRID_COLS; c++) {
                const cellEl = document.createElement('div');
                cellEl.className = 'board-cell';
                cellEl.dataset.row = r;
                cellEl.dataset.col = c;

                const tile = this.boardGrid[r][c];

                const wordStart = wordSets.find(setItem => setItem[0].row === r && setItem[0].col === c);
                if (wordStart) {
                    const tiles = wordStart.map(i => i.tile);
                    const wordStr = this.getSetWordString(tiles).toLowerCase();
                    const isValid = tiles.length >= 2 && isValidRummikubWord(wordStr);
                    const chiMeaning = isValid ? getWordChineseMeaning(wordStr) : '';

                    const badgeEl = document.createElement('div');
                    badgeEl.className = `word-badge-floating ${isValid ? 'valid' : 'invalid'}`;
                    badgeEl.innerHTML = `${isValid ? '✓ ' + tiles.length + ' <span class="chi-meaning">' + chiMeaning + '</span>' : '✗ ' + tiles.length}`;
                    cellEl.appendChild(badgeEl);
                }

                if (tile) {
                    const tileEl = this.createTileElement(tile, 'board', r, c);
                    cellEl.appendChild(tileEl);
                }

                cellEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cellEl.classList.add('drag-over');
                });

                cellEl.addEventListener('dragleave', (e) => {
                    e.stopPropagation();
                    cellEl.classList.remove('drag-over');
                });

                cellEl.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cellEl.classList.remove('drag-over');
                    const tileDataStr = e.dataTransfer.getData('text/plain');
                    if (tileDataStr) {
                        const data = JSON.parse(tileDataStr);
                        this.placeTileOnGrid(data.id, r, c, data.source);
                    }
                });

                cellEl.addEventListener('click', (e) => {
                    if (this.selectedTileId) {
                        e.stopPropagation();
                        if (this.selectedTileSource === 'rack') {
                            // 手牌放到桌面格
                            this.placeTileOnGrid(this.selectedTileId, r, c, 'rack');
                            this.clearTileSelection();
                        } else if (this.selectedTileSource === 'board') {
                            // 桌面牌移到另一個格子（重組）
                            this.placeTileOnGrid(this.selectedTileId, r, c, 'board');
                            this.clearTileSelection();
                        }
                    }
                });

                rowEl.appendChild(cellEl);
            }
            matrixEl.appendChild(rowEl);
        }

        this.boardGridEl.appendChild(matrixEl);
    }

    renderDrawStacks() {
        if (!this.stacksGridEl) return;
        this.stacksGridEl.innerHTML = '';
    }

    renderRack() {
        this.rackGridEl.innerHTML = '';
        const userHand = this.players[0].hand;

        userHand.forEach(tile => {
            const tileEl = this.createTileElement(tile, 'rack');
            this.rackGridEl.appendChild(tileEl);
        });
    }

    createTileElement(tile, source, row = null, col = null) {
        const el = document.createElement('div');
        el.className = `rummi-tile ${tile.isJoker ? 'joker' : ''} ${this.selectedTileId === tile.id ? 'selected' : ''}`;
        el.draggable = true;

        if (tile.isJoker) {
            const numLabel = tile.jokerNum === 1 ? '①' : (tile.jokerNum === 2 ? '②' : '');
            el.innerHTML = `<span class="joker-num">${numLabel}</span><img src="images.png" class="joker-img" alt="Joker">`;
            if (tile.assignedLetter) {
                el.innerHTML += `<span class="assigned-letter">${tile.assignedLetter}</span>`;
            }
        } else {
            el.textContent = tile.letter;
        }

        el.addEventListener('dragstart', (e) => {
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: tile.id, source }));
            sfx.playTileClick();
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        if (source === 'rack') {
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            el.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tileDataStr = e.dataTransfer.getData('text/plain');
                if (tileDataStr) {
                    const data = JSON.parse(tileDataStr);
                    if (data.source === 'rack' && data.id !== tile.id) {
                        this.reorderRackTile(data.id, tile.id);
                    }
                }
            });
        }

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            sfx.playTileClick();

            // 若有選中的桌面牌，點擊牌架上任意牌 → 把桌面牌送回手牌
            if (this.selectedTileId && this.selectedTileSource === 'board' && source === 'rack') {
                this.moveTileFromBoardToRack(this.selectedTileId);
                this.clearTileSelection();
                return;
            }

            if (this.selectedTileId && this.selectedTileSource === 'rack' && source === 'rack' && this.selectedTileId !== tile.id) {
                this.reorderRackTile(this.selectedTileId, tile.id);
                this.clearTileSelection();
                return;
            }

            if (this.selectedTileId === tile.id) {
                // 若再次點擊已選中的百搭牌，開啟 Modal 供修改字母
                if (tile.isJoker && this.currentPlayerIndex === 0) {
                    this.openJokerModal(tile, () => {
                        this.renderAll();
                    });
                    return;
                }
                this.clearTileSelection();
            } else {
                this.clearTileSelection();
                this.selectedTileId = tile.id;
                this.selectedTileSource = source;
                el.classList.add('selected');
            }
        });

        return el;
    }

    updateTurnUI() {
        const isHumanTurn = (this.currentPlayerIndex === 0) && !this.gameEnded;
        this.btnEndTurn.disabled = !isHumanTurn && !this.gameEnded;
        if (this.gameEnded) {
            this.btnEndTurn.innerHTML = `<span class="pill-icon">📖</span><span class="pill-label">複習</span>`;
        } else {
            this.btnEndTurn.innerHTML = `<span class="pill-icon">✅</span><span class="pill-label">出牌</span>`;
        }
        this.btnDrawTile.disabled = !isHumanTurn;
        this.btnHint.disabled = !isHumanTurn;
        this.btnResetTurn.disabled = !isHumanTurn;
        this.renderPlayersBar();
    }

    toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (show) modal.classList.add('active');
            else modal.classList.remove('active');
        }
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 3500);
        }, 4000);
    }
}

// 初始化遊戲
window.addEventListener('DOMContentLoaded', () => {
    window.game = new RummikubGame();
});

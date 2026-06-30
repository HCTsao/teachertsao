/**
 * 密室脫逃：直式密碼鎖
 * 核心遊戲邏輯 (明亮版 & 自動跳格版)
 */

// --- 音效引擎 (Web Audio API) ---
class GameSound {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.bgmTimer = null;
        this.bgmPlaying = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, volume = 0.08) {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playCorrect() {
        this.playTone(523.25, 'triangle', 0.1, 0.12);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.25, 0.12), 80);
    }

    playWrong() {
        this.playTone(220, 'sawtooth', 0.15, 0.1);
        setTimeout(() => this.playTone(180, 'sawtooth', 0.3, 0.1), 120);
    }

    playClick() {
        this.playTone(600, 'sine', 0.05, 0.05);
    }

    playVictory() {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 'triangle', 0.2, 0.12), i * 120);
        });
    }

    playDefeat() {
        this.playTone(150, 'sawtooth', 0.6, 0.15);
    }

    startBGM() {
        if (this.bgmMuted || this.bgmPlaying) return;
        this.init();
        this.bgmPlaying = true;
        
        let index = 0;
        const melody = [220.00, 261.63, 293.66, 220.00, 293.66, 329.63, 392.00, 329.63];
        
        const playNext = () => {
            if (!this.bgmPlaying || this.bgmMuted) return;
            const note = melody[index % melody.length] / 2;
            // 提高背景音樂音量為 0.08，讓音樂更清晰
            this.playTone(note, 'sine', 0.5, 0.08);
            index++;
            this.bgmTimer = setTimeout(playNext, 600);
        };
        playNext();
    }

    stopBGM() {
        this.bgmPlaying = false;
        clearTimeout(this.bgmTimer);
    }
}

const sounds = new GameSound();

// --- 遊戲狀態 ---
const state = {
    difficulty: 'easy',
    operationMode: 'add', // 'add' (加法練習) 或 'sub' (減法練習)
    solvedCount: 0, // 0-3 已解開題數
    
    // 預先生成的三個題目
    problems: [],
    
    // 目前題目資料
    num1: 0,
    num2: 0,
    op: '+',
    ans: 0,
    requiresCarry: false,
    requiresBorrow: false,

    // 進退位標記
    isCarry: false,
    isBorrow: false,

    // 輸入控制變數
    activeCellId: '',
    inputs: {},       // key 是 cellId，value 是字元
    
    // 密碼鎖輪盤總對應字元陣列
    wheelsText: [],   
    wheelsSolved: [], 
    problemWheelRanges: [], 

    totalAttempts: 0,
    correctAttempts: 0
};

// --- DOM 元素 ---
const dom = {
    diffScreen: document.getElementById('difficulty-screen'),
    playScreen: document.getElementById('play-screen'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    statusBar: document.getElementById('status-bar'),
    stepTip: document.getElementById('step-tip'),
    wheelsContainer: document.getElementById('wheels-container'),
    
    // 運算與難度面板
    opPanel: document.getElementById('op-selection-panel'),
    diffPanel: document.getElementById('diff-selection-panel'),
    btnOpAdd: document.getElementById('btn-op-add'),
    btnOpSub: document.getElementById('btn-op-sub'),
    btnBackOp: document.getElementById('btn-back-op'),
    selectedOpLbl: document.getElementById('selected-op-lbl'),

    // 直式文字與位置
    n1Hundreds: document.getElementById('n1-hundreds'),
    n1Tens: document.getElementById('n1-tens'),
    n1Units: document.getElementById('n1-units'),
    n2Hundreds: document.getElementById('n2-hundreds'),
    n2Tens: document.getElementById('n2-tens'),
    n2Units: document.getElementById('n2-units'),
    mathOp: document.getElementById('math-op'),
    ansHundreds: document.getElementById('ans-hundreds'),
    ansTens: document.getElementById('ans-tens'),
    ansUnits: document.getElementById('ans-units'),
    
    // 輔助標記
    carryBox: document.getElementById('carry-box'),
    borrowTensBox: document.getElementById('borrow-tens-box'),
    borrowUnitsBox: document.getElementById('borrow-units-box'),
    btnCarry: document.getElementById('btn-carry-mark'),
    btnBorrow: document.getElementById('btn-borrow-mark'),
    
    // 彈窗
    vicModal: document.getElementById('victory-modal'),
    defModal: document.getElementById('defeat-modal'),
    valDiff: document.getElementById('val-diff'),
    valCorrect: document.getElementById('val-correct'),
    valTotal: document.getElementById('val-total')
};

// --- 初始化綁定 ---
document.addEventListener('DOMContentLoaded', () => {
    // 運算類型選擇
    dom.btnOpAdd.addEventListener('click', () => {
        sounds.playClick();
        state.operationMode = 'add';
        dom.selectedOpLbl.textContent = '已選擇：加法練習';
        
        // 動態修改難度選擇選單的文字敘述
        document.getElementById('easy-title').textContent = '簡單版 (不進位加法)';
        document.getElementById('easy-desc').textContent = '練習基礎二位數不進位加法，十個位對齊輕鬆算！';
        document.getElementById('basic-title').textContent = '基礎版 (進位加法)';
        document.getElementById('basic-desc').textContent = '進位標記 +1 框框對齊，熟練二位數進位加法！';
        document.getElementById('advanced-title').textContent = '進階版 (加法墨水挖空)';
        document.getElementById('advanced-desc').textContent = '加法算式數字被神秘墨水遮住了！逆向思考還原加法算式！';

        dom.opPanel.classList.add('hide');
        dom.diffPanel.classList.remove('hide');
    });

    dom.btnOpSub.addEventListener('click', () => {
        sounds.playClick();
        state.operationMode = 'sub';
        dom.selectedOpLbl.textContent = '已選擇：減法練習';
        
        // 動態修改難度選擇選單的文字敘述
        document.getElementById('easy-title').textContent = '簡單版 (不退位減法)';
        document.getElementById('easy-desc').textContent = '練習基礎二位數不退位減法，十個位對齊輕鬆算！';
        document.getElementById('basic-title').textContent = '基礎版 (退位減法)';
        document.getElementById('basic-desc').textContent = '借位劃斜線、十位減一，熟練二位數退位減法！';
        document.getElementById('advanced-title').textContent = '進階版 (減法墨水挖空)';
        document.getElementById('advanced-desc').textContent = '減法算式數字被神秘墨水遮住了！逆向思考還原減法算式！';

        dom.opPanel.classList.add('hide');
        dom.diffPanel.classList.remove('hide');
    });

    dom.btnBackOp.addEventListener('click', () => {
        sounds.playClick();
        dom.diffPanel.classList.add('hide');
        dom.opPanel.classList.remove('hide');
    });

    // 難度選擇
    document.querySelectorAll('#diff-selection-panel .diff-card').forEach(card => {
        card.addEventListener('click', () => {
            sounds.init();
            const diff = card.getAttribute('data-diff');
            startGame(diff);
            sounds.startBGM();
        });
    });

    // 返回選單
    dom.btnBackMenu.addEventListener('click', () => {
        sounds.playClick();
        exitToMenu();
    });

    // 虛擬鍵盤點擊
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            handleVirtualKey(val);
        });
    });

    // 彈窗按鈕
    document.getElementById('btn-next-victory').onclick = () => {
        dom.vicModal.classList.remove('active');
        exitToMenu();
    };

    document.getElementById('btn-retry').onclick = () => {
        dom.defModal.classList.remove('active');
        startGame(state.difficulty);
    };

    document.getElementById('btn-quit').onclick = () => {
        dom.defModal.classList.remove('active');
        exitToMenu();
    };

    // 靜音控制
    document.getElementById('sound-toggle').onclick = (e) => {
        sounds.muted = !sounds.muted;
        e.target.textContent = sounds.muted ? "🔇" : "🔊";
    };
    document.getElementById('bgm-toggle').onclick = (e) => {
        sounds.bgmMuted = !sounds.bgmMuted;
        e.target.textContent = sounds.bgmMuted ? "🔇" : "🎵";
        if (sounds.bgmMuted) sounds.stopBGM();
        else sounds.startBGM();
    };

    // 鍵盤輸入支援
    document.addEventListener('keydown', (e) => {
        if (!dom.playScreen.classList.contains('active')) return;
        if (e.key >= '0' && e.key <= '9') handleVirtualKey(e.key);
        else if (e.key === 'Backspace' || e.key === 'Delete') handleVirtualKey('clear');
        else if (e.key === 'Enter') handleVirtualKey('confirm');
    });

    // 進退位標記按鈕 (基礎/進階模式下，保留備用)
    dom.btnCarry.onclick = () => toggleCarry();
    dom.btnBorrow.onclick = () => toggleBorrow();
});

// --- 進入與退出控制 ---
function startGame(difficulty) {
    state.difficulty = difficulty;
    state.solvedCount = 0;
    state.totalAttempts = 0;
    state.correctAttempts = 0;
    state.problems = [];

    // 1. 預先生成 3 個關卡的題目
    for (let i = 0; i < 3; i++) {
        state.problems.push(generateProblemData(difficulty, i));
    }

    // 2. 規劃密碼輪盤總字元
    state.wheelsText = [];
    state.wheelsSolved = [];
    state.problemWheelRanges = [];

    let currentIdx = 0;
    state.problems.forEach(prob => {
        let targets = [];
        if (difficulty === 'advanced') {
            // 進階版：密碼是被墨水遮住的那兩個數字
            targets = prob.inkDigits;
        } else {
            const ansStr = prob.ans.toString();
            for(let i = 0; i < ansStr.length; i++) {
                targets.push(ansStr[i]);
            }
        }
        
        const len = targets.length;
        state.problemWheelRanges.push({
            start: currentIdx,
            end: currentIdx + len - 1
        });

        for(let i = 0; i < len; i++) {
            state.wheelsText.push(targets[i]);
            state.wheelsSolved.push(false);
            currentIdx++;
        }
    });

    // 3. 動態渲染密碼輪盤到畫面上
    renderLockWheels();

    // 4. UI 顯示
    dom.diffScreen.classList.remove('active');
    dom.playScreen.classList.add('active');

    loadProblemIndex(0);
}

function exitToMenu() {
    dom.playScreen.classList.remove('active');
    dom.diffScreen.classList.add('active');
    
    // 重設難度選擇畫面顯示：回到第一步選擇加減法
    dom.diffPanel.classList.add('hide');
    dom.opPanel.classList.remove('hide');
    
    sounds.stopBGM();
}

function renderLockWheels() {
    dom.wheelsContainer.innerHTML = '';
    state.wheelsText.forEach((char, idx) => {
        const wheel = document.createElement('div');
        wheel.className = 'lock-wheel';
        wheel.id = `wheel-${idx}`;
        wheel.textContent = '?';
        dom.wheelsContainer.appendChild(wheel);
    });
}

function generateProblemData(diff, index) {
    let n1, n2, op, ans;

    if (diff === 'easy') {
        op = state.operationMode === 'add' ? '+' : '-';
        if (op === '+') {
            const t1 = Math.floor(Math.random() * 7) + 1; 
            const t2 = Math.floor(Math.random() * (9 - t1)) + 1;
            const u1 = Math.floor(Math.random() * 8) + 1; 
            const u2 = Math.floor(Math.random() * (9 - u1)) + 0;
            n1 = t1 * 10 + u1;
            n2 = t2 * 10 + u2;
        } else {
            const t1 = Math.floor(Math.random() * 8) + 2; 
            const t2 = Math.floor(Math.random() * t1) + 1;
            const u1 = Math.floor(Math.random() * 9) + 1; 
            const u2 = Math.floor(Math.random() * (u1 + 1));
            n1 = t1 * 10 + u1;
            n2 = t2 * 10 + u2;
        }
        ans = op === '+' ? n1 + n2 : n1 - n2;
        return { num1: n1, num2: n2, op, ans };
    }
    else if (diff === 'basic') {
        op = state.operationMode === 'add' ? '+' : '-';
        if (op === '+') {
            const t1 = Math.floor(Math.random() * 5) + 3; // 3-7
            const t2 = Math.floor(Math.random() * 5) + 3; // 3-7
            const u1 = Math.floor(Math.random() * 8) + 2;
            const possibleU2 = [];
            for (let i = 1; i <= 9; i++) {
                if (u1 + i >= 10) possibleU2.push(i);
            }
            const u2 = possibleU2[Math.floor(Math.random() * possibleU2.length)];
            n1 = t1 * 10 + u1;
            n2 = t2 * 10 + u2;
        } else {
            const t1 = Math.floor(Math.random() * 8) + 2;
            const t2 = Math.floor(Math.random() * (t1 - 1)) + 1;
            const u1 = Math.floor(Math.random() * 8);
            const u2 = Math.floor(Math.random() * (9 - u1)) + (u1 + 1);
            n1 = t1 * 10 + u1;
            n2 = t2 * 10 + u2;
        }
        ans = op === '+' ? n1 + n2 : n1 - n2;
        return { num1: n1, num2: n2, op, ans };
    }
    else {
        // 進階挖空版
        if (state.operationMode === 'add') {
            op = '+';
            // 三題均為加法
            const t1 = Math.floor(Math.random() * 5) + 2;
            const t2 = Math.floor(Math.random() * 3) + 1;
            const u1 = Math.floor(Math.random() * 8) + 2;
            const possibleU2 = [];
            for (let i = 1; i <= 9; i++) {
                if (u1 + i >= 10) possibleU2.push(i);
            }
            const u2 = possibleU2[Math.floor(Math.random() * possibleU2.length)];
            n1 = t1 * 10 + u1;
            n2 = t2 * 10 + u2;
            ans = n1 + n2;
        } else {
            op = '-';
            // 三題均為減法
            const t1 = Math.floor(Math.random() * 7) + 3; // 3-9
            const t2 = Math.floor(Math.random() * (t1 - 1)) + 1;
            const u1 = Math.floor(Math.random() * 7);
            const u2 = Math.floor(Math.random() * (9 - u1)) + (u1 + 1);
            n1 = t1 * 10 + u1;
            n2 = t2 * 10 + u2;
            ans = n1 - n2;
        }

        const spots = [];
        const inkDigits = [];
        const n1Str = n1.toString().padStart(2, '0');
        const n2Str = n2.toString().padStart(2, '0');
        
        if (state.operationMode === 'add') {
            // 加法進階版：挖空格隨機或交替
            if (index % 2 === 0) {
                spots.push('n1-units');
                inkDigits.push(n1Str[1]);
                spots.push('n2-tens');
                inkDigits.push(n2Str[0]);
            } else {
                spots.push('n1-tens');
                inkDigits.push(n1Str[0]);
                spots.push('n2-units');
                inkDigits.push(n2Str[1]);
            }
        } else {
            // 減法進階版：
            if (index === 1) {
                // 固定挖空被減數十位 n1-tens (未知) 與減數個位 n2-units
                spots.push('n1-tens');
                inkDigits.push(n1Str[0]);
                spots.push('n2-units');
                inkDigits.push(n2Str[1]);
            } else {
                // 固定挖空被減數個位 n1-units 與減數十位 n2-tens (十位數已知)
                spots.push('n1-units');
                inkDigits.push(n1Str[1]);
                spots.push('n2-tens');
                inkDigits.push(n2Str[0]);
            }
        }

        return { num1: n1, num2: n2, op, ans, spots, inkDigits };
    }
}

function loadProblemIndex(idx) {
    const prob = state.problems[idx];
    state.num1 = prob.num1;
    state.num2 = prob.num2;
    state.op = prob.op;
    state.ans = prob.ans;

    state.requiresCarry = (prob.op === '+' && (prob.num1 % 10) + (prob.num2 % 10) >= 10);
    state.requiresBorrow = (prob.op === '-' && (prob.num1 % 10) < (prob.num2 % 10));

    state.inputs = {};
    state.isCarry = false;
    state.isBorrow = false;

    if (state.op === '-' && state.requiresBorrow) {
        dom.statusBar.textContent = "💡 個位數不夠減！按一下十位數字可以借1個十，換成10個一";
    } else {
        dom.statusBar.textContent = "點擊算式底下的問號開始計算吧！";
    }

    dom.n1Tens.classList.remove('slashed');
    dom.carryBox.classList.add('hide'); // 預設隱藏進位格，直到個位輸入完成
    dom.carryBox.textContent = '?';
    dom.borrowTensBox.classList.add('hide');
    dom.borrowUnitsBox.classList.add('hide');

    const range = state.problemWheelRanges[idx];
    state.wheelsText.forEach((char, wIdx) => {
        const wheel = document.getElementById(`wheel-${wIdx}`);
        wheel.className = 'lock-wheel';
        if (wIdx >= range.start && wIdx <= range.end) {
            wheel.classList.add('active-wheel');
        } else if (state.wheelsSolved[wIdx]) {
            wheel.classList.add('solved-wheel');
        }
    });

    // 處理百位進位對齊控制
    const hasHundreds = state.ans >= 100;
    const hundredsSpacer = document.getElementById('notation-hundreds-spacer');
    if (hasHundreds) {
        if (hundredsSpacer) hundredsSpacer.classList.remove('hide');
    } else {
        if (hundredsSpacer) hundredsSpacer.classList.add('hide');
    }

    if (state.difficulty === 'advanced') {
        setupAdvancedLayout();
    } else {
        const showHelpers = (state.difficulty === 'basic');
        setupStandardLayout(showHelpers);
    }
}

function setupStandardLayout(showHelpers) {
    const n1Str = state.num1.toString().padStart(2, '0');
    const n2Str = state.num2.toString().padStart(2, '0');

    resetCellStyles();

    dom.n1Tens.textContent = n1Str[0];
    dom.n1Units.textContent = n1Str[1];
    dom.n2Tens.textContent = n2Str[0];
    dom.n2Units.textContent = n2Str[1];
    dom.mathOp.textContent = state.op;

    const hasHundreds = state.ans >= 100;
    if (hasHundreds) {
        dom.ansHundreds.classList.remove('hide');
        dom.ansHundreds.textContent = '?';
        dom.ansHundreds.className = 'digit-cell';
        dom.ansHundreds.onclick = () => focusOnCell('ans-hundreds');
        
        dom.n1Hundreds.classList.remove('hide');
        dom.n2Hundreds.classList.remove('hide');
    } else {
        dom.ansHundreds.classList.add('hide');
        dom.n1Hundreds.classList.add('hide');
        dom.n2Hundreds.classList.add('hide');
    }

    // 答案位數控制：如果答案小於 10 (個位數)，不顯示十位答案框，但保持版面對齊
    const hasTens = state.ans >= 10;
    dom.ansTens.textContent = '?';
    dom.ansTens.className = 'digit-cell';
    if (hasTens) {
        dom.ansTens.style.visibility = 'visible';
        dom.ansTens.onclick = () => focusOnCell('ans-tens');
    } else {
        dom.ansTens.style.visibility = 'hidden';
        dom.ansTens.onclick = null;
    }

    dom.ansUnits.textContent = '?';
    dom.ansUnits.className = 'digit-cell';
    dom.ansUnits.onclick = () => focusOnCell('ans-units');

    if (showHelpers && state.op === '-') {
        dom.btnBorrow.classList.remove('hide');
        dom.n1Tens.onclick = () => triggerBorrowFlow();
    } else {
        dom.btnBorrow.classList.add('hide');
    }
    dom.btnCarry.classList.add('hide');

    focusOnCell('ans-units');
}

function setupAdvancedLayout() {
    const n1Str = state.num1.toString().padStart(2, '0');
    const n2Str = state.num2.toString().padStart(2, '0');
    const ansStr = state.ans.toString().padStart(2, '0');

    resetCellStyles();

    const hasHundreds = state.ans >= 100;
    if (hasHundreds) {
        dom.ansHundreds.classList.remove('hide');
        dom.ansHundreds.textContent = ansStr[0];
        dom.n1Hundreds.classList.remove('hide');
        dom.n2Hundreds.classList.remove('hide');
    } else {
        dom.ansHundreds.classList.add('hide');
        dom.n1Hundreds.classList.add('hide');
        dom.n2Hundreds.classList.add('hide');
    }

    dom.n1Tens.textContent = n1Str[0];
    dom.n1Units.textContent = n1Str[1];
    dom.n2Tens.textContent = n2Str[0];
    dom.n2Units.textContent = n2Str[1];
    dom.mathOp.textContent = state.op;

    const hasTens = state.ans >= 10;
    if (hasTens) {
        dom.ansTens.style.visibility = 'visible';
    } else {
        dom.ansTens.style.visibility = 'hidden';
    }

    if (hasHundreds) {
        dom.ansTens.textContent = ansStr[1];
        dom.ansUnits.textContent = ansStr[2];
    } else {
        dom.ansTens.textContent = ansStr[0];
        dom.ansUnits.textContent = ansStr[1];
    }

    // 直接從預先產生的題目中讀取挖空格
    const prob = state.problems[state.solvedCount];
    const spots = prob.spots;

    spots.forEach(id => {
        const cell = document.getElementById(id);
        cell.textContent = '⚫';
        cell.classList.add('ink-spot');
        if (id === 'n1-tens') {
            cell.onclick = () => {
                focusOnCell('n1-tens');
                if (state.op === '-') {
                    triggerBorrowFlow();
                }
            };
        } else {
            cell.onclick = () => focusOnCell(id);
        }
    });

    if (state.op === '-') {
        // 如果十位數不是挖空格，點擊直接借位
        if (!spots.includes('n1-tens')) {
            dom.n1Tens.onclick = () => triggerBorrowFlow();
        }
    }

    // 預設亮燈選取：如果是減法且被減數十位數未知，預設亮燈在十位；否則一律預設從個位開始填
    if (state.op === '-' && spots.includes('n1-tens')) {
        focusOnCell('n1-tens');
        dom.statusBar.textContent = "💡 請點選十位數墨水格進行借位！";
    } else {
        const unitsSpot = spots.find(id => id.endsWith('-units'));
        focusOnCell(unitsSpot || spots[0]);
    }
}

function resetCellStyles() {
    const allCells = [dom.n1Tens, dom.n1Units, dom.n2Tens, dom.n2Units, dom.ansHundreds, dom.ansTens, dom.ansUnits, dom.carryBox];
    allCells.forEach(cell => {
        cell.className = 'digit-cell';
        cell.classList.remove('active-input');
        cell.onclick = null;
        cell.style.visibility = 'visible'; // 確保預設能見度重置
    });
    dom.carryBox.className = 'carry-box hide';
}

function focusOnCell(cellId) {
    const allCells = [dom.n1Tens, dom.n1Units, dom.n2Tens, dom.n2Units, dom.ansHundreds, dom.ansTens, dom.ansUnits, dom.carryBox];
    allCells.forEach(cell => cell.classList.remove('active-input'));

    state.activeCellId = cellId;
    const targetCell = (cellId === 'carry') ? dom.carryBox : document.getElementById(cellId);
    if (targetCell) {
        targetCell.classList.add('active-input');
        
        const labelMap = {
            'ans-units': "個位答案格",
            'ans-tens': "十位答案格",
            'ans-hundreds': "百位答案格",
            'carry': "十位上方『進位框』",
            'n1-units': "被加數的個位數 ⚫",
            'n2-units': "加數的個位數 ⚫",
            'n1-tens': "被加數的十位數 ⚫",
            'n2-tens': "加數的十位數 ⚫"
        };
        dom.stepTip.textContent = `輸入位置：${labelMap[cellId] || '指定欄位'}`;
    }
}

// 減法點選十位數借位
function triggerBorrowFlow() {
    if (state.op !== '-') return;
    
    // 判定被減數十位數是否是未知墨水格且尚未填寫
    const prob = state.problems[state.solvedCount];
    const hasN1TensInk = (state.difficulty === 'advanced' && prob && prob.spots && prob.spots.includes('n1-tens'));
    
    state.isBorrow = true;
    dom.n1Tens.classList.add('slashed');

    if (hasN1TensInk && state.inputs['n1-tens'] === undefined) {
        // 十位未知且未填：顯示個位借到的 10，但十位上方剩餘格先不顯示數字（或顯示空白）
        dom.borrowTensBox.textContent = '';
        dom.borrowTensBox.classList.add('hide'); // 先隱藏十位剩餘格，直到填數
        dom.borrowUnitsBox.classList.remove('hide');
        dom.borrowUnitsBox.textContent = '10';
        dom.statusBar.textContent = "🔑 已從十位借 10 到個位！請先完成個位計算，稍後再填寫十位數喔！";
        sounds.playTone(400, 'triangle', 0.12);
        
        // 按下未知的十位數字借位後，亮燈跳到個位數字
        const unitsSpot = prob.spots.find(id => id.endsWith('-units'));
        if (unitsSpot) {
            focusOnCell(unitsSpot);
        }
        return;
    }

    // 如果十位已經有值或不是墨水格，顯示 tensVal - 1
    let tensVal = 0;
    if (hasN1TensInk && state.inputs['n1-tens'] !== undefined) {
        tensVal = parseInt(state.inputs['n1-tens']);
    } else {
        tensVal = parseInt(state.num1.toString().padStart(2, '0')[0]);
    }

    dom.borrowTensBox.textContent = tensVal - 1;
    dom.borrowTensBox.classList.remove('hide');
    dom.borrowUnitsBox.classList.remove('hide');
    dom.borrowUnitsBox.textContent = '10';
    
    sounds.playTone(400, 'triangle', 0.12);
}

function toggleCarry() {
    state.isCarry = !state.isCarry;
    if (state.isCarry) dom.carryBox.textContent = '1';
    else dom.carryBox.textContent = '?';
}

function toggleBorrow() {
    triggerBorrowFlow();
}

// --- 虛擬與鍵盤按鍵輸入核心（免除每步確定 + 自動跳格）---
function handleVirtualKey(val) {
    if (!state.activeCellId) return;
    
    // 減法防呆
    if (state.difficulty === 'basic' && state.requiresBorrow && !state.isBorrow && state.activeCellId === 'ans-units') {
        dom.statusBar.textContent = "💡 個位數不夠減！按一下十位數字可以借1個十，換成10個一";
        sounds.playWrong();
        return;
    }

    const targetCell = (state.activeCellId === 'carry') ? dom.carryBox : document.getElementById(state.activeCellId);
    
    if (val === 'clear') {
        delete state.inputs[state.activeCellId];
        if (targetCell.classList.contains('ink-spot')) {
            targetCell.textContent = '⚫';
        } else if (state.activeCellId === 'carry') {
            targetCell.textContent = '?';
        } else {
            targetCell.textContent = '?';
        }
        sounds.playTone(300, 'sine', 0.05);
        return;
    }
    
    if (val === 'confirm') {
        // 確認送出 (確認按鈕只在最後送出算式答案)
        sounds.playClick();
        submitAnswer();
        return;
    }

    // 鍵盤輸入防呆
    if (state.activeCellId === 'carry' && val !== '1') {
        dom.statusBar.textContent = "⚠️ 進位框只能輸入 1 喔！";
        sounds.playWrong();
        return;
    }

    // 填入數值
    state.inputs[state.activeCellId] = val;
    targetCell.textContent = val;
    sounds.playTone(450, 'sine', 0.05);

    // 如果是減法且當前輸入被減數十位數，即時更新並觸發借位顯示
    if (state.op === '-' && state.activeCellId === 'n1-tens') {
        triggerBorrowFlow();
    }

    const cellId = state.activeCellId;
    // --- 自動跳格邏輯 ---
    setTimeout(() => {
        if (state.difficulty === 'easy' || state.difficulty === 'basic') {
            if (cellId === 'ans-units') {
                if (state.requiresCarry && state.difficulty === 'basic') {
                    dom.carryBox.classList.remove('hide');
                    dom.carryBox.onclick = () => focusOnCell('carry');
                    
                    focusOnCell('carry');
                    dom.statusBar.textContent = "👉 個位相加滿十了！滿十就要進位";
                } else {
                    focusOnCell('ans-tens');
                }
            } 
            else if (cellId === 'carry') {
                focusOnCell('ans-tens');
            }
            else if (cellId === 'ans-tens') {
                const hasHundreds = state.ans >= 100;
                if (hasHundreds) {
                    focusOnCell('ans-hundreds');
                }
            }
        } 
        else {
            // 進階挖空版自動跳格
            if (cellId === 'carry') {
                // 進位輸入完，自動跳到尚未填寫的十位數挖空墨水格
                const inks = document.querySelectorAll('.ink-spot');
                let nextToFocus = null;
                inks.forEach(cell => {
                    if (cell.id.endsWith('-tens') && state.inputs[cell.id] === undefined) {
                        nextToFocus = cell.id;
                    }
                });
                if (nextToFocus) focusOnCell(nextToFocus);
            } 
            else if (cellId.endsWith('-units')) {
                // 如果是輸入個位數的挖空格
                const u1 = cellId === 'n1-units' ? parseInt(val) : parseInt(state.num1.toString().padStart(2, '0')[1]);
                const u2 = cellId === 'n2-units' ? parseInt(val) : parseInt(state.num2.toString().padStart(2, '0')[1]);
                
                // 判定是有進位的，就立刻出現進位框並聚焦
                if (state.op === '+' && (u1 + u2 >= 10)) {
                    dom.carryBox.classList.remove('hide');
                    dom.carryBox.onclick = () => focusOnCell('carry');
                    focusOnCell('carry');
                    dom.statusBar.textContent = "👉 個位相加滿十了！滿十就要進位";
                } else {
                    // 若無進位，跳到下一個未填墨水格
                    const inks = document.querySelectorAll('.ink-spot');
                    let nextToFocus = null;
                    inks.forEach(cell => {
                        if (cell.id !== cellId && state.inputs[cell.id] === undefined) {
                            nextToFocus = cell.id;
                        }
                    });
                    if (nextToFocus) focusOnCell(nextToFocus);
                }
            } 
            else {
                // 其它挖空格子輸入完，跳到下一個未填墨水格
                const inks = document.querySelectorAll('.ink-spot');
                let nextToFocus = null;
                inks.forEach(cell => {
                    if (cell.id !== cellId && state.inputs[cell.id] === undefined) {
                        nextToFocus = cell.id;
                    }
                });
                if (nextToFocus) {
                    focusOnCell(nextToFocus);
                } else if (state.requiresCarry && state.inputs['carry'] === undefined) {
                    dom.carryBox.classList.remove('hide');
                    dom.carryBox.onclick = () => focusOnCell('carry');
                    focusOnCell('carry');
                    dom.statusBar.textContent = "👉 個位相加滿十了！滿十就要進位";
                }
            }
        }
    }, 150);
}

// --- 答案提交與驗算邏輯 ---
function submitAnswer() {
    state.totalAttempts++;
    let isCorrect = false;

    if (state.difficulty === 'easy' || state.difficulty === 'basic') {
        const hasHundreds = state.ans >= 100;
        const hasTens = state.ans >= 10;
        const hVal = hasHundreds ? state.inputs['ans-hundreds'] : '';
        const tVal = hasTens ? state.inputs['ans-tens'] : '';
        const uVal = state.inputs['ans-units'];
        
        if (uVal === undefined || (hasTens && tVal === undefined) || (hasHundreds && hVal === undefined)) {
            dom.statusBar.textContent = "⚠️ 請把所有問號格填滿再送出！";
            sounds.playWrong();
            return;
        }

        if (state.difficulty === 'basic' && state.requiresCarry && state.inputs['carry'] !== '1') {
            dom.statusBar.textContent = "⚠️ 漏掉了十位數上方的進位格喔！";
            sounds.playWrong();
            focusOnCell('carry');
            return;
        }
        
        const userAns = parseInt((hasHundreds ? hVal : '') + (hasTens ? tVal : '') + uVal);
        isCorrect = (userAns === state.ans);
    } else {
        const inks = document.querySelectorAll('.ink-spot');
        let unFilled = false;
        inks.forEach(cell => {
            if (state.inputs[cell.id] === undefined) unFilled = true;
        });
        if (unFilled) {
            dom.statusBar.textContent = "⚠️ 請填寫所有遮掩的墨水數字！";
            sounds.playWrong();
            return;
        }

        const n1TensStr = state.inputs['n1-tens'] !== undefined ? state.inputs['n1-tens'] : state.num1.toString().padStart(2, '0')[0];
        const n1UnitsStr = state.inputs['n1-units'] !== undefined ? state.inputs['n1-units'] : state.num1.toString().padStart(2, '0')[1];
        
        const n2TensStr = state.inputs['n2-tens'] !== undefined ? state.inputs['n2-tens'] : state.num2.toString().padStart(2, '0')[0];
        const n2UnitsStr = state.inputs['n2-units'] !== undefined ? state.inputs['n2-units'] : state.num2.toString().padStart(2, '0')[1];
        
        const userN1 = parseInt(n1TensStr + n1UnitsStr);
        const userN2 = parseInt(n2TensStr + n2UnitsStr);
        
        isCorrect = (state.op === '+' ? (userN1 + userN2 === state.ans) : (userN1 - userN2 === state.ans));
    }

    if (isCorrect) {
        handleCorrectAnswer();
    } else {
        handleWrongAnswer();
    }
}

function handleCorrectAnswer() {
    sounds.playCorrect();
    state.correctAttempts++;

    const range = state.problemWheelRanges[state.solvedCount];
    let wheelCharIdx = 0;
    
    // 進階版密碼為被墨水遮掩的那兩個數字，其餘版本為答案值
    const prob = state.problems[state.solvedCount];
    const targetStr = (state.difficulty === 'advanced') ? prob.inkDigits.join('') : state.ans.toString();

    for (let wIdx = range.start; wIdx <= range.end; wIdx++) {
        state.wheelsSolved[wIdx] = true;
        const wheel = document.getElementById(`wheel-${wIdx}`);
        if (wheel) {
            wheel.textContent = targetStr[wheelCharIdx];
            wheel.classList.add('solved-wheel');
        }
        wheelCharIdx++;
    }

    state.solvedCount++;
    dom.statusBar.textContent = `🎯 恭喜！成功解開這道密碼直式！`;

    if (state.solvedCount >= 3) {
        setTimeout(handleVictory, 1000);
    } else {
        setTimeout(() => loadProblemIndex(state.solvedCount), 1200);
    }
}

// 答錯時：不扣生命，不跳結束頁，讓學生直接在原題選格子修改後重新提交
function handleWrongAnswer() {
    sounds.playWrong();
    
    // 金庫密碼鎖震動效果
    const vaultDoor = document.querySelector('.vault-lock-ring');
    if (vaultDoor) {
        vaultDoor.classList.add('shake');
        setTimeout(() => vaultDoor.classList.remove('shake'), 400);
    }

    dom.statusBar.innerHTML = `❌ 計算有誤喔！可以<span style="color:#dc2626; font-weight:bold;">點選直式中的格子</span>重新修改，然後再次點「確認」送出！`;
}

function handleVictory() {
    sounds.stopBGM();
    sounds.playVictory();
    
    const mapDiff = {
        'easy': '簡單版 (不進退位)',
        'basic': '基礎版 (進退位加減)',
        'advanced': '進階版 (墨水遮掩挖空)'
    };
    dom.valDiff.textContent = mapDiff[state.difficulty];
    dom.valCorrect.textContent = state.correctAttempts;
    dom.valTotal.textContent = state.totalAttempts;

    dom.vicModal.classList.add('active');
}

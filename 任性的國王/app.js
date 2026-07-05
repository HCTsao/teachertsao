// app.js - 《任性的國王》遊戲邏輯

// ==================== 1. 卡牌與角色資料庫 ====================
const CARD_DB = {
    // 倍數卡
    9:  { id: 9,  type: 'multiplier', mult: 2, display: '2倍卡', img: 'LINE_ALBUM_桌遊改版_260705_9.jpg' },
    10: { id: 10, type: 'multiplier', mult: 3, display: '3倍卡', img: 'LINE_ALBUM_桌遊改版_260705_10.jpg' },
    11: { id: 11, type: 'multiplier', mult: 5, display: '5倍卡', img: 'LINE_ALBUM_桌遊改版_260705_11.jpg' },
    // 數字分數卡
    12: { id: 12, type: 'number', den: 1,  num: 1, display: '1', img: 'LINE_ALBUM_桌遊改版_260705_12.jpg' },
    13: { id: 13, type: 'number', den: 2,  num: 1, display: '1/2', img: 'LINE_ALBUM_桌遊改版_260705_13.jpg' },
    14: { id: 14, type: 'number', den: 3,  num: 1, display: '1/3', img: 'LINE_ALBUM_桌遊改版_260705_14.jpg' },
    15: { id: 15, type: 'number', den: 4,  num: 1, display: '1/4', img: 'LINE_ALBUM_桌遊改版_260705_15.jpg' },
    16: { id: 16, type: 'number', den: 5,  num: 1, display: '1/5', img: 'LINE_ALBUM_桌遊改版_260705_16.jpg' },
    17: { id: 17, type: 'number', den: 6,  num: 1, display: '1/6', img: 'LINE_ALBUM_桌遊改版_260705_17.jpg' },
    // 限制分數卡
    18: { id: 18, type: 'restrict', den: 8,  num: 1, display: '1/8 限制卡', img: 'LINE_ALBUM_桌遊改版_260705_18.jpg' },
    19: { id: 19, type: 'restrict', den: 9,  num: 1, display: '1/9 限制卡', img: 'LINE_ALBUM_桌遊改版_260705_19.jpg' },
    20: { id: 20, type: 'restrict', den: 10, num: 1, display: '1/10 限制卡', img: 'LINE_ALBUM_桌遊改版_260705_20.jpg' },
    21: { id: 21, type: 'restrict', den: 12, num: 1, display: '1/12 限制卡', img: 'LINE_ALBUM_桌遊改版_260705_21.jpg' }
};

const ROLES = {
    1: { id: 1, name: '國王', desc: '當有玩家手牌在3張以下時可立即發動。把棄牌堆平均分配給其他玩家。（餘數不計，放入棄牌堆）', img: 'LINE_ALBUM_桌遊改版_260705_1.jpg' },
    2: { id: 2, name: '皇后', desc: '當國王發完棄牌堆的牌之後可發動。皇后不必拿牌，直接返還棄牌堆。', img: 'LINE_ALBUM_桌遊改版_260705_2.jpg' },
    3: { id: 3, name: '大臣', desc: '有玩家取得出牌權時可發動。玩家全部手牌往右交換一位（順時針）。', img: 'LINE_ALBUM_桌遊改版_260705_3.jpg' },
    4: { id: 4, name: '法師', desc: '有玩家取得出牌權時可發動。選擇1張牌，遞給左邊玩家。', img: 'LINE_ALBUM_桌遊改版_260705_4.jpg' },
    5: { id: 5, name: '小丑', desc: '可以在某一次出牌時依照牌面乘以任意倍數（不需倍數卡，結果不得大於1）。', img: 'LINE_ALBUM_桌遊改版_260705_5.jpg' },
    6: { id: 6, name: '騎士', desc: '有玩家取得出牌權時可發動。強制奪取下一輪的出牌權。', img: 'LINE_ALBUM_桌遊改版_260705_6.jpg' },
    7: { id: 7, name: '幸運星', desc: '任意時機可發動。從棄牌堆任選3張牌加入手牌。如果有衰鬼在場，從手牌選3張遞給衰鬼。', img: 'LINE_ALBUM_桌遊改版_260705_7.jpg' },
    8: { id: 8, name: '衰鬼', desc: '被動技能。當幸運星發動能力時，無條件接收幸運星丟棄的3張牌。', img: 'LINE_ALBUM_桌遊改版_260705_8.jpg' }
};

const CARD_DESC = {
    1: { name: "國王", type: "role", desc: "👑 <b>角色技能：</b><br>當有任何玩家手牌在 3 張（含）以下時可立即發動。<br><br>將棄牌堆平均分配給其他 3 位玩家（餘數不計，放回棄牌堆）。" },
    2: { name: "皇后", type: "role", desc: "👸 <b>角色技能：</b><br>當國王發完棄牌堆的牌之後可發動。<br><br>皇后不必拿牌，直接把發給皇后的牌返還棄牌堆。" },
    3: { name: "大臣", type: "role", desc: "👨‍💼 <b>角色技能：</b><br>有玩家取得出牌權（首出）時可發動。<br><br>所有玩家的全部手牌順時針（往右）交換一位。" },
    4: { name: "法師", type: "role", desc: "🧙 <b>角色技能：</b><br>有玩家取得出牌權（首出）時可發動。<br><br>選擇自己 1 張手牌，遞給左邊的玩家。" },
    5: { name: "小丑", type: "role", desc: "🤡 <b>角色技能：</b><br>自己出牌時可以發動。<br><br>依據打出的牌面乘以任意倍數（不需倍數卡，但乘完之結果不得大於 1）。" },
    6: { name: "騎士", type: "role", desc: "⚔️ <b>角色技能：</b><br>有玩家取得出牌權（首出）時可發動。<br><br>強行奪取下一輪的出牌權，成為下一輪首出玩家。" },
    7: { name: "幸運星", type: "role", desc: "⭐ <b>角色技能：</b><br>任意時機可發動。<br><br>從棄牌堆任選 3 張牌加入手牌。如果有衰鬼在場，從手牌選 3 張遞給衰鬼。" },
    8: { name: "衰鬼", type: "role", desc: "👻 <b>角色技能（被動）：</b><br>當幸運星發動能力時，無條件接收幸運星丟棄的 3 張牌。" },
    9: { name: "2倍卡", type: "multiplier", desc: "【倍數卡】<br>可將同分母分數卡的分子值<b>乘以 2</b>。<br><br><b>限制：</b>乘完之結果不得大於 1。" },
    10: { name: "3倍卡", type: "multiplier", desc: "【倍數卡】<br>可將同分母分數卡的分子值<b>乘以 3</b>。<br><br><b>限制：</b>乘完之結果不得大於 1。" },
    11: { name: "5倍卡", type: "multiplier", desc: "【倍數卡】<br>可將同分母分數卡的分子值<b>乘以 5</b>。<br><br><b>限制：</b>乘完之結果不得大於 1。" },
    12: { name: "1 (分數卡)", type: "fraction", desc: "【分數卡】<br>分數值為 1 的整數分數牌。" },
    13: { name: "1/2 (分數卡)", type: "fraction", desc: "【分數卡】<br>單位分數為 1/2 的分數牌。" },
    14: { name: "1/3 (分數卡)", type: "fraction", desc: "【分數卡】<br>單位分數為 1/3 的分數牌。" },
    15: { name: "1/4 (分數卡)", type: "fraction", desc: "【分數卡】<br>單位分數為 1/4 的分數牌。" },
    16: { name: "1/5 (分數卡)", type: "fraction", desc: "【分數卡】<br>單位分數為 1/5 的分數牌。" },
    17: { name: "1/6 (分數卡)", type: "fraction", desc: "【分數卡】<br>單位分數為 1/6 的分數牌。" },
    18: { name: "1/8 限制卡", type: "restrict", desc: "【限制卡】<br><b>出牌限制：</b>取得出牌權（首出）的玩家，<b>不能單出</b>這張限制卡，除非手中只剩下限制卡而且不重複。" },
    19: { name: "1/9 限制卡", type: "restrict", desc: "【限制卡】<br><b>出牌限制：</b>取得出牌權（首出）的玩家，<b>不能單出</b>這張限制卡，除非手中只剩下限制卡而且不重複。" },
    20: { name: "1/10 限制卡", type: "restrict", desc: "【限制卡】<br><b>出牌限制：</b>取得出牌權（首出）的玩家，<b>不能單出</b>這張限制卡，除非手中只剩下限制卡而且不重複。" },
    21: { name: "1/12 限制卡", type: "restrict", desc: "【限制卡】<br><b>出牌限制：</b>取得出牌權（首出）的玩家，<b>不能單出</b>這張限制卡，除非手中只剩下限制卡而且不重複。" }
};

// ==================== 2. 全域遊戲狀態 ====================
let gameState = {
    players: [
        { id: 0, name: '您', cards: [], role: null, roleRevealed: false, skillUsed: false, isPass: false },
        { id: 1, name: '電腦 樂樂', cards: [], role: null, roleRevealed: false, skillUsed: false, isPass: false },
        { id: 2, name: '電腦 奇奇', cards: [], role: null, roleRevealed: false, skillUsed: false, isPass: false },
        { id: 3, name: '電腦 糖糖', cards: [], role: null, roleRevealed: false, skillUsed: false, isPass: false }
    ],
    deck: [],
    discardPile: [],
    turnOrder: [],       // 玩家出牌順序 [0, 1, 2, 3] 之類的排序
    currentTurnIndex: 0, // 當前是 turnOrder 中的第幾個玩家
    leadPlayerId: null,  // 取得出牌權的玩家 ID
    leadValue: null,     // 當前桌面要求的牌值（如 2/3）
    leadCombination: null, // 當前領先的出牌組合細節
    roundTargetCombination: null, // 本輪首位玩家出的分數組合，用於鎖定目標分數顯示
    roundLeadPlayerId: null,       // 本輪首出玩家 ID，配合 roundTargetCombination 顯示
    selectedCardIds: [],  // 人類玩家選取的卡牌 UID
    jesterSkillActive: false, // 當前出牌是否啟動小丑技能
    jesterMultiplier: 1,      // 小丑技能選取的倍數
    luckyStarSelecting: false, // 幸運星是否正在挑選棄牌
    isSkillPending: null,      // 正在等待發動技能的事件種類 ('lead_won', 'king_active')
    skillPendingPlayerId: null, // 觸發技能事件的玩家 ID
    gameActive: false,
    history: []
};

// 卡牌唯一識別 ID 計數器
let cardUidCounter = 0;

// ==================== 3. 初始化與設定 ====================
document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    setupEvents();
    showDiceModal();
});

// DOM 元素快取
let DOM = {};
function initDOMElements() {
    DOM.btnRules = document.getElementById('btn-rules');
    DOM.btnRestart = document.getElementById('btn-restart');
    DOM.btnPlayCard = document.getElementById('btn-play-card');
    DOM.btnPassTurn = document.getElementById('btn-pass-turn');
    DOM.btnUseSkill = document.getElementById('btn-use-skill');
    DOM.btnStartGame = document.getElementById('btn-start-game');
    
    DOM.modalDice = document.getElementById('modal-dice');
    DOM.modalJester = document.getElementById('modal-jester');
    DOM.modalLucky = document.getElementById('modal-lucky');
    DOM.modalMage = document.getElementById('modal-mage');
    DOM.modalRules = document.getElementById('modal-rules-overlay');
    DOM.modalGameOver = document.getElementById('modal-gameover');
    DOM.myHandList = document.getElementById('my-hand-list');
    DOM.mySelectValue = document.getElementById('my-select-value');
    DOM.mySelectDecimal = document.getElementById('my-select-decimal');
    DOM.myCardCount = document.getElementById('my-card-count');
    
    DOM.currentTargetValue = document.getElementById('current-target-value');
    DOM.currentTargetDesc = document.getElementById('current-target-desc');
    
    DOM.myRoleName = document.getElementById('my-role-name');
    DOM.myRoleSkillDesc = document.getElementById('my-role-skill-desc') || { textContent: "" };
    DOM.roleCardInner = document.getElementById('role-card-inner');
    DOM.myRoleImgFront = document.getElementById('my-role-img-front');
    
    DOM.canvas = document.getElementById('fraction-canvas');
    DOM.ctx = DOM.canvas.getContext('2d');
}

function bindCardMagnifier(element, imgUrl, cardId) {
    if (!element) return;
    element.addEventListener('mouseenter', (e) => {
        const preview = document.getElementById('floating-card-preview');
        const img = document.getElementById('floating-card-img');
        if (!preview || !img) return;
        img.src = imgUrl;
        preview.classList.remove('hidden');
        updateFloatingPreviewPosition(e);

        // 更新卡牌說明書
        const infoContent = document.getElementById('card-info-content');
        if (infoContent && cardId) {
            const info = CARD_DESC[cardId];
            if (info) {
                let badgeClass = "type-fraction";
                let typeText = "分數卡";
                if (info.type === "restrict") { badgeClass = "type-restrict"; typeText = "限制卡"; }
                else if (info.type === "multiplier") { badgeClass = "type-multiplier"; typeText = "倍數卡"; }
                else if (info.type === "role") { badgeClass = "type-role"; typeText = "角色"; }
                
                infoContent.innerHTML = `
                    <div class="card-info-title">${info.name}</div>
                    <span class="card-info-type ${badgeClass}">${typeText}</span>
                    <div>${info.desc}</div>
                `;
            }
        }
    });
    element.addEventListener('mousemove', (e) => {
        updateFloatingPreviewPosition(e);
    });
    element.addEventListener('mouseleave', () => {
        const preview = document.getElementById('floating-card-preview');
        if (preview) {
            preview.classList.add('hidden');
        }
        // 還原卡牌說明書預設提示
        const infoContent = document.getElementById('card-info-content');
        if (infoContent) {
            infoContent.innerHTML = `<div class="card-info-placeholder">請將滑鼠移到卡牌上，這裡會顯示卡牌的詳細說明與規則喔！</div>`;
        }
    });
}

function updateFloatingPreviewPosition(e) {
    const preview = document.getElementById('floating-card-preview');
    if (!preview) return;
    
    // Position the card at the top-right of the mouse
    let x = e.clientX + 20;
    let y = e.clientY - 330;
    
    // Boundary check
    if (x + 220 > window.innerWidth) {
        x = e.clientX - 220; // Show on left
    }
    if (y < 10) {
        y = e.clientY + 20; // Show below
    }
    
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
}

function getVerticalFractionHTML(num, den) {
    if (den === 1) return `<span class="integer-value">${num}</span>`;
    return `
        <div class="fraction-vertical">
            <div class="fraction-numerator">${num}</div>
            <div class="fraction-line"></div>
            <div class="fraction-denominator">${den}</div>
        </div>
    `;
}

function getPlaySpotDetailHTML(combo) {
    if (!combo) return "";
    const fractionHTML = getVerticalFractionHTML(1, combo.den);
    let detail = `${combo.count}張 ${fractionHTML}`;
    if (combo.mult > 1) {
        detail += ` × ${combo.mult}`;
    }
    return detail;
}

function setupEvents() {
    // 規則按鈕
    DOM.btnRules.addEventListener('click', () => DOM.modalRules.classList.remove('hidden'));
    document.getElementById('btn-close-rules').addEventListener('click', () => DOM.modalRules.classList.add('hidden'));
    
    // 重新開始
    DOM.btnRestart.addEventListener('click', () => {
        if(confirm("確定要重新開始遊戲嗎？將會重新洗牌與分配角色！")) {
            location.reload();
        }
    });

    // 揭曉角色 (文字版中已無此 DOM 元素，做安全保護)
    if (DOM.roleCardInner) {
        DOM.roleCardInner.addEventListener('click', () => {
            if (!DOM.roleCardInner.classList.contains('flipped')) {
                DOM.roleCardInner.classList.add('flipped');
                gameState.players[0].roleRevealed = true;
                updateRolePanel();
                addLog('system', `您揭曉了您的角色：【${gameState.players[0].role.name}】！`);
            }
        });
    }

    // 玩家出牌按鈕
    DOM.btnPlayCard.addEventListener('click', () => {
        playerPlaySelectedCards();
    });

    // Pass 按鈕
    DOM.btnPassTurn.addEventListener('click', () => {
        playerPass();
    });

    // 技能按鈕
    DOM.btnUseSkill.addEventListener('click', () => {
        usePlayerSkill();
    });

    // 重新挑戰按鈕
    document.getElementById('btn-replay').addEventListener('click', () => {
        location.reload();
    });
}

// ==================== 4. 擲骰子決定出牌順序 ====================
function showDiceModal() {
    const modal = document.getElementById('modal-dice');
    if (!modal) return;
    modal.classList.remove('hidden');
    
    const btnRoll = document.getElementById('btn-roll-dice');
    btnRoll.onclick = () => {
        rollAllDice();
    };
}

function rollAllDice() {
    const btnRoll = document.getElementById('btn-roll-dice');
    const resultsView = document.getElementById('dice-results-view');
    const announcement = document.getElementById('dice-announcement');
    const startBtn = document.getElementById('btn-dice-start-game');
    
    btnRoll.disabled = true;
    btnRoll.classList.add('btn-disabled');
    resultsView.classList.remove('hidden');
    startBtn.classList.add('hidden');
    announcement.textContent = "正在擲骰子...";
    
    const dieElements = [
        document.getElementById('die-val-0'),
        document.getElementById('die-val-1'),
        document.getElementById('die-val-2'),
        document.getElementById('die-val-3')
    ];
    
    const scoreElements = [
        document.getElementById('die-score-0'),
        document.getElementById('die-score-1'),
        document.getElementById('die-score-2'),
        document.getElementById('die-score-3')
    ];
    
    const diceCards = [
        document.getElementById('dice-card-0'),
        document.getElementById('dice-card-1'),
        document.getElementById('dice-card-2'),
        document.getElementById('dice-card-3')
    ];
    
    // 清空贏家高亮
    diceCards.forEach(card => card.classList.remove('winner'));
    
    // 骰子點數字符對照
    const dieFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    // 啟動滾動動畫
    dieElements.forEach(el => el.classList.add('rolling'));
    
    let rollCount = 0;
    const interval = setInterval(() => {
        for (let i = 0; i < 4; i++) {
            const randomVal = Math.floor(Math.random() * 6);
            dieElements[i].textContent = dieFaces[randomVal];
            scoreElements[i].textContent = `${randomVal + 1} 點`;
        }
        rollCount++;
        if (rollCount > 8) {
            clearInterval(interval);
            
            // 停止動畫，計算最終點數
            dieElements.forEach(el => el.classList.remove('rolling'));
            
            const rolls = [];
            for (let i = 0; i < 4; i++) {
                const val = Math.floor(Math.random() * 6) + 1;
                rolls.push(val);
                dieElements[i].textContent = dieFaces[val - 1];
                scoreElements[i].textContent = `${val} 點`;
            }
            
            // 播放出牌音效作為回饋
            playCardSound();
            
            // 找出最大值
            const maxVal = Math.max(...rolls);
            
            // 檢查是否有最大值平手
            const winners = [];
            rolls.forEach((val, idx) => {
                if (val === maxVal) winners.push(idx);
            });
            
            if (winners.length > 1) {
                // 平手，需要重新擲
                announcement.textContent = `🎲 點數最高者平手 (${maxVal} 點)，請重新擲骰子！`;
                btnRoll.disabled = false;
                btnRoll.classList.remove('btn-disabled');
                btnRoll.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重新擲骰子';
            } else {
                // 單一獲勝者
                const winnerId = winners[0];
                diceCards[winnerId].classList.add('winner');
                
                const winnerName = winnerId === 0 ? "您" : gameState.players[winnerId].name;
                announcement.textContent = `👑 【${winnerName}】投出了最高的 ${maxVal} 點！取得首位出牌權！`;
                
                btnRoll.classList.add('hidden');
                startBtn.classList.remove('hidden');
                startBtn.onclick = () => {
                    const modal = document.getElementById('modal-dice');
                    modal.classList.add('hidden');
                    startGame(winnerId);
                };
            }
        }
    }, 120);
}

// ==================== 5. 遊戲啟動 ====================
function startGame(starterId) {
    gameState.gameActive = true;
    addLog('system', '遊戲開始！正在洗牌並分發角色身分...');
    
    // 1. 初始化牌庫
    createDeck();
    shuffle(gameState.deck);
    
    // 2. 分配角色身分
    assignRoles();
    
    // 3. 發手牌
    dealCards();
    
    // 4. 設定出牌順序 (順時針： 您0 -> 奇奇2 -> 樂樂1 -> 糖糖3 -> 您0)
    setClockwiseTurnOrder(starterId);
    gameState.leadPlayerId = starterId;
    
    // 顯示分配身分彈窗
    const myRole = gameState.players[0].role;
    document.getElementById('reveal-modal-role-img').src = myRole.img;
    document.getElementById('reveal-modal-role-name').textContent = myRole.name;
    document.getElementById('reveal-modal-role-desc').innerHTML = `<b>技能描述：</b>${myRole.desc}`;
    
    const roleRevealModal = document.getElementById('modal-role-reveal');
    roleRevealModal.classList.remove('hidden');
    
    document.getElementById('btn-role-reveal-confirm').onclick = () => {
        roleRevealModal.classList.add('hidden');
        
        addLog('system', `首位出牌玩家為：【${getPlayerName(starterId)}】`);
        
        // 5. 更新 UI
        updateUI();
        drawFractionPreview();
        
        // 6. 若首出玩家是 AI，啟動 AI 思考
        if (starterId !== 0) {
            setTimeout(runAIPlayerTurn, 500);
        } else {
            addLog('system', '您的出牌權，請選擇手牌並出牌！');
        }
    };
}

// 建立牌庫
function createDeck() {
    gameState.deck = [];
    cardUidCounter = 0;

    // 牌庫比例配置
    const distribution = [
        { id: 12, count: 1 }, // 1
        { id: 13, count: 2 }, // 1/2
        { id: 14, count: 3 }, // 1/3
        { id: 15, count: 4 }, // 1/4
        { id: 16, count: 5 }, // 1/5
        { id: 17, count: 6 }, // 1/6
        { id: 18, count: 8 }, // 1/8 (限制卡)
        { id: 19, count: 9 }, // 1/9 (限制卡)
        { id: 20, count: 10 }, // 1/10 (限制卡)
        { id: 21, count: 12 }, // 1/12 (限制卡)
        { id: 9,  count: 2 }, // 2倍卡
        { id: 10, count: 1 }, // 3倍卡
        { id: 11, count: 1 }  // 5倍卡
    ];

    distribution.forEach(item => {
        const cardTemplate = CARD_DB[item.id];
        for (let i = 0; i < item.count; i++) {
            gameState.deck.push({
                uid: ++cardUidCounter,
                ...cardTemplate
            });
        }
    });
}

// 洗牌演算法
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 分配角色
function assignRoles() {
    const roleIds = [1, 2, 3, 4, 5, 6, 7, 8];
    shuffle(roleIds); // 隨機打亂角色 ID

    for (let i = 0; i < 4; i++) {
        gameState.players[i].role = ROLES[roleIds[i]];
        gameState.players[i].roleRevealed = false;
        gameState.players[i].skillUsed = false;
        gameState.players[i].isPass = false;
    }
    
    // 設定主玩家角色圖片 (如果 DOM 存在的話)
    if (DOM.myRoleImgFront) {
        DOM.myRoleImgFront.innerHTML = `<img src="${gameState.players[0].role.img}" alt="${gameState.players[0].role.name}">`;
    }
    if (DOM.roleCardInner) {
        bindCardMagnifier(DOM.roleCardInner, gameState.players[0].role.img, gameState.players[0].role.id);
    }
}

// 發牌
function dealCards() {
    gameState.players.forEach(player => {
        player.cards = [];
        for (let i = 0; i < 16; i++) {
            if (gameState.deck.length > 0) {
                player.cards.push(gameState.deck.pop());
            }
        }
        // 排序手牌：分數分母由小到大，限制卡在後，倍數卡最後
        sortHand(player.cards);
    });
}

function sortHand(cards) {
    cards.sort((a, b) => {
        // 先排類型
        if (a.type !== b.type) {
            const typeWeight = { 'number': 1, 'restrict': 2, 'multiplier': 3 };
            return typeWeight[a.type] - typeWeight[b.type];
        }
        // 同類型排數值
        if (a.type === 'multiplier') {
            return a.mult - b.mult;
        } else {
            return a.den - b.den;
        }
    });
}

// ==================== 6. UI 更新與繪圖 ====================
function updateUI() {
    // 1. 更新手牌
    renderHand();
    
    // 2. 更新 AI 座位手牌數與狀態
    for (let i = 1; i < 4; i++) {
        const player = gameState.players[i];
        document.getElementById(`card-count-${i}`).textContent = player.cards.length;
        
        const revealBadge = document.getElementById(`reveal-role-${i}`);
        if (player.roleRevealed) {
            revealBadge.textContent = `角色: ${getRoleEmoji(player.role.name)} ${player.role.name}`;
            revealBadge.classList.remove('hidden');
        } else {
            revealBadge.textContent = '角色: 未知';
            revealBadge.classList.add('hidden');
        }

        const seat = document.getElementById(`seat-${i}`);
        if (gameState.turnOrder[gameState.currentTurnIndex] === i) {
            seat.classList.add('current-turn');
        } else {
            seat.classList.remove('current-turn');
        }
    }

    // 玩家座位當前輪次亮起
    const mySeat = document.getElementById('seat-0');
    const myRoleBox = document.querySelector('.role-text-box');
    if (gameState.turnOrder[gameState.currentTurnIndex] === 0) {
        if (mySeat) mySeat.classList.add('current-turn');
        if (myRoleBox) myRoleBox.classList.add('current-turn');
    } else {
        if (mySeat) mySeat.classList.remove('current-turn');
        if (myRoleBox) myRoleBox.classList.remove('current-turn');
    }

    // 渲染 Pass 狀態提示標籤
    for (let i = 1; i <= 3; i++) {
        const seat = document.getElementById(`seat-${i}`);
        if (seat) {
            const infoBox = seat.querySelector('.player-info');
            if (infoBox) {
                let passBadge = infoBox.querySelector('.seat-pass-badge');
                if (gameState.players[i].isPass) {
                    if (!passBadge) {
                        passBadge = document.createElement('div');
                        passBadge.className = 'seat-pass-badge';
                        passBadge.textContent = 'Pass';
                        infoBox.appendChild(passBadge);
                    }
                } else {
                    if (passBadge) passBadge.remove();
                }
            }
        }
    }

    if (myRoleBox) {
        let playerPassBadge = myRoleBox.querySelector('.seat-pass-badge');
        if (gameState.players[0].isPass) {
            if (!playerPassBadge) {
                playerPassBadge = document.createElement('div');
                playerPassBadge.className = 'seat-pass-badge';
                playerPassBadge.textContent = 'Pass';
                myRoleBox.appendChild(playerPassBadge);
            }
        } else {
            if (playerPassBadge) playerPassBadge.remove();
        }
    }

    // 3. 更新目標資訊
    if (gameState.leadValue && gameState.roundTargetCombination) {
        const num = gameState.roundTargetCombination.count * gameState.roundTargetCombination.mult;
        const den = gameState.roundTargetCombination.den;
        DOM.currentTargetValue.innerHTML = getVerticalFractionHTML(num, den);
        const firstPlayerName = getPlayerName(gameState.roundLeadPlayerId ?? gameState.leadPlayerId);
        DOM.currentTargetDesc.textContent = `由【${firstPlayerName}】打出`;
    } else {
        DOM.currentTargetValue.innerHTML = '<span class="no-limit">無限制</span>';
        DOM.currentTargetDesc.textContent = `由【${getPlayerName(gameState.leadPlayerId)}】起出，可出任意組合！`;
    }

    // 4. 棄牌堆
    const discardPileView = document.getElementById('discard-pile-view');
    if (gameState.discardPile.length > 0) {
        discardPileView.classList.add('has-cards');
        // 取最上方的卡片圖案做為棄牌堆圖標
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        discardPileView.style.backgroundImage = `url(${topCard.img})`;
        discardPileView.style.backgroundSize = 'cover';
        discardPileView.style.backgroundPosition = 'center';
    } else {
        discardPileView.classList.remove('has-cards');
        discardPileView.style.backgroundImage = 'none';
    }

    // 5. 更新角色面版與按鈕狀態
    updateRolePanel();
    
    // 6. 檢查出牌按鈕可用性
    updatePlayButtonState();
}

function formatFractionText(combo) {
    if (!combo) return "無";
    // 組合文字顯示，例如 "2張 1/3" 或 "1張 1/4 x 2"
    let txt = `${combo.count}張 ${combo.fractions[0].display}`;
    if (combo.mult > 1) {
        txt += ` × ${combo.mult}`;
    }
    // 計算值
    const val = combo.value;
    if (val === 1) return `1 (${txt})`;
    return `${reduceFraction(combo.count * combo.mult, combo.den)} (${txt})`;
}

// 約分輔助
function reduceFraction(num, den) {
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const divisor = gcd(num, den);
    const nNum = num / divisor;
    const nDen = den / divisor;
    if (nDen === 1) return `${nNum}`;
    return `${nNum}/${nDen}`;
}

// 渲染玩家手牌
function renderHand() {
    DOM.myHandList.innerHTML = '';
    const myPlayer = gameState.players[0];
    DOM.myCardCount.textContent = myPlayer.cards.length;

    myPlayer.cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `game-card`;
        if (card.type === 'restrict') cardDiv.classList.add('card-restrict');
        if (card.type === 'multiplier') cardDiv.classList.add('card-multiplier');
        
        cardDiv.dataset.uid = card.uid;
        cardDiv.innerHTML = `<img src="${card.img}" alt="${card.display}">`;

        // 若已被選中，增加選中樣式
        if (gameState.selectedCardIds.includes(card.uid)) {
            cardDiv.classList.add('selected');
        }

        // 卡片點擊事件
        cardDiv.addEventListener('click', () => {
            if (gameState.turnOrder[gameState.currentTurnIndex] !== 0) {
                // 非自己回合
                return;
            }
            toggleCardSelection(card.uid);
        });

        bindCardMagnifier(cardDiv, card.img, card.id);

        DOM.myHandList.appendChild(cardDiv);
    });
}

function getRoleEmoji(roleName) {
    switch (roleName) {
        case '國王': return '👑';
        case '皇后': return '👸';
        case '大臣': return '👨‍💼';
        case '法師': return '🧙';
        case '小丑': return '🤡';
        case '騎士': return '⚔️';
        case '幸運星': return '⭐';
        case '衰鬼': return '👻';
        default: return '👤';
    }
}

// 順時針出牌設定函式 (您 0 -> 奇奇 2 -> 樂樂 1 -> 糖糖 3)
function setClockwiseTurnOrder(starterId) {
    const clockwise = [0, 2, 1, 3];
    const startIdx = clockwise.indexOf(starterId);
    const order = [];
    for (let i = 0; i < 4; i++) {
        order.push(clockwise[(startIdx + i) % 4]);
    }
    gameState.turnOrder = order;
    gameState.currentTurnIndex = 0;
}

// 更新角色面版
function updateRolePanel() {
    const player = gameState.players[0];
    const displayEl = document.getElementById('my-role-text-display');
    if (!displayEl) return;

    const emoji = player.role ? getRoleEmoji(player.role.name) : "👤";
    const roleName = player.role ? player.role.name : "未知";
    const roleDesc = player.role ? player.role.desc : "";

    if (player.skillUsed) {
        displayEl.innerHTML = `${emoji} <span class="role-name-bold">【${roleName}】</span> <span class="role-skill-used">(技能已使用)</span>`;
        DOM.btnUseSkill.textContent = "技能已使用";
        DOM.btnUseSkill.classList.add('btn-disabled');
        DOM.btnUseSkill.disabled = true;
        DOM.btnUseSkill.style.animation = 'none';
    } else {
        displayEl.innerHTML = `${emoji} <span class="role-name-bold">【${roleName}】</span> <span class="role-skill-desc">${roleDesc}</span>`;
        
        // 判斷技能是否可以使用
        let skillCanUse = false;
        if (player.role) {
            const roleId = player.role.id;
            const isMyTurn = (gameState.turnOrder[gameState.currentTurnIndex] === 0);
            
            if (roleId === 1) { // 國王：有人手牌 <= 3張
                const anyoneLowHand = gameState.players.some(p => p.cards.length <= 3);
                skillCanUse = anyoneLowHand && gameState.discardPile.length > 0;
            } else if (roleId === 5) { // 小丑：自己出牌時
                skillCanUse = isMyTurn && !gameState.leadValue; // 首出或要出牌時
                if (gameState.leadValue) {
                    skillCanUse = isMyTurn;
                }
            } else if (roleId === 7) { // 幸運星：任意時機
                skillCanUse = gameState.discardPile.length > 0;
            } else if (roleId === 6) { // 騎士：別人取得出牌權時
                skillCanUse = (gameState.isSkillPending === 'lead_won' && gameState.skillPendingPlayerId !== 0);
            } else if (roleId === 3 || roleId === 4) { // 大臣、法師：有人取得出牌權時
                skillCanUse = (gameState.isSkillPending === 'lead_won');
            } else if (roleId === 2) { // 皇后：被動響應國王發牌
                skillCanUse = (gameState.isSkillPending === 'king_active' && gameState.players[0].roleRevealed);
            }
        }

        if (skillCanUse) {
            DOM.btnUseSkill.classList.remove('btn-disabled');
            DOM.btnUseSkill.disabled = false;
            DOM.btnUseSkill.style.animation = 'pulseGlow 1.5s infinite';
        } else {
            DOM.btnUseSkill.classList.add('btn-disabled');
            DOM.btnUseSkill.disabled = true;
            DOM.btnUseSkill.style.animation = 'none';
        }
        DOM.btnUseSkill.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> 發動技能`;
    }
}

// 繪製圓餅圖預覽
function drawFractionPreview() {
    const ctx = DOM.ctx;
    const width = DOM.canvas.width;
    const height = DOM.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 5;

    // 1. 畫背景圓
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#101525';
    ctx.fill();
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. 獲取選取卡片值
    const selectedCards = getSelectedCards();
    const playInfo = calculatePlayValue(selectedCards);

    if (playInfo && playInfo.value > 0) {
        const val = playInfo.value;
        const den = playInfo.den;
        const totalSlices = den;
        const shadedSlices = playInfo.count * playInfo.mult;

        // 3. 繪製填滿扇形（以金色）
        // 角度 = (shadedSlices / totalSlices) * 2 * Math.PI
        const fillAngle = Math.min(val, 1) * 2 * Math.PI;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        // 從頂部開始繪製 (1.5 * Math.PI)
        ctx.arc(centerX, centerY, radius, 1.5 * Math.PI, 1.5 * Math.PI + fillAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
        ctx.fill();

        // 4. 繪製切割線
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < totalSlices; i++) {
            const angle = 1.5 * Math.PI + (i / totalSlices) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
            ctx.stroke();
        }

        // 5. 更新文字顯示
        const num = playInfo.count * playInfo.mult;
        DOM.mySelectValue.innerHTML = getVerticalFractionHTML(num, den);
        DOM.mySelectDecimal.textContent = `(= ${val.toFixed(2)})`;
        if (val > 1) {
            DOM.mySelectValue.style.color = 'var(--color-danger)';
            DOM.mySelectDecimal.style.color = 'var(--color-danger)';
        } else {
            DOM.mySelectValue.style.color = 'var(--color-gold)';
            DOM.mySelectDecimal.style.color = 'var(--color-muted)';
        }
    } else {
        // 沒有選取或選取無效
        DOM.mySelectValue.innerHTML = "0";
        DOM.mySelectDecimal.textContent = "(0.00)";
        DOM.mySelectValue.style.color = 'var(--color-muted)';
        DOM.mySelectDecimal.style.color = 'var(--color-muted)';
    }
}

// ==================== 7. 出牌驗證與出牌行為 ====================
function toggleCardSelection(uid) {
    const idx = gameState.selectedCardIds.indexOf(uid);
    if (idx === -1) {
        gameState.selectedCardIds.push(uid);
    } else {
        gameState.selectedCardIds.splice(idx, 1);
    }
    
    renderHand();
    drawFractionPreview();
    updatePlayButtonState();
}

function getSelectedCards() {
    const myPlayer = gameState.players[0];
    return myPlayer.cards.filter(c => gameState.selectedCardIds.includes(c.uid));
}

function calculatePlayValue(cards) {
    if (!cards || cards.length === 0) return null;
    
    const fractions = cards.filter(c => c.type === 'number' || c.type === 'restrict');
    const multipliers = cards.filter(c => c.type === 'multiplier');
    
    if (fractions.length === 0) return null;
    
    // 檢查是否所有分數卡都具有相同的分母 (相同單位分數)
    const firstDen = fractions[0].den;
    const sameDen = fractions.every(f => f.den === firstDen);
    if (!sameDen) return null; // 混雜不同分母的分數卡是不合法的
    
    // 倍數卡至多只能有一張
    if (multipliers.length > 1) return null;
    
    let baseValue = fractions.length / firstDen;
    let multiplierVal = multipliers.length > 0 ? multipliers[0].mult : 1;
    
    // 如果小丑技能發動了，乘以小丑選定的倍數
    if (gameState.jesterSkillActive) {
        multiplierVal *= gameState.jesterMultiplier;
    }
    
    const finalValue = baseValue * multiplierVal;
    return {
        value: finalValue,
        fractions: fractions,
        multipliers: multipliers,
        den: firstDen,
        count: fractions.length,
        mult: multiplierVal
    };
}

// 驗證當前出牌是否合法
function validatePlay(cards, isLead = false) {
    if (cards.length === 0) return { valid: false, reason: "請先點選卡牌！" };

    const playInfo = calculatePlayValue(cards);
    if (!playInfo) {
        return { valid: false, reason: "出牌組合不合法：必須出【相同的單位分數】，且至多搭配一張倍數卡！" };
    }

    if (playInfo.value > 1) {
        return { valid: false, reason: "乘積與累加的結果不得大於 1！" };
    }

    // 限制卡出牌驗證
    if (isLead) {
        // 首位出牌限制卡檢驗
        const isSingleRestrict = (playInfo.count === 1 && playInfo.mult === 1 && playInfo.fractions[0].type === 'restrict');
        if (isSingleRestrict) {
            // 檢查手牌是否【只剩下限制卡，且都不重複】
            const myPlayer = gameState.players[0];
            const allRestrictsInHand = myPlayer.cards.every(c => c.type === 'restrict');
            
            // 檢查是否重複
            const dens = myPlayer.cards.map(c => c.den);
            const uniqueDens = new Set(dens);
            const isNoDuplicate = (dens.length === uniqueDens.size);

            if (!(allRestrictsInHand && isNoDuplicate)) {
                return { valid: false, reason: "【限制卡規則】：起手不能單出限制卡，除非手中只剩下限制卡且沒有重複！" };
            }
        }
    } else {
        const epsilon = 0.00001;
        if (Math.abs(playInfo.value - gameState.leadValue) > epsilon) {
            const num = gameState.leadCombination.count * gameState.leadCombination.mult;
            const den = gameState.leadCombination.den;
            return { valid: false, reason: `出牌分數值必須與上一家出的【${num}/${den}】精確等值！` };
        }
    }

    return { valid: true, info: playInfo };
}

function updatePlayButtonState() {
    if (gameState.turnOrder[gameState.currentTurnIndex] !== 0 || !gameState.gameActive) {
        DOM.btnPlayCard.classList.add('btn-disabled');
        DOM.btnPlayCard.disabled = true;
        return;
    }

    const selectedCards = getSelectedCards();
    const isLead = (gameState.leadValue === null);
    const result = validatePlay(selectedCards, isLead);

    if (result.valid) {
        DOM.btnPlayCard.classList.remove('btn-disabled');
        DOM.btnPlayCard.disabled = false;
    } else {
        DOM.btnPlayCard.classList.add('btn-disabled');
        DOM.btnPlayCard.disabled = true;
    }
}

// 玩家出牌
function playerPlaySelectedCards() {
    const selectedCards = getSelectedCards();
    const isLead = (gameState.leadValue === null);
    const check = validatePlay(selectedCards, isLead);

    if (!check.valid) {
        alert(check.reason);
        return;
    }

    const playInfo = check.info;
    
    // 從玩家手牌中扣除
    const myPlayer = gameState.players[0];
    myPlayer.cards = myPlayer.cards.filter(c => !gameState.selectedCardIds.includes(c.uid));
    
    // 將選取卡片送入桌面出牌區與歷史
    playCardsToTable(0, selectedCards, playInfo);
    
    // 清空選取狀態
    gameState.selectedCardIds = [];
    
    // 出牌完，如果是小丑技能則關閉該局狀態
    gameState.jesterSkillActive = false;
    gameState.jesterMultiplier = 1;

    // 檢查獲勝
    if (checkWin(0)) return;

    // 進到下一位
    nextTurn();
}

// 玩家喊 Pass
function playerPass() {
    if (gameState.turnOrder[gameState.currentTurnIndex] !== 0 || !gameState.gameActive) return;
    if (gameState.leadValue === null) {
        alert("您是首出玩家，不能喊 Pass！");
        return;
    }

    gameState.players[0].isPass = true;
    addLog('pass', `您 喊了 Pass。`);
    
    // 渲染桌面
    renderPlayerSpot(0, [], "Pass");
    
    // 清空選取
    gameState.selectedCardIds = [];
    renderHand();
    drawFractionPreview();

    nextTurn();
}

// 渲染玩家出牌點的實體卡片
function playCardsToTable(playerId, cards, comboInfo) {
    // 播放出牌音效
    playCardSound();

    // 1. 渲染出牌點
    renderPlayerSpot(playerId, cards, getPlaySpotDetailHTML(comboInfo));
    
    // 2. 更新當前領先
    // 如果是本輪首出，記錄首位玩家出的分數組合，之後目標顯示以此為主
    if (gameState.leadValue === null) {
        gameState.roundTargetCombination = comboInfo;
        gameState.roundLeadPlayerId = playerId; // 記錄本輪首出玩家
    }
    
    gameState.leadValue = comboInfo.value;
    gameState.leadCombination = comboInfo;
    gameState.leadPlayerId = playerId;

    // 3. 所有出過的牌加入棄牌堆
    cards.forEach(c => {
        gameState.discardPile.push(c);
    });

    const num = comboInfo.count * comboInfo.mult;
    const den = comboInfo.den;
    addLog('play', `【${getPlayerName(playerId)}】 打出了 ${getVerticalFractionHTML(num, den)}`);
}

function renderPlayerSpot(playerId, cards, text) {
    const spot = document.getElementById('center-play-spot');
    if (!spot) return;
    
    if (cards.length > 0) {
        spot.innerHTML = ''; // 僅在有新卡牌出牌時清空舊卡牌面
        
        // 建立出牌組合詳情泡泡，附帶出牌玩家姓名
        const badge = document.createElement('div');
        badge.className = 'play-detail-badge';
        badge.innerHTML = `<span class="badge-player-name">【${getPlayerName(playerId)}】出牌：</span>${text}`;
        spot.appendChild(badge);

        // 建立卡片容器
        const container = document.createElement('div');
        container.className = 'played-cards-container';

        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'played-card';
            cardEl.innerHTML = `<img src="${card.img}" alt="${card.display}">`;
            bindCardMagnifier(cardEl, card.img, card.id);
            container.appendChild(cardEl);
        });
        spot.appendChild(container);
    }
}

// 檢查獲勝條件
function checkWin(playerId) {
    const player = gameState.players[playerId];
    if (player.cards.length === 0) {
        gameState.gameActive = false;
        showGameOver(playerId);
        return true;
    }
    return false;
}

// ==================== 8. 回合與輪流邏輯 ====================
function nextTurn() {
    if (!gameState.gameActive) return;

    // 尋找下一位沒 Pass 的玩家
    let nextIdx = gameState.currentTurnIndex;
    let loopCount = 0;
    
    while (loopCount < 4) {
        nextIdx = (nextIdx + 1) % 4;
        const nextPlayerId = gameState.turnOrder[nextIdx];
        if (!gameState.players[nextPlayerId].isPass && gameState.players[nextPlayerId].cards.length > 0) {
            gameState.currentTurnIndex = nextIdx;
            break;
        }
        loopCount++;
    }

    // 檢查是否有三個人都 Pass (即只剩最後出牌的玩家)
    const activePlayersCount = gameState.players.filter(p => !p.isPass && p.cards.length > 0).length;
    
    if (activePlayersCount <= 1) {
        // 該輪結束，最後出牌者取得出牌權！
        const winnerId = gameState.leadPlayerId;
        setTimeout(() => {
            resolveRoundEnd(winnerId);
        }, 1200);
    } else {
        // 繼續下一家
        updateUI();
        const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
        if (currentPlayerId !== 0) {
            setTimeout(runAIPlayerTurn, 1500);
        }
    }
}

// 結算當前一輪 (Trick End)
function resolveRoundEnd(winnerId) {
    addLog('win', `👑 【${getPlayerName(winnerId)}】 贏得了這一輪，取得出牌權！`);
    
    // 清空桌面出牌點
    const centerSpot = document.getElementById('center-play-spot');
    if (centerSpot) centerSpot.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        gameState.players[i].isPass = false; // 重設 Pass 狀態
    }
    
    gameState.leadValue = null;
    gameState.leadCombination = null;
    gameState.roundTargetCombination = null; // 清空本輪首出組合
    gameState.roundLeadPlayerId = null;
    gameState.leadPlayerId = winnerId;
    
    // 重新排列出牌順序：贏家為第一位
    setClockwiseTurnOrder(winnerId);

    // 觸發「取得出牌權」技能事件點
    triggerSkillPending('lead_won', winnerId);
}

// 觸發技能事件等待
function triggerSkillPending(event, playerId) {
    gameState.isSkillPending = event;
    gameState.skillPendingPlayerId = playerId;
    
    updateUI();

    // 只有當事件為 lead_won 時，才進行反應性技能詢問（騎士強搶、大臣交換、法師送牌）
    if (event === 'lead_won') {
        const myPlayer = gameState.players[0];
        const hasReactionSkill = [3, 4, 6].includes(myPlayer.role.id) && !myPlayer.skillUsed;
        
        // 騎士只能在「別人」贏得牌權時發動強搶
        const canKnightReact = (myPlayer.role.id === 6 && playerId !== 0);
        const canOtherReact = [3, 4].includes(myPlayer.role.id);
        
        if (hasReactionSkill && (canKnightReact || canOtherReact)) {
            const modal = document.getElementById('modal-reaction-prompt');
            const text = document.getElementById('reaction-prompt-text');
            
            let skillName = "";
            let skillEffectText = "";
            if (myPlayer.role.id === 6) {
                skillName = "騎士";
                skillEffectText = `【${getPlayerName(playerId)}】取得了下一輪出牌權。<br><br>您要發動<b>【騎士技能】</b>強行搶奪此輪的出牌權，由您首發出牌嗎？`;
            } else if (myPlayer.role.id === 3) {
                skillName = "大臣";
                skillEffectText = `【${getPlayerName(playerId)}】取得了下一輪出牌權。<br><br>您要發動<b>【大臣技能】</b>將所有玩家手牌順時針（往右）傳遞交換嗎？`;
            } else if (myPlayer.role.id === 4) {
                skillName = "法師";
                skillEffectText = `【${getPlayerName(playerId)}】取得了下一輪出牌權。<br><br>您要發動<b>【法師技能】</b>選擇 1 張手牌遞給左邊玩家嗎？`;
            }
            
            text.innerHTML = skillEffectText;
            modal.classList.remove('hidden');
            
            const btnYes = document.getElementById('btn-reaction-yes');
            const btnNo = document.getElementById('btn-reaction-no');
            
            btnYes.onclick = () => {
                modal.classList.add('hidden');
                usePlayerSkill();
            };
            
            btnNo.onclick = () => {
                modal.classList.add('hidden');
                // 玩家不發動，接下來交給 AI 檢查是否有技能要在此發動
                runAISkillChecks(event, playerId);
            };
            
            return; // 暫停，等待玩家反應選擇
        }
    }

    runAISkillChecks(event, playerId);
}

function runAISkillChecks(event, playerId) {
    let aiTriggered = false;
    for (let i = 1; i < 4; i++) {
        const aiPlayer = gameState.players[i];
        if (!aiPlayer.skillUsed && aiPlayer.cards.length > 0) {
            const roleId = aiPlayer.role.id;
            
            // 1. 騎士強搶牌權：當別人贏得牌權，且該人手牌快完了
            if (roleId === 6 && event === 'lead_won' && playerId !== i && gameState.players[playerId].cards.length <= 4) {
                if (Math.random() < 0.75) {
                    executeAISkill(i);
                    aiTriggered = true;
                    break;
                }
            }
            // 2. 大臣手牌往右傳
            if (roleId === 3 && event === 'lead_won' && (aiPlayer.cards.length >= 7 || gameState.players[playerId].cards.length <= 2)) {
                if (Math.random() < 0.6) {
                    executeAISkill(i);
                    aiTriggered = true;
                    break;
                }
            }
            // 3. 法師遞牌
            if (roleId === 4 && event === 'lead_won') {
                if (Math.random() < 0.5) {
                    executeAISkill(i);
                    aiTriggered = true;
                    break;
                }
            }
        }
    }

    if (!aiTriggered) {
        clearSkillPendingAndProceed();
    }
}

function clearSkillPendingAndProceed() {
    gameState.isSkillPending = null;
    gameState.skillPendingPlayerId = null;
    updateUI();
    
    // 進入新回合首出
    const currentLeadPlayerId = gameState.turnOrder[0];
    if (currentLeadPlayerId !== 0) {
        setTimeout(runAIPlayerTurn, 1000);
    } else {
        addLog('system', '您的出牌權，請出任意牌組合！');
    }
}

// ==================== 9. AI 決策邏輯 ====================
function runAIPlayerTurn() {
    if (!gameState.gameActive) return;

    const aiId = gameState.turnOrder[gameState.currentTurnIndex];
    const aiPlayer = gameState.players[aiId];

    // 檢查是否有國王技能要搶先發動
    // 國王：當有任何對手手牌 <= 3，且棄牌堆大於 3 張
    if (aiPlayer.role.id === 1 && !aiPlayer.skillUsed) {
        const anyoneLowHand = gameState.players.some(p => p.id !== aiId && p.cards.length <= 3);
        if (anyoneLowHand && gameState.discardPile.length >= 4) {
            executeAISkill(aiId);
            return; // 技能會中斷重繪，由技能執行後接續
        }
    }

    // 幸運星隨機發動
    if (aiPlayer.role.id === 7 && !aiPlayer.skillUsed && gameState.discardPile.length >= 6) {
        if (Math.random() < 0.4) {
            executeAISkill(aiId);
            return;
        }
    }

    addLog('system', `【${aiPlayer.name}】 正在思考中...`);

    const isLead = (gameState.leadValue === null);
    let playComb = null;

    if (isLead) {
        // 首出牌決策
        playComb = selectAiLeadPlay(aiPlayer.cards);
    } else {
        // 跟牌決策
        playComb = selectAiFollowPlay(aiPlayer.cards, gameState.leadValue, aiPlayer.role.id === 5 && !aiPlayer.skillUsed);
    }

    if (playComb) {
        // 成功找到出牌組合
        const cardsToPlay = playComb.cards;
        
        // 若使用了小丑技能 (非卡片倍數，而是技能倍數)
        if (playComb.useJesterSkill) {
            aiPlayer.skillUsed = true;
            aiPlayer.roleRevealed = true;
            addLog('skill', `✨ 【${aiPlayer.name}】 揭曉身分！發動【小丑】技能：將牌值乘以 ${playComb.jesterMult} 倍！`);
            gameState.jesterSkillActive = true;
            gameState.jesterMultiplier = playComb.jesterMult;
        }

        // 從手牌中移除
        aiPlayer.cards = aiPlayer.cards.filter(c => !cardsToPlay.some(tc => tc.uid === c.uid));
        
        // 出牌
        playCardsToTable(aiId, cardsToPlay, playComb.info);
        
        // 重設小丑狀態
        gameState.jesterSkillActive = false;
        gameState.jesterMultiplier = 1;

        // 檢查獲勝
        if (checkWin(aiId)) return;

        nextTurn();
    } else {
        // 無牌可出，Pass
        aiPlayer.isPass = true;
        addLog('pass', `【${aiPlayer.name}】 喊了 Pass。`);
        renderPlayerSpot(aiId, [], "Pass");
        nextTurn();
    }
}

// AI 首出選擇
function selectAiLeadPlay(hand) {
    // 找出所有的可出分數組合：
    // 首選：最大的同分母組合，非單張限制卡，或者符合限制卡特例
    const restricts = hand.filter(c => c.type === 'restrict');
    const numbers = hand.filter(c => c.type === 'number');
    const multipliers = hand.filter(c => c.type === 'multiplier');

    // 檢查限制卡特例
    const onlyRestricts = hand.every(c => c.type === 'restrict');
    const uniqueDens = new Set(hand.map(c => c.den));
    const noDupRestricts = (hand.length === uniqueDens.size);
    const canPlaySingleRestrict = onlyRestricts && noDupRestricts;

    // 先試數字卡
    // 依分母分組
    const groups = {};
    numbers.forEach(c => {
        if (!groups[c.den]) groups[c.den] = [];
        groups[c.den].push(c);
    });

    // 找張數最多的那一組
    let bestDen = null;
    let maxCount = 0;
    for (let den in groups) {
        if (groups[den].length > maxCount) {
            maxCount = groups[den].length;
            bestDen = den;
        }
    }

    if (maxCount > 0) {
        // 出這組！如果有一個倍數卡，且乘完 <= 1，AI會順便用
        const cardsToPlay = [...groups[bestDen]];
        // 限制不要超過 1
        while (cardsToPlay.length / bestDen > 1) {
            cardsToPlay.pop();
        }
        
        // 嘗試加倍數卡
        if (multipliers.length > 0) {
            const mult = multipliers[0];
            if ((cardsToPlay.length / bestDen) * mult.mult <= 1) {
                cardsToPlay.push(mult);
            }
        }
        
        const info = calculatePlayValue(cardsToPlay);
        return { cards: cardsToPlay, info: info };
    }

    // 再試限制卡（多張出，這樣不算單出限制卡）
    const restrictGroups = {};
    restricts.forEach(c => {
        if (!restrictGroups[c.den]) restrictGroups[c.den] = [];
        restrictGroups[c.den].push(c);
    });

    for (let den in restrictGroups) {
        if (restrictGroups[den].length >= 2) {
            const cardsToPlay = [...restrictGroups[den]];
            while (cardsToPlay.length / den > 1) {
                cardsToPlay.pop();
            }
            const info = calculatePlayValue(cardsToPlay);
            return { cards: cardsToPlay, info: info };
        }
    }

    // 試單張限制卡（若是特例）
    if (canPlaySingleRestrict && restricts.length > 0) {
        const cardsToPlay = [restricts[0]];
        const info = calculatePlayValue(cardsToPlay);
        return { cards: cardsToPlay, info: info };
    }

    // 實在沒有，若手牌有 1
    const oneCard = hand.find(c => c.den === 1);
    if (oneCard) {
        return { cards: [oneCard], info: calculatePlayValue([oneCard]) };
    }

    // 如果只有單張限制卡，但不是特例，AI 只能隨便出一張了（強行打破規則或者代表 AI 只有這些卡，我們也允許它隨便打出一張，不然會當機）
    if (hand.length > 0) {
        // 隨便找一張非倍數卡出
        const playable = hand.filter(c => c.type !== 'multiplier');
        if (playable.length > 0) {
            return { cards: [playable[0]], info: calculatePlayValue([playable[0]]) };
        }
    }

    return null;
}

// AI 跟牌選擇
function selectAiFollowPlay(hand, targetValue, canJester) {
    const fractions = hand.filter(c => c.type === 'number' || c.type === 'restrict');
    const multipliers = hand.filter(c => c.type === 'multiplier');
    const epsilon = 0.00001;

    // 分組分數卡
    const groups = {};
    fractions.forEach(c => {
        if (!groups[c.den]) groups[c.den] = [];
        groups[c.den].push(c);
    });

    // 1. 先嘗試不使用小丑技能
    // 雙重迴圈：找分母與張數，再搭配倍數卡
    for (let den in groups) {
        const list = groups[den];
        const d = parseInt(den);

        // a. 只用分數卡：N / d = target
        // => N = target * d
        const targetCount = Math.round(targetValue * d);
        if (Math.abs(targetCount / d - targetValue) < epsilon && targetCount <= list.length && targetCount > 0) {
            const cards = list.slice(0, targetCount);
            return { cards: cards, info: calculatePlayValue(cards) };
        }

        // b. 分數卡 + 1張手牌倍數卡： (N / d) * M = target
        // => N * M = target * d
        if (multipliers.length > 0) {
            for (let mCard of multipliers) {
                const M = mCard.mult;
                // N = (target * d) / M
                const targetCountM = Math.round((targetValue * d) / M);
                if (targetCountM > 0 && targetCountM <= list.length) {
                    if (Math.abs((targetCountM / d) * M - targetValue) < epsilon) {
                        const cards = [...list.slice(0, targetCountM), mCard];
                        return { cards: cards, info: calculatePlayValue(cards) };
                    }
                }
            }
        }
    }

    // 2. 嘗試使用小丑技能 (只對 AI 小丑有效)
    if (canJester) {
        for (let den in groups) {
            const list = groups[den];
            const d = parseInt(den);
            
            // 我們可以嘗試各種倍數 (1 到 12)
            for (let jesterMult = 2; jesterMult <= 12; jesterMult++) {
                // (N / d) * jesterMult = target
                // => N = (target * d) / jesterMult
                const targetCountJ = Math.round((targetValue * d) / jesterMult);
                if (targetCountJ > 0 && targetCountJ <= list.length) {
                    if (Math.abs((targetCountJ / d) * jesterMult - targetValue) < epsilon) {
                        const cards = list.slice(0, targetCountJ);
                        // 構建一個模擬的出牌結果
                        const simInfo = {
                            value: (targetCountJ / d) * jesterMult,
                            fractions: cards,
                            multipliers: [],
                            den: d,
                            count: targetCountJ,
                            mult: jesterMult
                        };
                        return {
                            cards: cards,
                            info: simInfo,
                            useJesterSkill: true,
                            jesterMult: jesterMult
                        };
                    }
                }
            }
        }
    }

    return null;
}

// ==================== 10. 角色技能執行與邏輯 ====================

// 彈出身分技能發動對話框 (通用)
function notifySkillActivation(playerId, role, callback) {
    const modal = document.getElementById('modal-skill-notification');
    const playerText = document.getElementById('skill-notif-player');
    const roleText = document.getElementById('skill-notif-role');
    const descText = document.getElementById('skill-notif-desc');
    
    if (!modal || !playerText || !roleText || !descText) {
        if (callback) callback();
        return;
    }
    
    const playerName = playerId === 0 ? "您" : gameState.players[playerId].name;
    playerText.textContent = `⚡ 【${playerName}】 發動了技能！`;
    roleText.innerHTML = `✨ 角色身分：${role.name} ✨`;
    descText.innerHTML = `<b>技能效果：</b><br>${role.desc}`;
    
    modal.classList.remove('hidden');
    
    document.getElementById('btn-skill-notif-confirm').onclick = () => {
        modal.classList.add('hidden');
        if (callback) callback();
    };
}

// 玩家點擊發動技能
function usePlayerSkill() {
    const player = gameState.players[0];
    if (player.skillUsed) return;

    player.roleRevealed = true; // 自動將身分揭曉
    player.skillUsed = true;
    updateUI();

    notifySkillActivation(0, player.role, () => {
        const roleId = player.role.id;
        addLog('skill', `✨ 您發動了【${player.role.name}】的技能！`);

        if (roleId === 1) { // 國王：棄牌堆平分
            executeKingSkill(0);
        } else if (roleId === 2) { // 皇后：響應不拿牌
            executeQueenSkill(0);
        } else if (roleId === 3) { // 大臣：手牌向右交換
            executeMinisterSkill(0);
        } else if (roleId === 4) { // 法師：選 1 張牌遞給左邊
            executeMageSkill(0);
        } else if (roleId === 5) { // 小丑：開啟小丑乘數視窗
            executeJesterSkill();
        } else if (roleId === 6) { // 騎士：搶出牌權
            executeKnightSkill(0);
        } else if (roleId === 7) { // 幸運星：拿 3 張牌
            executeLuckyStarSkill(0);
        }
    });
}

// 執行 AI 的技能
function executeAISkill(aiId) {
    const player = gameState.players[aiId];
    player.roleRevealed = true;
    player.skillUsed = true;
    updateUI();
    
    notifySkillActivation(aiId, player.role, () => {
        addLog('skill', `✨ 【${player.name}】 揭曉身分！發動【${player.role.name}】的技能！`);

        const roleId = player.role.id;
        if (roleId === 1) {
            executeKingSkill(aiId);
        } else if (roleId === 3) {
            executeMinisterSkill(aiId);
        } else if (roleId === 4) {
            executeMageSkill(aiId);
        } else if (roleId === 6) {
            executeKnightSkill(aiId);
        } else if (roleId === 7) {
            executeLuckyStarSkill(aiId);
        }
    });
}

// 技能1：國王技能（平分棄牌堆）
function executeKingSkill(kingPlayerId) {
    const cardsInDiscard = [...gameState.discardPile];
    gameState.discardPile = [];
    
    addLog('system', `國王將棄牌堆的 ${cardsInDiscard.length} 張卡牌分給其他玩家！`);
    
    // 找出「其他玩家」
    const otherPlayers = gameState.players.filter(p => p.id !== kingPlayerId);
    
    // 如果皇后也是其他玩家之一，且技能沒用過，先觸發皇后事件
    const queenPlayer = otherPlayers.find(p => p.role.id === 2 && !p.skillUsed);
    
    // 計算每人分幾張
    const cardsPerPlayer = Math.floor(cardsInDiscard.length / 3);
    const remainderCount = cardsInDiscard.length % 3;
    
    // 餘數放回棄牌堆
    for (let i = 0; i < remainderCount; i++) {
        gameState.discardPile.push(cardsInDiscard.pop());
    }

    // 分配給玩家
    otherPlayers.forEach(p => {
        const playerShare = [];
        for (let i = 0; i < cardsPerPlayer; i++) {
            if (cardsInDiscard.length > 0) {
                playerShare.push(cardsInDiscard.pop());
            }
        }

        // 若是皇后
        if (p.role.id === 2 && !p.skillUsed) {
            if (p.id === 0) {
                // 人類皇后，彈出提示是否要發動技能
                gameState.isSkillPending = 'king_active';
                gameState.pendingQueenCards = playerShare;
                // 更新 UI 讓發動技能按鈕亮起
                updateUI();
                addLog('system', `您（皇后）可以點擊右下角【發動技能】拒絕接收這 ${playerShare.length} 張牌！`);
            } else {
                // AI 皇后，自動發動拒絕
                p.skillUsed = true;
                p.roleRevealed = true;
                addLog('skill', `✨ 【${p.name}】（皇后）拒絕接收卡牌，將牌退回棄牌堆！`);
                playerShare.forEach(c => gameState.discardPile.push(c));
            }
        } else {
            // 普通玩家，直接塞入手中
            p.cards.push(...playerShare);
            sortHand(p.cards);
            addLog('system', `【${p.name}】 接收了 ${playerShare.length} 張卡牌。`);
        }
    });

    // 重新恢復遊戲狀態
    if (gameState.isSkillPending !== 'king_active') {
        gameState.isSkillPending = null;
        resumeAfterSkill();
    }
}

// 技能2：皇后技能（拒絕拿牌）
function executeQueenSkill(queenId) {
    const cards = gameState.pendingQueenCards || [];
    gameState.pendingQueenCards = [];
    
    addLog('skill', `👸 您（皇后）發動技能，成功拒絕收下 ${cards.length} 張牌！牌退回棄牌堆。`);
    
    // 退回棄牌堆
    cards.forEach(c => gameState.discardPile.push(c));
    
    gameState.isSkillPending = null;
    resumeAfterSkill();
}

// 技能3：大臣技能（手牌向右轉）
function executeMinisterSkill(ministerId) {
    addLog('system', `手牌向右位移！所有人把手牌給右邊的玩家。`);
    
    // 手牌備份
    const handBackup = gameState.players.map(p => [...p.cards]);
    
    // 交換 (順時針： 0->1, 1->2, 2->3, 3->0)
    for (let i = 0; i < 4; i++) {
        const nextId = (i + 1) % 4;
        gameState.players[nextId].cards = handBackup[i];
        sortHand(gameState.players[nextId].cards);
    }
    
    // 若玩家選中了牌，清空選中
    gameState.selectedCardIds = [];

    // 位移後繼續
    gameState.isSkillPending = null;
    resumeAfterSkill();
}

// 技能4：法師技能（給左邊一張牌）
function executeMageSkill(mageId) {
    const leftPlayerId = (mageId + 1) % 4;
    
    if (mageId === 0) {
        // 人類法師，彈出選牌視窗
        DOM.modalMage.classList.remove('hidden');
        document.querySelector('#modal-mage h2').textContent = `法師：選擇 1 張手牌遞給左邊玩家`;
        document.querySelector('#modal-mage p').textContent = `請點擊下方手牌中要送給 【${getPlayerName(leftPlayerId)}】 的卡牌：`;
        
        const mageHandList = document.getElementById('mage-hand-list');
        mageHandList.innerHTML = '';
        
        gameState.players[0].cards.forEach(card => {
            const img = document.createElement('div');
            img.className = 'game-card';
            img.innerHTML = `<img src="${card.img}">`;
            bindCardMagnifier(img, card.img, card.id);
            
            img.onclick = () => {
                DOM.modalMage.classList.add('hidden');
                
                // 從手中移除並給左家
                gameState.players[0].cards = gameState.players[0].cards.filter(c => c.uid !== card.uid);
                gameState.players[leftPlayerId].cards.push(card);
                sortHand(gameState.players[leftPlayerId].cards);
                
                addLog('system', `您將 【${card.display}】 送給了 【${getPlayerName(leftPlayerId)}】！`);
                
                gameState.selectedCardIds = [];
                gameState.isSkillPending = null;
                resumeAfterSkill();
            };
            
            mageHandList.appendChild(img);
        });
    } else {
        // AI 法師，智慧選擇最差的一張（限制卡優先，再來是大分母卡）
        const aiMage = gameState.players[mageId];
        if (aiMage.cards.length > 0) {
            // 排序找最差的：限制卡排前面，大分母排前面，倍數卡最後
            const sortedTemp = [...aiMage.cards].sort((a, b) => {
                if (a.type === 'restrict' && b.type !== 'restrict') return -1;
                if (b.type === 'restrict' && a.type !== 'restrict') return 1;
                return b.den - a.den;
            });
            const worstCard = sortedTemp[0];
            
            aiMage.cards = aiMage.cards.filter(c => c.uid !== worstCard.uid);
            gameState.players[leftPlayerId].cards.push(worstCard);
            sortHand(gameState.players[leftPlayerId].cards);
            
            addLog('system', `【${aiMage.name}】 將 1 張牌送給了 【${getPlayerName(leftPlayerId)}】。`);
        }
        
        gameState.isSkillPending = null;
        resumeAfterSkill();
    }
}

// 技能5：小丑技能（任意乘數）
function executeJesterSkill() {
    DOM.modalJester.classList.remove('hidden');
    document.getElementById('jester-error-msg').textContent = '';
    
    document.getElementById('btn-jester-confirm').onclick = () => {
        const mult = parseInt(document.getElementById('jester-multiplier').value);
        if (isNaN(mult) || mult < 1) {
            document.getElementById('jester-error-msg').textContent = '請輸入有效的大於1的倍數！';
            return;
        }

        // 預檢乘完的值是否 <= 1
        const selectedCards = getSelectedCards();
        if (selectedCards.length === 0) {
            document.getElementById('jester-error-msg').textContent = '請先選取分數卡！';
            return;
        }
        
        const fractions = selectedCards.filter(c => c.type === 'number' || c.type === 'restrict');
        if (fractions.length === 0) {
            document.getElementById('jester-error-msg').textContent = '選取卡牌中必須有分數卡！';
            return;
        }

        // 是否同分母
        const den = fractions[0].den;
        const sameDen = fractions.every(f => f.den === den);
        if (!sameDen) {
            document.getElementById('jester-error-msg').textContent = '選取的分數卡必須為同分母！';
            return;
        }

        const valueAfterMult = (fractions.length / den) * mult;
        if (valueAfterMult > 1) {
            document.getElementById('jester-error-msg').textContent = `乘完結果為 ${reduceFraction(fractions.length * mult, den)} (${valueAfterMult.toFixed(2)})，不能大於 1！`;
            return;
        }

        gameState.jesterSkillActive = true;
        gameState.jesterMultiplier = mult;
        
        DOM.modalJester.classList.add('hidden');
        drawFractionPreview();
        updatePlayButtonState();
        
        addLog('system', `小丑技能就緒！當前出牌將乘以 ${mult} 倍！`);
    };

    document.getElementById('btn-jester-cancel').onclick = () => {
        DOM.modalJester.classList.add('hidden');
        gameState.players[0].skillUsed = false; // 恢復未使用
        updateUI();
    };
}

// 技能6：騎士技能（強奪牌權）
function executeKnightSkill(knightId) {
    addLog('system', `騎士搶奪出牌權成功！【${getPlayerName(knightId)}】成為此輪首位出牌者。`);
    
    // 清空桌面
    const centerSpot = document.getElementById('center-play-spot');
    if (centerSpot) centerSpot.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        gameState.players[i].isPass = false;
    }
    
    gameState.leadValue = null;
    gameState.leadCombination = null;
    gameState.roundTargetCombination = null; // 清空本輪首出組合
    gameState.roundLeadPlayerId = null;
    gameState.leadPlayerId = knightId;

    // 重設出牌順序
    setClockwiseTurnOrder(knightId);

    gameState.isSkillPending = null;
    
    // 如果搶完牌權是 AI，啟動 AI 出牌
    if (knightId !== 0) {
        setTimeout(runAIPlayerTurn, 1000);
    } else {
        updateUI();
    }
}

// 技能7：幸運星技能（挑牌）
function executeLuckyStarSkill(luckyId) {
    if (luckyId === 0) {
        // 人類幸運星
        DOM.modalLucky.classList.remove('hidden');
        const listContainer = document.getElementById('lucky-card-list');
        listContainer.innerHTML = '';
        
        const selectedUids = [];
        const maxPick = Math.min(3, gameState.discardPile.length);
        
        document.getElementById('lucky-modal-title').textContent = `幸運星：從棄牌堆挑選 ${maxPick} 張牌`;
        document.getElementById('lucky-modal-desc').textContent = `請點選 ${maxPick} 張卡牌加入手牌：`;

        // 列出棄牌堆中不重複或所有牌
        gameState.discardPile.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'lucky-card-item';
            cardEl.innerHTML = `<img src="${card.img}">`;
            bindCardMagnifier(cardEl, card.img, card.id);
            
            cardEl.onclick = () => {
                const sIdx = selectedUids.indexOf(card.uid);
                if (sIdx === -1) {
                    if (selectedUids.length < maxPick) {
                        selectedUids.push(card.uid);
                        cardEl.classList.add('selected');
                    }
                } else {
                    selectedUids.splice(sIdx, 1);
                    cardEl.classList.remove('selected');
                }

                // 更新確認按鈕
                const btn = document.getElementById('btn-lucky-confirm');
                btn.textContent = `確認選擇 (${selectedUids.length}/${maxPick})`;
                if (selectedUids.length === maxPick) {
                    btn.classList.remove('btn-disabled');
                    btn.disabled = false;
                } else {
                    btn.classList.add('btn-disabled');
                    btn.disabled = true;
                }
            };
            listContainer.appendChild(cardEl);
        });

        document.getElementById('btn-lucky-confirm').onclick = () => {
            DOM.modalLucky.classList.add('hidden');
            
            // 從棄牌堆拿走
            const chosenCards = gameState.discardPile.filter(c => selectedUids.includes(c.uid));
            gameState.discardPile = gameState.discardPile.filter(c => !selectedUids.includes(c.uid));
            
            // 加入手牌
            gameState.players[0].cards.push(...chosenCards);
            sortHand(gameState.players[0].cards);
            
            addLog('system', `您成功挑選了 ${chosenCards.length} 張牌加入手牌。`);

            // 檢查是否有衰鬼在場，有的話必須塞 3 張手牌給他
            const jinxPlayer = gameState.players.find(p => p.role.id === 8);
            if (jinxPlayer) {
                triggerLuckyStarGiveToJinx(jinxPlayer.id);
            } else {
                resumeAfterSkill();
            }
        };
    } else {
        // AI 幸運星
        const aiPlayer = gameState.players[luckyId];
        const maxPick = Math.min(3, gameState.discardPile.length);
        const chosenCards = [];
        
        // AI 智慧隨機選牌
        for (let i = 0; i < maxPick; i++) {
            if (gameState.discardPile.length > 0) {
                // 優先挑好牌（如 1/2, 1/3, 2倍卡）
                const sortedPick = [...gameState.discardPile].sort((a, b) => {
                    if (a.type === 'multiplier' && b.type !== 'multiplier') return -1;
                    return a.den - b.den;
                });
                const pick = sortedPick[0];
                chosenCards.push(pick);
                gameState.discardPile = gameState.discardPile.filter(c => c.uid !== pick.uid);
            }
        }

        aiPlayer.cards.push(...chosenCards);
        sortHand(aiPlayer.cards);
        addLog('system', `【${aiPlayer.name}】 從棄牌堆抽了 ${chosenCards.length} 張牌。`);

        // 檢查是否有衰鬼
        const jinxPlayer = gameState.players.find(p => p.role.id === 8);
        if (jinxPlayer) {
            // AI 丟出 3 張最差的給衰鬼
            const giveCards = [];
            for (let i = 0; i < Math.min(3, aiPlayer.cards.length); i++) {
                // 找最差的
                const worstSorted = [...aiPlayer.cards].sort((a, b) => {
                    if (a.type === 'restrict' && b.type !== 'restrict') return -1;
                    return b.den - a.den;
                });
                const worst = worstSorted[0];
                giveCards.push(worst);
                aiPlayer.cards = aiPlayer.cards.filter(c => c.uid !== worst.uid);
            }
            jinxPlayer.cards.push(...giveCards);
            sortHand(jinxPlayer.cards);
            jinxPlayer.roleRevealed = true; // 揭曉衰鬼

            addLog('skill', `✨ 【${aiPlayer.name}】 把手牌中的 ${giveCards.length} 張牌遞給了衰鬼 【${jinxPlayer.name}】！`);
        }

        resumeAfterSkill();
    }
}

// 幸運星遞給衰鬼
function triggerLuckyStarGiveToJinx(jinxId) {
    DOM.modalMage.classList.remove('hidden');
    document.querySelector('#modal-mage h2').textContent = `幸運星：遞 3 張手牌給 衰鬼 (${getPlayerName(jinxId)})`;
    document.querySelector('#modal-mage p').textContent = `請點選手牌中要送出的 3 張卡牌：`;
    
    const selectList = document.getElementById('mage-hand-list');
    selectList.innerHTML = '';
    
    const selectedUids = [];
    const maxGive = Math.min(3, gameState.players[0].cards.length);
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-game btn-disabled';
    confirmBtn.disabled = true;
    confirmBtn.textContent = `確認送出 (0/${maxGive})`;
    
    gameState.players[0].cards.forEach(card => {
        const img = document.createElement('div');
        img.className = 'game-card';
        img.innerHTML = `<img src="${card.img}">`;
        bindCardMagnifier(img, card.img, card.id);
        
        img.onclick = () => {
            const sIdx = selectedUids.indexOf(card.uid);
            if (sIdx === -1) {
                if (selectedUids.length < maxGive) {
                    selectedUids.push(card.uid);
                    img.classList.add('selected');
                }
            } else {
                selectedUids.splice(sIdx, 1);
                img.classList.remove('selected');
            }

            confirmBtn.textContent = `確認送出 (${selectedUids.length}/${maxGive})`;
            if (selectedUids.length === maxGive) {
                confirmBtn.classList.remove('btn-disabled');
                confirmBtn.disabled = false;
            } else {
                confirmBtn.classList.add('btn-disabled');
                confirmBtn.disabled = true;
            }
        };
        selectList.appendChild(img);
    });

    confirmBtn.onclick = () => {
        DOM.modalMage.classList.add('hidden');
        
        // 移出手牌並加入衰鬼
        const cardsToGive = gameState.players[0].cards.filter(c => selectedUids.includes(c.uid));
        gameState.players[0].cards = gameState.players[0].cards.filter(c => !selectedUids.includes(c.uid));
        
        gameState.players[jinxId].cards.push(...cardsToGive);
        sortHand(gameState.players[jinxId].cards);
        
        // 揭露衰鬼身分
        gameState.players[jinxId].roleRevealed = true;
        
        addLog('skill', `✨ 您把手牌中的 3 張牌送給了衰鬼 【${getPlayerName(jinxId)}】！`);
        
        gameState.selectedCardIds = [];
        resumeAfterSkill();
    };
    
    selectList.appendChild(confirmBtn);
}

// 技能結算完，接續下一家或回合
function resumeAfterSkill() {
    updateUI();
    // 判斷技能發動後由誰接續
    const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
    if (currentPlayerId !== 0) {
        setTimeout(runAIPlayerTurn, 1200);
    }
}

// ==================== 11. 遊戲結束 ====================
function showGameOver(winnerId) {
    DOM.modalGameOver.classList.remove('hidden');
    const rankList = document.getElementById('rank-list');
    rankList.innerHTML = '';
    
    const title = document.getElementById('gameover-title');
    if (winnerId === 0) {
        title.innerHTML = '🏆 恭喜您贏了！';
        title.style.color = 'var(--color-gold)';
    } else {
        title.innerHTML = '💀 AI 贏得了勝利...';
        title.style.color = 'var(--color-danger)';
    }

    document.getElementById('gameover-rank-text').textContent = `排名結果：`;

    // 依手牌數由小到大排序 (0張者為第一名)
    const playersRank = [...gameState.players].sort((a, b) => a.cards.length - b.cards.length);
    
    playersRank.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = `rank-item ${idx === 0 ? 'first' : ''}`;
        
        // 顯示真實身分
        const identity = p.roleRevealed ? p.role.name : `隱藏: ${p.role.name}`;

        item.innerHTML = `
            <span class="rank-pos">#${idx + 1}</span>
            <span class="rank-name">${p.name} <span style="font-size:0.75rem; color:var(--color-gold); font-weight:normal;">(${identity})</span></span>
            <span class="rank-cards">${p.cards.length} 張牌剩餘</span>
        `;
        rankList.appendChild(item);
    });
}

// ==================== 12. 工具與輔助函式 ====================
function getPlayerName(id) {
    if (id === 0) return '您';
    return gameState.players[id].name;
}

function addLog(type, message) {
    // 移除原有日誌，改為無操作
}

// 實作合成出牌音效 (使用 Web Audio API)
function playCardSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.07);
        
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.13);
    } catch (e) {
        console.log("Audio failed to play", e);
    }
}

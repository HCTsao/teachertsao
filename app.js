// ==========================================================================
// 紅旗老師的AI教具 - 資料與控制邏輯 (app.js)
// ==========================================================================

// 教具資料庫
const toolsData = [
    {
        name: "數字貪食蛇",
        category: "一上",
        categories: ["一上", "一下", "二上"],
        path: "一上/數字貪食蛇.html?v=1.3",
        desc: "經典像素風貪食蛇遊戲！吃下指定數字加長身體，在有趣的遊戲中熟練數字序列與大小關係。"
    },
    {
        name: "合十打地鼠",
        category: "一上",
        path: "一上/合十打地鼠.html",
        desc: "趣味十足的打地鼠遊戲，考驗孩子對「合十」的熟練度，只打兩個數字合起來是10的地鼠喔！"
    },
    {
        name: "乘法心臟病",
        category: "二上",
        path: "二上/乘法心臟病.html",
        desc: "刺激的卡牌競賽遊戲，讓學生在緊張好玩的心臟病規則下，快速進行十十乘法的反應力與計算訓練。"
    },
    {
        name: "200以內的聽、說、讀、寫、做",
        category: "二上",
        path: "二上/200以內的聽、說、讀、寫、做.html",
        desc: "結合虛擬錢幣與積木教具的位值操作，搭配語音報讀，帶領孩子熟悉200以內的聽、說、讀、寫、做。"
    },
    {
        name: "幾分之幾",
        category: "三上",
        path: "三上/幾分之幾.html",
        desc: "結合「切蔥油餅」與「分一盒果凍」等生活情境，透過視覺化分割與動態分配，建立分數的概念。"
    },
    {
        name: "除法算式(整除)",
        category: "三上",
        path: "三上/除法算式(整除).html",
        desc: "互動式分裝與平分模擬工具，利用連續減法、乘法輔助等步驟，引導學生具體理解除法算式中被除數、除數與商的意義。"
    },
    {
        name: "除法算式(認識餘數)",
        category: "三上",
        path: "三上/除法算式(認識餘數).html",
        desc: "運用分裝與平分的生活情境，引導學生循序漸進從乘法算式思維，最後寫下完整的有餘數除法算式。"
    },
    {
        name: "帶分數假分數互換(教學)",
        category: "四上",
        path: "四上/帶分數假分數互換(教學).html",
        desc: "透過互動式 Pizza 切切樂（帶分數換假分數）與拼拼樂（假分數換帶分數），在動態操作中直觀理解分數轉換的算式意義。"
    },
    {
        name: "帶分數假分數互換(遊戲)",
        category: "四上",
        path: "四上/帶分數假分數互換(遊戲).html",
        desc: "設有計時挑戰與提示機制的趣味小遊戲，在時間倒數壓力下熟練帶分數與假分數的轉換能力。"
    },
    {
        name: "繪製四邊形",
        category: "四下",
        path: "四下/繪製四邊形.html",
        desc: "互動式幾何釘板，提供正方形、長方形、平行四邊形及梯形的繪製挑戰與自由練習模式，加強幾何性質理解。"
    },
    {
        name: "長方形周長",
        category: "四下",
        path: "四下/長方形周長.html",
        desc: "動態周長公式推導教具，學生可自訂長與寬，並透過動畫演示逐步理解長方形與正方形周長公式的由來。"
    },
    {
        name: "長方形面積",
        category: "四下",
        path: "四下/長方形面積.html",
        desc: "視覺化面積公式推導工具，引導學生從「數單位正方形格子」逐步過渡到「長 × 寬」的面積計算原理。"
    },
    {
        name: "約分擴分",
        category: "五上",
        path: "五上/約分擴分.html",
        desc: "分數等值實驗室，利用圖像化的圓形與長條切割，幫助學生直觀感受分數在等值變換時，其代表的數值大小保持不變。"
    },
    {
        name: "面積公式(平.三.梯)",
        category: "五上",
        path: "五上/面積公式(平.三.梯).html",
        desc: "精美的幾何變形動畫演示，展示「剪下平移」與「複製旋轉」的拼合過程，逐步推導平行四邊形、三角形與梯形的面積公式。"
    },
    {
        name: "分數小數百分率互換",
        category: "五下",
        path: "五下/分數小數百分率互換.html",
        desc: "牌卡配對翻牌遊戲，提供基礎與進階難度，考驗學生在分數、小數與百分率三者之間快速轉換與數值比較的熟練度。"
    },
    {
        name: "正方體與長方體的表面積",
        category: "五下",
        path: "五下/正方體與長方體的表面積.html",
        desc: "3D 立體圖形展開互動教具，學生可旋轉視角、調整展開程度，並在展開圖上點擊標示邊長進行表面積的計算。"
    },
    {
        name: "約分大冒險",
        category: "五下",
        path: "五下/約分大冒險.html",
        desc: "分數乘法約分挑戰，玩家需在限時內點選分子與分母進行約分，找出「最大公因數」即可獲得高分，提升約分靈敏度。"
    },
    {
        name: "被乘數、乘數與積的關係",
        category: "五下",
        path: "五下/被乘數、乘數與積的關係.html",
        desc: "翻牌對對碰遊戲，分為分數與小數模式，考驗學生判斷「乘數大於、等於或小於 1 時，積的變化」。"
    },
    {
        name: "長方體與正方體的體積",
        category: "五下",
        path: "五下/長方體與正方體的體積.html",
        desc: "體積推導實驗室，透過「一排積木、一層積木、整體積木」的循序堆疊動畫，推導出「長 × 寬 × 高」的體積公式。"
    },
    {
        name: "正方體展開圖",
        category: "五下",
        path: "五下/正方體展開圖.html",
        desc: "3D 正方體繪製實驗室，學生在 2D 網格上自由畫出展開圖，系統能即時生成 3D 模型並進行摺疊動畫演示，檢驗是否能拼成正方體。"
    },
    {
        name: "圓周長與直徑的關係",
        category: "六上",
        path: "六上/圓周長與直徑的關係.html",
        desc: "圓周率視覺化教學工具，利用滾動圓形並對照直徑長度，以幾何動態直觀呈現圓周率為什麼大約是3.14倍。"
    },
    {
        name: "圓面積",
        category: "六上",
        path: "六上/圓面積.html",
        desc: "將圓形切割為多個扇形並重新拼合為近似長方形的動畫，直觀演示「半徑 × 半徑 × 圓周率」公式的推導過程。"
    },
    {
        name: "扇形周長(複合圖形)",
        category: "六上",
        path: "六上/扇形周長(複合圖形).html",
        desc: "分步引導教學教具，帶領學生拆解複合幾何圖形的周長，逐步算出弧長與各直邊並合併計算。"
    },
    {
        name: "扇形周長與面積",
        category: "六上",
        path: "六上/扇形周長與面積.html",
        desc: "整合式扇形計算器與出題工具，提供半徑與角度輸入，分步驟引導學生求出扇形占圓的幾分之幾、弧長、周長與面積。"
    },
    {
        name: "扇形面積(複合圖形)",
        category: "六上",
        path: "六上/扇形面積(複合圖形).html",
        desc: "複合圖形面積教學工具，圖解如何透過「大圖減小圖」或「扇形加三角形」等拼貼思維求出複雜區域的面積。"
    },
    {
        name: "放大圖與縮圖",
        category: "六上",
        path: "六上/放大圖與縮圖.html",
        desc: "幾何縮放比例尺互動工具，透過視覺對比引導學生觀察圖形放大或縮小後，對應邊長成比例、對應角度保持不變的特性。"
    },
    {
        name: "牛吃草問題",
        category: "六上",
        path: "六上/牛吃草問題.html",
        desc: "提供草地中央、圍牆邊、牆角及牛舍等多種情境，以動態扇形陰影模擬繩長範圍，並列出對應的算式。"
    },
    {
        name: "約分大冒險：除法篇",
        category: "六上",
        path: "六上/約分大冒險：除法篇.html",
        desc: "關卡式分數除法挑戰，引導學生落實「除號改乘號、除數上下顛倒」的運算規則，並在限時內進行交叉約分戰鬥。"
    },
    {
        name: "解鎖數字密碼",
        category: "六上",
        path: "六上/解鎖數字密碼.html",
        desc: "雙人對戰/單人對抗電腦的策略遊戲，結合質因數分解概念，透過經典數值分解，猜拳奪取先攻權，合作解開數字密碼。"
    },
    {
        name: "質因數分解：最大公因數與最小公倍數",
        category: "六上",
        path: "六上/質因數分解：最大公因數與最小公倍數.html",
        desc: "質因數分解大挑戰，引導學生在並排的質因數分解式中挑選「共同質因數」，從而求出最大公因數與最小公倍數。"
    },
    {
        name: "認識速率",
        category: "六上",
        path: "六上/認識速率.html",
        desc: "提供速率、時間、距離的基礎與進階情境題庫，讓學生在互動題型中熟練｢速率、時間、距離｣三者之間的關係。"
    },
    {
        name: "分數的四則運算(複習五年級基本運算)",
        category: "六下",
        path: "六下/分數的四則運算(複習五年級基本運算).html",
        desc: "在六下分數四則運算教學前的複習活動，整合加減乘除，幫助高年級學生穩固分數運算基礎。"
    },
    {
        name: "小數的四則運算(複習五年級基本運算)",
        category: "六下",
        path: "六下/小數的四則運算(複習五年級基本運算).html",
        desc: "在六下分數四則運算教學前的複習活動，整合加減乘除，幫助高年級學生穩固小數運算基礎。"
    },
    {
        name: "柱體的表面積",
        category: "六下",
        path: "六下/柱體的表面積.html",
        desc: "3D 互動展開模型（等腰/直角三角柱、平行四邊形四角柱、圓柱），分步驟引導計算底面積與側面大長方形面積以求得表面積。"
    },
    {
        name: "柱體的體積",
        category: "六下",
        path: "六下/柱體的體積.html",
        desc: "柱體體積推導實驗室，動態展示斜柱切割平移為長方體的過程，並延伸到三角柱、圓柱，歸納出「底面積 × 柱高」的統一公式。"
    },
    {
        name: "雞兔點點名",
        category: "六下",
        path: "六下/雞兔點點名.html",
        desc: "根據題目給定的動物、腳的總數，決定要把｢雞換兔｣或者｢兔換雞｣，並從中觀察腳的數量變化。"
    },
    {
        name: "雞兔點點名(進階版)",
        category: "六下",
        path: "六下/雞兔點點名(進階版).html",
        desc: "雞兔問題邏輯挑戰版，學生需從「全雞」或「全兔」的配置出發，預測並用最少次數的替換操作來達成目標的腳的數量。"
    },
    {
        name: "雞兔問題(生活情境)",
        category: "六下",
        path: "六下/雞兔問題(生活情境).html",
        desc: "結合便當、纜車、文具、存錢筒等多種真實生活情境，以互動式五步驟（如假設法）帶領學生掌握怎樣解題的邏輯。"
    },
    {
        name: "數學神兵-正負大對決",
        category: "七上",
        path: "七上/數學神兵-正負大對決/index.html",
        desc: "國中七年級整數四則運算對戰遊戲，心算答題召喚飛彈雷射對決！"
    },
    {
        name: "數線移動探險-整數的加減法",
        category: "七上",
        path: "七上/數線移動探險/index.html",
        desc: "在數線上操作棋子跳躍！透過設定出發點與移動方向，實體化理解正負數加減運算。"
    }
];

// DOM 元素選取
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterTabsContainer = document.getElementById('filter-tabs');
const toolsGrid = document.getElementById('tools-grid');
const toolsCountBadge = document.getElementById('tools-count');
const currentCategoryTitleText = document.getElementById('current-category-title');

// 全域狀態
let currentCategory = 'all';
let searchQuery = '';

// 初始化應用程式
function init() {
    // 嘗試從 sessionStorage 還原先前選擇的分類
    const savedCategory = sessionStorage.getItem('selectedCategory');
    if (savedCategory) {
        currentCategory = savedCategory;
        // 更新按鈕的 active 樣式
        document.querySelectorAll('.filter-btn').forEach(b => {
            if (b.dataset.category === currentCategory) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        // 更新標題文字
        if (currentCategory === 'all') {
            currentCategoryTitleText.textContent = '所有教具';
        } else {
            currentCategoryTitleText.textContent = `${currentCategory} 教具`;
        }
    }

    renderTools();
    setupEventListeners();
}

// 渲染教具卡片
function renderTools() {
    // 清空網格
    toolsGrid.innerHTML = '';

    // 篩選資料
    const filteredTools = toolsData.filter(tool => {
        const matchesCategory = currentCategory === 'all' || 
                                tool.category === currentCategory ||
                                (tool.categories && tool.categories.includes(currentCategory));
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              tool.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (tool.categories && tool.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase())));
        return matchesCategory && matchesSearch;
    });

    // 更新數量標誌
    toolsCountBadge.textContent = `${filteredTools.length} 個項目`;

    // 處理空白分類的「敬請期待」卡片
    if (filteredTools.length === 0) {
        // 如果是空白分類，顯示敬請期待
        const hasToolsForCategory = toolsData.some(t => 
            t.category === currentCategory || 
            (t.categories && t.categories.includes(currentCategory))
        );
        const isBlankCategory = ['一下', '二下', '三下'].includes(currentCategory) || (currentCategory !== 'all' && !hasToolsForCategory);
        
        if (isBlankCategory && searchQuery === '') {
            toolsGrid.appendChild(createComingSoonCard(currentCategory));
        } else {
            // 搜尋無結果的狀態
            toolsGrid.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <i class="fa-solid fa-magnifying-glass-blur" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.6;"></i>
                    <p style="font-size: 1.1rem; font-weight: 500;">找不到與「${searchQuery}」相關的教具</p>
                    <p style="font-size: 0.9rem; margin-top: 0.3rem;">請嘗試換個關鍵字搜尋看看！</p>
                </div>
            `;
        }
        return;
    }

    // 建立並插入教具卡片
    filteredTools.forEach(tool => {
        const card = document.createElement('a');
        card.href = tool.path;
        card.className = 'tool-card';
        
        let badgesHTML = '';
        if (tool.categories && tool.categories.length > 0) {
            badgesHTML = tool.categories.map(cat => `<span class="badge-grade" data-grade="${cat}">${cat}</span>`).join(' ');
        } else {
            badgesHTML = `<span class="badge-grade" data-grade="${tool.category}">${tool.category}</span>`;
        }

        card.innerHTML = `
            <div class="card-top">
                <div class="card-meta">
                    ${badgesHTML}
                </div>
                <h3>${tool.name}</h3>
                <p class="card-desc">${tool.desc}</p>
            </div>
            <div class="card-bottom">
                <span class="btn-open"><i class="fa-solid fa-play"></i> 開始學習</span>
            </div>
        `;
        
        toolsGrid.appendChild(card);
    });
}

// 建立「敬請期待」卡片
function createComingSoonCard(category) {
    const card = document.createElement('div');
    card.className = 'tool-card coming-soon';
    card.innerHTML = `
        <i class="fa-solid fa-hourglass-start coming-soon-icon"></i>
        <h4 class="coming-soon-title">${category} 教具設計中</h4>
        <p class="card-desc" style="margin-top: 0.5rem;">紅旗老師正在持續開發本學期的 AI 互動教具，敬請期待！</p>
    `;
    return card;
}

// 設定事件監聽器
function setupEventListeners() {
    // 1. 搜尋輸入監聽
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            
            // 顯示或隱藏清除按鈕
            if (clearSearchBtn) {
                if (searchQuery.length > 0) {
                    clearSearchBtn.style.display = 'flex';
                } else {
                    clearSearchBtn.style.display = 'none';
                }
            }
            
            renderTools();
        });
    }

    // 2. 清除搜尋按鈕
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchQuery = '';
                clearSearchBtn.style.display = 'none';
                searchInput.focus();
            }
            renderTools();
        });
    }

    // 3. 分類按鈕點擊監聽 (利用事件代理)
    filterTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        // 切換 active 樣式
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 更新分類狀態
        currentCategory = btn.dataset.category;
        
        // 儲存目前分類至 sessionStorage，以便返回時維持選擇狀態
        sessionStorage.setItem('selectedCategory', currentCategory);
        
        // 更新標題文字
        if (currentCategory === 'all') {
            currentCategoryTitleText.textContent = '所有教具';
        } else {
            currentCategoryTitleText.textContent = `${currentCategory} 教具`;
        }

        renderTools();
    });
}

// 啟動應用
document.addEventListener('DOMContentLoaded', init);

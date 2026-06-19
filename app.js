// ==========================================================================
// 紅旗老師的AI教具 - 資料與控制邏輯 (app.js)
// ==========================================================================

// 教具資料庫
const toolsData = [
    // 二上
    {
        name: "乘法心臟病",
        category: "二上",
        path: "二上/乘法心臟病.html",
        desc: "考驗九九乘法反應力的趣味卡牌遊戲，在遊戲中熟練乘法口訣。"
    },
    // 三上
    {
        name: "幾分之幾",
        category: "三上",
        path: "三上/幾分之幾.html",
        desc: "認識分數的基本概念，透過視覺圖形直觀理解「幾分之幾」的意義。"
    },
    {
        name: "除法算式(整除)",
        category: "三上",
        path: "三上/除法算式(整除).html",
        desc: "學習被除數、除數與商的關係，掌握基礎整除概念與除法直式。"
    },
    {
        name: "除法算式(認識餘數)",
        category: "三上",
        path: "三上/除法算式(認識餘數).html",
        desc: "探索除法中的餘數，理解餘數的意義並學會「餘數必須小於除數」的規則。"
    },
    // 四上
    {
        name: "帶分數假分數互換(教學)",
        category: "四上",
        path: "四上/帶分數假分數互換(教學).html",
        desc: "互動式圖像教學，直觀掌握帶分數與假分數之間的互換邏輯。"
    },
    {
        name: "帶分數假分數互換(遊戲)",
        category: "四上",
        path: "四上/帶分數假分數互換(遊戲).html",
        desc: "緊張刺激的限時互換挑戰，快速提升帶分數與假分數轉換的熟練度。"
    },
    // 四下
    {
        name: "繪製四邊形",
        category: "四下",
        path: "四下/繪製四邊形.html",
        desc: "在數位圖板上自由繪製並探究平行四邊形、梯形、菱形等幾何特徵。"
    },
    {
        name: "長方形周長",
        category: "四下",
        path: "四下/長方形周長.html",
        desc: "動態探索長方形周長計算公式，並進行互動觀念測驗。"
    },
    {
        name: "長方形面積",
        category: "四下",
        path: "四下/長方形面積.html",
        desc: "利用方格點與面積單位拼湊，直觀理解並推導長方形面積公式。"
    },
    // 五上
    {
        name: "約分擴分",
        category: "五上",
        path: "五上/約分擴分.html",
        desc: "視覺化展示等值分數，輕鬆學習約分與擴分的基本技巧與原理。"
    },
    {
        name: "面積公式(平.三.梯)",
        category: "五上",
        path: "五上/面積公式(平.三.梯).html",
        desc: "互動推導平行四邊形、三角形與梯形的面積公式，強化幾何觀念。"
    },
    // 五下
    {
        name: "分數小數百分率互換",
        category: "五下",
        path: "五下/分數小數百分率互換.html",
        desc: "理解與熟練分數、小數、百分率之間的相互轉換與大小比較。"
    },
    {
        name: "正方體與長方體的表面積",
        category: "五下",
        path: "五下/正方體與長方體的表面積.html",
        desc: "透過 3D 展開圖與立體視角，探索並計算正方體與長方體的表面積。"
    },
    {
        name: "約分大冒險",
        category: "五下",
        path: "五下/約分大冒險.html",
        desc: "好玩的闖關約分小遊戲，在冒險中快速提升最簡分數化簡能力。"
    },
    {
        name: "被乘數、乘數與積的關係",
        category: "五下",
        path: "五下/被乘數、乘數與積的關係.html",
        desc: "動態觀察當乘數大於、等於或小於 1 時，積與被乘數之間的變化關係。"
    },
    {
        name: "長方體與正方體的體積",
        category: "五下",
        path: "五下/長方體與正方體的體積.html",
        desc: "利用 1 立方公分積木堆疊動畫，推導並理解長方體與正方體的體積公式。"
    },
    // 六上
    {
        name: "圓周長與直徑的關係",
        category: "六上",
        path: "六上/圓周長與直徑的關係.html",
        desc: "動態滾動測量圓周與直徑，自主探索與理解圓周率 (π) 的由來。"
    },
    {
        name: "圓面積",
        category: "六上",
        path: "六上/圓面積.html",
        desc: "將圓切割成無限多等分拼成近似長方形，直觀推導圓面積公式。"
    },
    {
        name: "扇形周長(複合圖形)",
        category: "六上",
        path: "六上/扇形周長(複合圖形).html",
        desc: "挑戰複合圖形中含有弧長與半徑的邊界周長計算，訓練圖形拆解能力。"
    },
    {
        name: "扇形周長與面積",
        category: "六上",
        path: "六上/扇形周長與面積.html",
        desc: "依據圓心角比例，學習計算扇形的弧長、周長與面積公式。"
    },
    {
        name: "扇形面積(複合圖形)",
        category: "六上",
        path: "六上/扇形面積(複合圖形).html",
        desc: "進階圖形測驗：計算多種重疊、陰影或中空扇形複合圖形的面積。"
    },
    {
        name: "放大圖與縮圖",
        category: "六上",
        path: "六上/放大圖與縮圖.html",
        desc: "探討圖形按比例放大或縮小後，其對應角不變、對應邊成比例的性質。"
    },
    {
        name: "牛吃草問題",
        category: "六上",
        path: "六上/牛吃草問題.html",
        desc: "解析經典數學題型：結合草生長速度與牛吃草速率的消去法邏輯問題。"
    },
    {
        name: "約分大冒險：除法篇",
        category: "六上",
        path: "六上/約分大冒險：除法篇.html",
        desc: "約分冒險進階版：學習利用除法與因數分解關係化簡大型分數。"
    },
    {
        name: "解鎖數字密碼",
        category: "六上",
        path: "六上/解鎖數字密碼.html",
        desc: "依據給定條件進行邏輯排除與推理，解鎖隱藏的數字密碼箱。"
    },
    {
        name: "質因數分解：最大公因數與最小公倍數",
        category: "六上",
        path: "六上/質因數分解：最大公因數與最小公倍數.html",
        desc: "運用短除法與質因數分解，求取兩個或多個數的最大公因數與最小公倍數。"
    },
    // 六下
    {
        name: "分數的四則運算(複習五年級基本運算)",
        category: "六下",
        path: "六下/分數的四則運算(複習五年級基本運算).html",
        desc: "綜合複習異分母分數的加、減、乘、除與括號混合四則運算。"
    },
    {
        name: "小數的四則運算(複習五年級基本運算)",
        category: "六下",
        path: "六下/小數的四則運算(複習五年級基本運算).html",
        desc: "熟練小數乘除法直式計算法則、小數位數的處理與估算練習。"
    },
    {
        name: "柱體的表面積",
        category: "六下",
        path: "六下/柱體的表面積.html",
        desc: "展開各類角柱與圓柱，計算底面積與側面積之和以求得表面積。"
    },
    {
        name: "柱體的體積",
        category: "六下",
        path: "六下/柱體的體積.html",
        desc: "理解柱體「底面積 × 高」的體積核心公式，練習計算角柱與圓柱體積。"
    },
    {
        name: "雞兔點點名",
        category: "六下",
        path: "六下/雞兔點點名.html",
        desc: "運用經典「雞兔同籠」邏輯，學習假設法、表格法與列式解題思維。"
    }
];

// DOM 元素選取
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterTabsContainer = document.getElementById('filter-tabs');
const toolsGrid = document.getElementById('tools-grid');
const toolsCountBadge = document.getElementById('tools-count');
const currentCategoryTitleText = document.getElementById('current-category-title');

const toolViewer = document.getElementById('tool-viewer');
const toolIframe = document.getElementById('tool-iframe');
const closeViewerBtn = document.getElementById('close-viewer-btn');
const viewerToolCategory = document.getElementById('viewer-tool-category');
const viewerToolTitle = document.getElementById('viewer-tool-title');
const newTabBtn = document.getElementById('new-tab-btn');

// 全域狀態
let currentCategory = 'all';
let searchQuery = '';
let activeViewingTool = null;

// 初始化應用程式
function init() {
    renderTools();
    setupEventListeners();
    setupHistoryStateListener();
    
    // 監聽視窗大小改變，自動調整教具縮放比例
    window.addEventListener('resize', () => {
        if (activeViewingTool) {
            adjustIframeScale();
        }
    });
}

// 渲染教具卡片
function renderTools() {
    // 清空網格
    toolsGrid.innerHTML = '';

    // 篩選資料
    const filteredTools = toolsData.filter(tool => {
        const matchesCategory = currentCategory === 'all' || tool.category === currentCategory;
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              tool.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // 更新數量標誌
    toolsCountBadge.textContent = `${filteredTools.length} 個項目`;

    // 處理空白分類的「敬請期待」卡片
    if (filteredTools.length === 0) {
        // 如果是空白分類，顯示敬請期待
        const isBlankCategory = ['二下', '三下'].includes(currentCategory) || (currentCategory !== 'all' && toolsData.filter(t => t.category === currentCategory).length === 0);
        
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
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.innerHTML = `
            <div class="card-top">
                <div class="card-meta">
                    <span class="badge-grade" data-grade="${tool.category}">${tool.category}</span>
                </div>
                <h3>${tool.name}</h3>
                <p class="card-desc">${tool.desc}</p>
            </div>
            <div class="card-bottom">
                <button class="btn-open"><i class="fa-solid fa-play"></i> 開始學習</button>
            </div>
        `;
        
        // 點擊卡片開啟教具
        card.addEventListener('click', () => openTool(tool));
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
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        
        // 顯示或隱藏清除按鈕
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        renderTools();
    });

    // 2. 清除搜尋按鈕
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderTools();
    });

    // 3. 分類按鈕點擊監聽 (利用事件代理)
    filterTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        // 切換 active 樣式
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 更新分類狀態
        currentCategory = btn.dataset.category;
        
        // 更新標題文字
        if (currentCategory === 'all') {
            currentCategoryTitleText.textContent = '所有教具';
        } else {
            currentCategoryTitleText.textContent = `${currentCategory} 教具`;
        }

        renderTools();
    });

    // 4. 關閉檢視器按鈕
    closeViewerBtn.addEventListener('click', () => {
        // 利用瀏覽器 history.back() 返回，這會觸發 popstate 事件進而關閉檢視器
        if (window.history.state && window.history.state.viewing) {
            window.history.back();
        } else {
            closeTool(false); // 備份防呆
        }
    });

    // 5. 在新分頁開啟按鈕
    newTabBtn.addEventListener('click', () => {
        if (activeViewingTool) {
            window.open(activeViewingTool.path, '_blank');
        }
    });
}

// 開啟教具
function openTool(tool) {
    activeViewingTool = tool;
    viewerToolCategory.textContent = tool.category;
    viewerToolTitle.textContent = tool.name;
    
    // 重設 iframe 樣式，防止載入時閃爍
    toolIframe.style.transform = 'translate(-50%, -50%) scale(0)';
    toolIframe.src = tool.path;
    toolViewer.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 防止主頁面捲動

    // 延遲執行縮放以確保容器寬高已正確渲染
    setTimeout(adjustIframeScale, 50);

    // 推送狀態到瀏覽器歷史紀錄，使得「回上一頁」按鈕可關閉 iframe
    window.history.pushState({ viewing: true, toolName: tool.name }, '');
}

// 關閉教具
// pushState: 是否要執行 history 變更（若是因為 popstate 觸發的，就傳入 false）
function closeTool(updateHistory = true) {
    toolViewer.style.display = 'none';
    toolIframe.src = '';
    toolIframe.style.transform = '';
    document.body.style.overflow = ''; // 恢復主頁面捲動
    activeViewingTool = null;
}

// 自適應縮放 iframe 以防跑版
function adjustIframeScale() {
    if (!activeViewingTool) return;

    const container = document.querySelector('.iframe-container');
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 定義標準設計尺寸 (桌上型電腦寬高)
    const targetWidth = 1024;
    const targetHeight = 700;

    let scale = 1;

    // 如果容器寬高小於設計尺寸，則按比例縮小
    if (containerWidth < targetWidth || containerHeight < targetHeight) {
        const widthRatio = containerWidth / targetWidth;
        const heightRatio = containerHeight / targetHeight;
        scale = Math.min(widthRatio, heightRatio);
    }

    // 設定 iframe 物理大小與 transform 置中縮放
    toolIframe.style.width = `${targetWidth}px`;
    toolIframe.style.height = `${targetHeight}px`;
    toolIframe.style.position = 'absolute';
    toolIframe.style.left = '50%';
    toolIframe.style.top = '50%';
    toolIframe.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// 監聽瀏覽器上一頁/下一頁 (popstate)
function setupHistoryStateListener() {
    window.addEventListener('popstate', (event) => {
        // 如果歷史狀態中沒有 viewing，或者 viewing 為 false，則關閉檢視器
        if (!event.state || !event.state.viewing) {
            closeTool(false);
        } else if (event.state && event.state.viewing) {
            // 如果使用者從其他地方直接回到 viewing 狀態，則重新開啟該教具
            const tool = toolsData.find(t => t.name === event.state.toolName);
            if (tool) {
                activeViewingTool = tool;
                viewerToolCategory.textContent = tool.category;
                viewerToolTitle.textContent = tool.name;
                toolIframe.src = tool.path;
                toolViewer.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                setTimeout(adjustIframeScale, 50);
            }
        }
    });
}

// 啟動應用
document.addEventListener('DOMContentLoaded', init);

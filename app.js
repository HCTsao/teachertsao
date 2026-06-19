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
    {
        name: "正方體展開圖",
        category: "五下",
        path: "五下/正方體展開圖.html",
        desc: "動態演示正方體的 11 種展開圖形，幫助建立空間立體幾何概念。"
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
    {
        name: "認識速率",
        category: "六上",
        path: "六上/認識速率.html",
        desc: "學習速率、時間與距離的相互關係，透過情境模擬加深理解。"
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
    },
    {
        name: "雞兔點點名(進階版)",
        category: "六下",
        path: "六下/雞兔點點名(進階版).html",
        desc: "雞兔同籠問題進階挑戰：更多變的假設法與方程式關係練習。"
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
        const card = document.createElement('a');
        card.href = tool.path;
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

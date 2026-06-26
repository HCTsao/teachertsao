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
        desc: ""
    },
    {
        name: "200以內的聽、說、讀、寫、做",
        category: "二上",
        path: "二上/200以內的聽、說、讀、寫、做.html",
        desc: ""
    },
    // 三上
    {
        name: "幾分之幾",
        category: "三上",
        path: "三上/幾分之幾.html",
        desc: ""
    },
    {
        name: "除法算式(整除)",
        category: "三上",
        path: "三上/除法算式(整除).html",
        desc: ""
    },
    {
        name: "除法算式(認識餘數)",
        category: "三上",
        path: "三上/除法算式(認識餘數).html",
        desc: ""
    },
    // 四上
    {
        name: "帶分數假分數互換(教學)",
        category: "四上",
        path: "四上/帶分數假分數互換(教學).html",
        desc: ""
    },
    {
        name: "帶分數假分數互換(遊戲)",
        category: "四上",
        path: "四上/帶分數假分數互換(遊戲).html",
        desc: ""
    },
    // 四下
    {
        name: "繪製四邊形",
        category: "四下",
        path: "四下/繪製四邊形.html",
        desc: ""
    },
    {
        name: "長方形周長",
        category: "四下",
        path: "四下/長方形周長.html",
        desc: ""
    },
    {
        name: "長方形面積",
        category: "四下",
        path: "四下/長方形面積.html",
        desc: ""
    },
    // 五上
    {
        name: "約分擴分",
        category: "五上",
        path: "五上/約分擴分.html",
        desc: ""
    },
    {
        name: "面積公式(平.三.梯)",
        category: "五上",
        path: "五上/面積公式(平.三.梯).html",
        desc: ""
    },
    // 五下
    {
        name: "分數小數百分率互換",
        category: "五下",
        path: "五下/分數小數百分率互換.html",
        desc: ""
    },
    {
        name: "正方體與長方體的表面積",
        category: "五下",
        path: "五下/正方體與長方體的表面積.html",
        desc: ""
    },
    {
        name: "約分大冒險",
        category: "五下",
        path: "五下/約分大冒險.html",
        desc: ""
    },
    {
        name: "被乘數、乘數與積的關係",
        category: "五下",
        path: "五下/被乘數、乘數與積的關係.html",
        desc: ""
    },
    {
        name: "長方體與正方體的體積",
        category: "五下",
        path: "五下/長方體與正方體的體積.html",
        desc: ""
    },
    {
        name: "正方體展開圖",
        category: "五下",
        path: "五下/正方體展開圖.html",
        desc: ""
    },
    // 六上
    {
        name: "圓周長與直徑的關係",
        category: "六上",
        path: "六上/圓周長與直徑的關係.html",
        desc: ""
    },
    {
        name: "圓面積",
        category: "六上",
        path: "六上/圓面積.html",
        desc: ""
    },
    {
        name: "扇形周長(複合圖形)",
        category: "六上",
        path: "六上/扇形周長(複合圖形).html",
        desc: ""
    },
    {
        name: "扇形周長與面積",
        category: "六上",
        path: "六上/扇形周長與面積.html",
        desc: ""
    },
    {
        name: "扇形面積(複合圖形)",
        category: "六上",
        path: "六上/扇形面積(複合圖形).html",
        desc: ""
    },
    {
        name: "放大圖與縮圖",
        category: "六上",
        path: "六上/放大圖與縮圖.html",
        desc: ""
    },
    {
        name: "牛吃草問題",
        category: "六上",
        path: "六上/牛吃草問題.html",
        desc: ""
    },
    {
        name: "約分大冒險：除法篇",
        category: "六上",
        path: "六上/約分大冒險：除法篇.html",
        desc: ""
    },
    {
        name: "解鎖數字密碼",
        category: "六上",
        path: "六上/解鎖數字密碼.html",
        desc: ""
    },
    {
        name: "質因數分解：最大公因數與最小公倍數",
        category: "六上",
        path: "六上/質因數分解：最大公因數與最小公倍數.html",
        desc: ""
    },
    {
        name: "認識速率",
        category: "六上",
        path: "六上/認識速率.html",
        desc: ""
    },
    // 六下
    {
        name: "分數的四則運算(複習五年級基本運算)",
        category: "六下",
        path: "六下/分數的四則運算(複習五年級基本運算).html",
        desc: ""
    },
    {
        name: "小數的四則運算(複習五年級基本運算)",
        category: "六下",
        path: "六下/小數的四則運算(複習五年級基本運算).html",
        desc: ""
    },
    {
        name: "柱體的表面積",
        category: "六下",
        path: "六下/柱體的表面積.html",
        desc: ""
    },
    {
        name: "柱體的體積",
        category: "六下",
        path: "六下/柱體的體積.html",
        desc: ""
    },
    {
        name: "雞兔點點名",
        category: "六下",
        path: "六下/雞兔點點名.html",
        desc: ""
    },
    {
        name: "雞兔點點名(進階版)",
        category: "六下",
        path: "六下/雞兔點點名(進階版).html",
        desc: ""
    },
    {
        name: "雞兔問題(生活情境)",
        category: "六下",
        path: "六下/雞兔問題(生活情境).html",
        desc: ""
    },
    // 七上
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

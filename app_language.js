// ==========================================================================
// 紅旗老師的AI教具 - 資料與控制邏輯 (app.js)
// ==========================================================================

// 教具資料庫
const toolsData = [
    {
        name: "造句救星",
        category: "六下",
        path: "造句救星/造句救星.html",
        desc: "康軒六下第一課：五星級造句法，事實、想像、感受寫作鷹架訓練！",
        type: "評量"
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
    if (savedCategory && filterTabsContainer) {
        currentCategory = savedCategory;
        // 更新按鈕的 active 樣式
        filterTabsContainer.querySelectorAll('.filter-btn').forEach(b => {
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

// 動態獲取教具圖示
function getToolIcon(name, type) {
    // 遊戲類與具體主題（高優先級）
    if (name.includes("蛇")) return "fa-solid fa-worm";
    if (name.includes("地鼠")) return "fa-solid fa-hammer";
    if (name.includes("心臟病")) return "fa-solid fa-heart-pulse";
    if (name.includes("小精靈")) return "fa-solid fa-ghost";
    if (name.includes("運動會")) return "fa-solid fa-person-running";
    if (name.includes("鵲橋")) return "fa-solid fa-bridge";
    if (name.includes("釣魚大師")) return "fa-solid fa-fish";
    if (name.includes("分數披薩店")) return "fa-solid fa-trophy";
    if (name.includes("大冒險") && !name.includes("除法")) return "fa-solid fa-compass";
    if (name.includes("密碼")) return "fa-solid fa-key";
    if (name.includes("神兵")) return "fa-solid fa-wand-magic-sparkles";
    if (name.includes("牛吃草")) return "fa-solid fa-cow";
    if (name.includes("雞兔點點名") && !name.includes("進階")) return "fa-solid fa-egg";
    if (name.includes("雞兔點點名") && name.includes("進階")) return "fa-solid fa-crown";
    if (name.includes("雞兔問題")) return "fa-solid fa-house-chimney";
    
    // 特定關鍵字與複合圖形（必須在基礎幾何前）
    if (name.includes("面積公式")) return "fa-solid fa-shapes";
    if (name.includes("表面積")) return "fa-solid fa-cube";
    if (name.includes("體積")) return "fa-solid fa-cubes";
    if (name.includes("展開圖")) return "fa-solid fa-box-open";
    if (name.includes("周長") && name.includes("複合")) return "fa-solid fa-chart-pie";
    if (name.includes("面積") && name.includes("複合")) return "fa-solid fa-layer-group";
    
    // 基礎圖形與測量
    if (name.includes("四邊形")) return "fa-solid fa-draw-polygon";
    if (name.includes("周長")) return "fa-solid fa-ruler-combined";
    if (name.includes("直徑")) return "fa-solid fa-circle-notch";
    if (name.includes("圓面積")) return "fa-solid fa-circle";
    if (name.includes("面積")) return "fa-solid fa-border-all";
    
    // 運算與概念
    if (name.includes("聽、說、讀、寫、做")) return "fa-solid fa-coins";
    if (name.includes("幾分之幾")) return "fa-solid fa-pizza-slice";
    if (name.includes("百分率")) return "fa-solid fa-percent";
    if (name.includes("互換")) return "fa-solid fa-arrow-right-arrow-left";
    if (name.includes("最大公因數")) return "fa-solid fa-sitemap";
    if (name.includes("除法算式")) return "fa-solid fa-divide";
    if (name.includes("除法篇")) return "fa-solid fa-shield-halved";
    if (name.includes("整除")) return "fa-solid fa-divide";
    if (name.includes("餘數")) return "fa-solid fa-calculator";
    if (name.includes("積的關係")) return "fa-solid fa-chart-line";
    if (name.includes("放大")) return "fa-solid fa-magnifying-glass-plus";
    if (name.includes("速率")) return "fa-solid fa-gauge-high";
    if (name.includes("四則")) return "fa-solid fa-calculator";
    if (name.includes("數線")) return "fa-solid fa-route";

    // 預設
    if (type === "遊戲") return "fa-solid fa-gamepad";
    if (type === "評量") return "fa-solid fa-pen-to-square";
    return "fa-solid fa-book-open";
}

// 根據教具名稱雜湊生成柔和的莫蘭迪粉彩背景色
function getToolColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 40%, 93%)`;
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
                              (tool.type && tool.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
        if (tool.type) {
            badgesHTML += ` <span class="badge-type" data-type="${tool.type}">${tool.type}</span>`;
        }

        const iconClass = getToolIcon(tool.name, tool.type);
        const cardBgColor = getToolColor(tool.name);

        card.innerHTML = `
            <div class="card-header-visual" style="background-color: ${cardBgColor};">
                <i class="${iconClass}"></i>
            </div>
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
        filterTabsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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

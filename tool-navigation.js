// 只有提供獨立主選單的教具，才設定 menu 與 isAtMenu。
(() => {
    'use strict';
    const config = window.toolNavigationConfig;
    if (!config || document.getElementById('tool-navigation')) return;
    const scriptUrl = document.currentScript.src;
    const style = document.createElement('style');
    style.textContent = `
        #tool-navigation { position:fixed; top:max(12px,env(safe-area-inset-top)); left:max(12px,env(safe-area-inset-left)); z-index:2147483000; display:flex; flex-direction:column; align-items:flex-start; gap:8px; pointer-events:none; }
        #tool-navigation.tool-navigation-menu-only { top:calc(max(12px,env(safe-area-inset-top)) + 48px); }
        #tool-navigation > a, #tool-navigation > button { box-sizing:border-box; display:flex; align-items:center; justify-content:center; width:auto; min-height:38px; margin:0; padding:8px 14px; border:1px solid rgba(255,255,255,.25); border-radius:20px; background:rgba(30,41,59,.95); color:#fff; font:700 14px/1.4 system-ui,-apple-system,sans-serif; text-decoration:none; white-space:nowrap; cursor:pointer; box-shadow:0 3px 10px rgba(0,0,0,.2); pointer-events:auto; }
        #tool-navigation > :hover { background:#4338ca; }
        #tool-navigation > :focus-visible { outline:3px solid #fbbf24; outline-offset:3px; }
        #tool-navigation > [hidden] { display:none !important; }
    `;
    document.head.appendChild(style);
    const nav = document.createElement('nav');
    nav.id = 'tool-navigation';
    nav.setAttribute('aria-label', '教具導覽');
    if (config.addHome) {
        const home = document.createElement('a');
        home.href = new URL('index.html', scriptUrl).href;
        home.textContent = '🏠 回首頁';
        nav.appendChild(home);
    } else {
        nav.className = 'tool-navigation-menu-only';
    }
    // 位值教具的模式遮罩層高於原本的首頁連結，讓入口在遮罩上也能使用。
    if (config.homeSelector) {
        const home = document.querySelector(config.homeSelector);
        if (home) home.style.zIndex = '2147483000';
    }
    if (config.menu && config.isAtMenu) {
        const menu = document.createElement('button');
        menu.type = 'button';
        menu.textContent = '📋 回主選單';
        const update = () => {
            const hidden = Boolean(config.isAtMenu());
            if (menu.hidden !== hidden) menu.hidden = hidden;
        };
        menu.addEventListener('click', () => {
            if (config.isAtMenu()) return;
            if (!window.confirm('確定要回主選單嗎？目前這一局的進度將不會保留。')) return;
            config.menu();
            update();
        });
        nav.appendChild(menu);
        update();
        // 原程式切換畫面後同步顯隱，不改動各教具既有的開始流程。
        new MutationObserver(update).observe(document.body, {
            subtree: true, childList: true, attributes: true,
            attributeFilter: ['class', 'style']
        });
    }
    document.body.appendChild(nav);
})();

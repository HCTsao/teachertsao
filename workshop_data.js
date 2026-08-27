/**
 * 3小時教師研習簡報預設資料庫與 LocalStorage 管理模組
 * 包含完整的研習大綱、教具選型建議、Gemini Prompt 與時間配比表
 */

const STORAGE_KEY = 'gemini_math_workshop_slides_v1';

const DEFAULT_WORKSHOP_DATA = {
  meta: {
    title: "Gemini 融入國小數學教學與互動教具實作",
    subtitle: "3 小時教師專業成長研習綱要與實作指南",
    author: "紅旗老師 / 數位教具專家",
    duration: 180, // 分鐘
    version: "1.0.0"
  },
  slides: [
    {
      id: "slide-1",
      section: "研習封面",
      title: "Gemini 融入國小數學教學與互動教具實作",
      subtitle: "3 小時 (180分鐘) 教師專業成長研習",
      type: "cover",
      content: `
        <div class="hero-card">
          <div class="hero-badge">接地氣 ‧ 好上手 ‧ 當場帶回家</div>
          <p class="hero-desc">
            針對現場教師設計的直覺式研習流程：<br>
            <strong>「先看優秀範例體驗效益」</strong> &rarr; 
            <strong>「理解教學設計思維」</strong> &rarr; 
            <strong>「現場手把手用 Gemini 做出成品」</strong>
          </p>
          <div class="tag-group">
            <span class="tag">💡 範例體驗</span>
            <span class="tag">🧠 設計思維</span>
            <span class="tag">🚀 Gemini 實作</span>
          </div>
        </div>
      `,
      notes: "開場說明：歡迎各位老師參加！今天我們不講繁雜的程式理論，而是帶領大家用 AI 開啟教學創意的全新可能。"
    },
    {
      id: "slide-2",
      section: "研習架構",
      title: "研習架構規劃 (3節課 / 共180分鐘)",
      subtitle: "循序漸進的帶得走學習旅程",
      type: "roadmap",
      content: `
        <div class="roadmap-grid">
          <div class="roadmap-card step-1">
            <div class="step-num">第 1 節</div>
            <div class="step-title">範例體驗與三類教具拆解</div>
            <div class="step-time">⏱️ 60 mins</div>
            <div class="step-desc">看得見、玩得到！親身體驗教學、評量、遊戲三類數位教具的亮點。</div>
          </div>
          <div class="roadmap-card step-2">
            <div class="step-num">第 2 節</div>
            <div class="step-title">AI 融合教學的設計思維</div>
            <div class="step-time">⏱️ 60 mins</div>
            <div class="step-desc">知道為什麼這樣教！解構 AI 如何輔助概念視覺化與差異化診斷。</div>
          </div>
          <div class="roadmap-card step-3">
            <div class="step-num">第 3 節</div>
            <div class="step-title">Gemini 手把手生成實作</div>
            <div class="step-time">⏱️ 60 mins</div>
            <div class="step-desc">當場做出一款帶回家！運用單一 HTML 萬用提示詞，現場產出教具。</div>
          </div>
        </div>
      `,
      notes: "重點提示：說明這三節課的設計脈絡，讓學員知道最後一節課能親手帶回專屬教具。"
    },
    {
      id: "slide-3",
      section: "第 1 節：教具選型",
      title: "一、 數位教具選型建議 (教學 / 評量 / 遊戲)",
      subtitle: "選擇視覺化直觀、概念明確的國小數學主題",
      type: "cards",
      content: `
        <div class="tool-categories">
          <div class="tool-card instructional">
            <div class="card-badge">教學類 Instructional</div>
            <h3>幾何展開圖 / 扇形與圓心角拖曳器</h3>
            <ul>
              <li><strong>突破抽象思維：</strong>動態拖曳讓學員看見「過程」而非結果。</li>
              <li><strong>解決教學痛點：</strong>傳統黑板難以呈現動態旋轉與展開。</li>
            </ul>
          </div>
          <div class="tool-card assessment">
            <div class="card-badge">評量類 Assessment</div>
            <h3>幾何特徵分類 / 分數等值診斷測驗</h3>
            <ul>
              <li><strong>即時反饋與迷思診斷：</strong>答錯時給予引導式提示而非僅給對錯。</li>
              <li><strong>差異化教學：</strong>學生可依自己的節奏進行自主檢測。</li>
            </ul>
          </div>
          <div class="tool-card gamified">
            <div class="card-badge">遊戲類 Gamified</div>
            <h3>四則運算速算闖關 / 分數對對碰</h3>
            <ul>
              <li><strong>提升練習動機：</strong>將枯燥的重複練習轉化為關卡挑戰。</li>
              <li><strong>即時獎勵機制：</strong>搭配計時器與視覺動畫，增強學習成就感。</li>
            </ul>
          </div>
        </div>
      `,
      notes: "展示說明：向學員分析這三種不同類型的教具適用場景與教學優勢。"
    },
    {
      id: "slide-4",
      section: "第 1 節：體驗設計",
      title: "現場分享小心機：雙重視角體驗法",
      subtitle: "先當學生動手玩，再當教師解構動機",
      type: "highlight",
      content: `
        <div class="tip-box">
          <div class="tip-header">
            <span class="tip-icon">💡</span>
            <h3>現場分享小心機 (講師演練策略)</h3>
          </div>
          <p class="tip-body">
            展示時可以先讓老師們扮演<strong>「學生」</strong>上台操作或用手機/平板連線操作，體驗：
          </p>
          <div class="perspective-grid">
            <div class="perspective-card student">
              <h4>🎓 學生視角 (1st Step)</h4>
              <p>體驗「學生在看到這個畫面時會產生什麼數學思考」與驚喜感。</p>
            </div>
            <div class="perspective-card teacher">
              <h4>👩‍🏫 教師視角 (2nd Step)</h4>
              <p>切回教師角度解構設計動機、核心概念連結與引導問題。</p>
            </div>
          </div>
        </div>
      `,
      notes: "互動提示：邀請 1-2 位老師現場上台以學生身份操作範例，帶動研習氣氛。"
    },
    {
      id: "slide-5",
      section: "第 2 節：設計思維",
      title: "二、 AI 融合教學的設計思維",
      subtitle: "從「傳統靜態教學」走向「動態互動與即時診斷」",
      type: "features",
      content: `
        <div class="grid-2x2">
          <div class="feature-card">
            <div class="feat-icon">👁️</div>
            <h4>直觀視覺化</h4>
            <p>將抽象的數學符號（如通分、立態展開）轉化為動態圖解，降低認知負荷。</p>
          </div>
          <div class="feature-card">
            <div class="feat-icon">🎯</div>
            <h4>迷思診斷與層次提示</h4>
            <p>當學生答錯時，不只是顯示 ❌，而是提供階段性思考提示與圖解引導。</p>
          </div>
          <div class="feature-card">
            <div class="feat-icon">⚡</div>
            <h4>零門檻單一 HTML 部署</h4>
            <p>不需複雜後端或付費平台，生成一個 <code>.html</code> 檔案即可在任何瀏覽器開啟。</p>
          </div>
          <div class="feature-card">
            <div class="feat-icon">🔄</div>
            <h4>即時動態微調 (Iteration)</h4>
            <p>根據課堂學生反應，隨時透過對話請 Gemini 調整難易度或新增功能。</p>
          </div>
        </div>
      `,
      notes: "概念講解：說明為什麼單一 HTML 檔是最適合基層教師推廣的數位教具載體。"
    },
    {
      id: "slide-6",
      section: "第 3 節：Gemini 實作",
      title: "三、 Gemini 零基礎實作：萬用提示詞 4 大要素",
      subtitle: "掌握核心結構，AI 就能精準產出可用教具",
      type: "steps",
      content: `
        <div class="elements-grid">
          <div class="element-card">
            <div class="elem-num">1</div>
            <h4>角色 (Role)</h4>
            <p>指定 AI 為「國小數學互動教具專家」</p>
          </div>
          <div class="element-card">
            <div class="elem-num">2</div>
            <h4>對象與主題 (Topic)</h4>
            <p>明確年級與單元（例如：高年級圓面積與扇形、五年級分數加減）</p>
          </div>
          <div class="element-card">
            <div class="elem-num">3</div>
            <h4>互動機制 (Interactions)</h4>
            <p>具體說明需要的元件（拉桿、按鈕、拖曳區、計時器、動畫）</p>
          </div>
          <div class="element-card">
            <div class="elem-num">4</div>
            <h4>輸出格式 (Output Format)</h4>
            <p>要求打包在<strong>「單一 HTML 檔案」</strong>（含 CSS & JS）</p>
          </div>
        </div>
      `,
      notes: "實作引導 Step 1：向老師們解析萬用提示詞公式，降低大家對 AI 提示詞的恐懼。"
    },
    {
      id: "slide-7",
      section: "第 3 節：Prompt 範本",
      title: "實作範例：分數加減法視覺化教具 Prompt",
      subtitle: "可直接複製貼入 Gemini 進行生成",
      type: "prompt",
      promptText: `你是一位國小數學互動教具專家。請幫我用 HTML/CSS/JavaScript 撰寫一個適用於【國小五年級】的【分數加減法視覺化】互動教具。

功能需求：
1. 上方有兩個輸入框，讓學生輸入兩個異分母分數。
2. 下方用『長方形面積切割』的方式，視覺化呈現通分的過程。
3. 提供一個『顯示答案』按鈕與『清除重來』按鈕。
4. 整體版面要適合國小學生，色彩鮮明、字體要大。
5. 請將所有程式碼打包在單一 HTML 檔案中，方便我下載使用。`,
      content: `
        <div class="prompt-container">
          <div class="prompt-header">
            <span>📋 萬用提示詞範本（學員複製用）</span>
            <button class="btn-copy" onclick="copyPromptFromSlide('slide-7')">📋 一鍵複製 Prompt</button>
          </div>
          <pre class="prompt-code" id="prompt-code-slide-7">你是一位國小數學互動教具專家。請幫我用 HTML/CSS/JavaScript 撰寫一個適用於【國小五年級】的【分數加減法視覺化】互動教具。

功能需求：
1. 上方有兩個輸入框，讓學生輸入兩個異分母分數。
2. 下方用『長方形面積切割』的方式，視覺化呈現通分的過程。
3. 提供一個『顯示答案』按鈕與『清除重來』按鈕。
4. 整體版面要適合國小學生，色彩鮮明、字體要大。
5. 請將所有程式碼打包在單一 HTML 檔案中，方便我下載使用。</pre>
        </div>
      `,
      notes: "實作引導 Step 2：請老師們點擊複製按鈕，開啟 Gemini 頁面貼上。"
    },
    {
      id: "slide-8",
      section: "第 3 節：生成與微調",
      title: "現場生成測試與 AI 迭代微調 (Prompt Tuning)",
      subtitle: "複製程式碼 & Across 對話持續進化教具",
      type: "tuning",
      content: `
        <div class="tuning-flow">
          <div class="flow-step">
            <div class="badge">Step 3</div>
            <h4>現場生成與測試</h4>
            <ol>
              <li>將 Prompt 貼入 Gemini 進行生成</li>
              <li>複製 Gemini 產出的 HTML 程式碼</li>
              <li>開啟 <a href="https://codepen.io/pen/" target="_blank" class="link-btn">CodePen 預覽平台</a> 或本機記事本存為 <code>.html</code> 檔開啟</li>
            </ol>
          </div>
          <div class="flow-step">
            <div class="badge">Step 4</div>
            <h4>AI 迭代微調 (Prompt Tuning) 體驗</h4>
            <p>透過對話繼續優化教具功能：</p>
            <div class="prompt-tune-example">
              <div class="ex-item">
                <span class="ex-label">🎨 練習 1 (改版面)：</span>
                <code>「請幫我把字體加大，並新增計分板。」</code>
              </div>
              <div class="ex-item">
                <span class="ex-label">🎆 練習 2 (增功能)：</span>
                <code>「請加入音效提醒，答對時顯示煙火動畫。」</code>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: "實作引導 Step 3&4：給學員 20 分鐘操作測試，並體驗用對話修改程式碼的樂趣。"
    },
    {
      id: "slide-9",
      section: "研習時間表",
      title: "研習時間配比表 (3 小時 / 180 分鐘)",
      subtitle: "精準時間掌控與章節規劃",
      type: "schedule",
      content: `
        <div class="schedule-table-wrapper">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>時間區間</th>
                <th>時長</th>
                <th>研習主題與內容</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight-row">
                <td>00:00 - 00:50</td>
                <td>50 mins</td>
                <td><strong>[第 1 節]</strong> 講師教具展示與體驗（教學、評量、遊戲三類）</td>
              </tr>
              <tr class="break-row">
                <td>00:50 - 01:00</td>
                <td>10 mins</td>
                <td>☕ 中場休息 / 交流討論</td>
              </tr>
              <tr class="highlight-row">
                <td>01:00 - 01:50</td>
                <td>50 mins</td>
                <td><strong>[第 2 節]</strong> AI 融合數學教學設計思維與教學實務分享</td>
              </tr>
              <tr class="break-row">
                <td>01:50 - 02:00</td>
                <td>10 mins</td>
                <td>☕ 中場休息 / 開啟 Gemini 準備實作</td>
              </tr>
              <tr class="highlight-row">
                <td>02:00 - 02:45</td>
                <td>45 mins</td>
                <td><strong>[第 3 節]</strong> Gemini 手把手實作（Prompt 結構說明 + 現場生成體驗）</td>
              </tr>
              <tr class="share-row">
                <td>02:45 - 03:00</td>
                <td>15 mins</td>
                <td>🎉 學員作品成果分享與 Q&A 交流</td>
              </tr>
            </tbody>
          </table>
        </div>
      `,
      notes: "時間控管：講師可隨時參考倒數計時器，掌握研習節奏。"
    },
    {
      id: "slide-10",
      section: "結語與 Q&A",
      title: "賦能教師 ‧ 翻轉課堂 ‧ 創思無限",
      subtitle: "感謝您的參與！一起成為數位教具設計師",
      type: "summary",
      content: `
        <div class="summary-card">
          <div class="summary-icon">✨</div>
          <h3>「用 AI 賦能教學，讓每位教師都能成為數位教具設計師！」</h3>
          <p class="summary-sub">
            透過 Gemini，不需要寫複雜程式碼，就能為孩子量身打造最適合的數學互動教具。
          </p>
          <div class="action-buttons">
            <a href="研習簡報後台.html" class="btn-primary">⚙️ 開啟簡報管理後台編輯文字</a>
            <button class="btn-secondary" onclick="restartPresentation()">🔄 重新播放簡報</button>
          </div>
        </div>
      `,
      notes: "結尾 Q&A：邀請學員分享產出成果，解答老師在課堂運用上的疑惑。"
    }
  ]
};

// 全局資料存取 API
function getWorkshopData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved workshop data, falling back to default:", e);
    }
  }
  return DEFAULT_WORKSHOP_DATA;
}

function saveWorkshopData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Failed to save workshop data:", e);
    return false;
  }
}

function resetWorkshopData() {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_WORKSHOP_DATA;
}

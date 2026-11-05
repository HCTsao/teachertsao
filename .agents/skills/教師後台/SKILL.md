---
name: 教師管理後台開發規範
description: 用於標準化生成、維護與擴充「紅旗老師AI教具系列」教師管理後台與錯題分析系統的架構規範與程式碼範本
---

# 教師管理後台開發規範 (Teacher Dashboard Skill)

本 Skill 封裝了「紅旗老師的AI天地」數位教具專案中，**所有教師管理後台（Teacher Dashboard）與作答記錄日誌系統**的標準設計模式、密碼安全防護、資料庫結構及純前端介面規格。

---

## 1. 核心架構與設計哲學

1. **單一檔案發布（Self-contained HTML）**：
   - 每個教具的後台為獨立的 HTML 檔案（例如 `[單元名]_教師後台.html` 或 `teacher.html`）。
   - 樣式、邏輯與第三方 SDK 整合於同一檔案，相容 GitHub Pages 靜態託管。
2. **學生端零門檻免登入**：
   - 學生只需輸入「班級、姓名、座號」即可直接遊戲（若未輸入則自動標記為「訪客」）。
   - 學生端透過非同步日誌函式發送紀錄，**即使日誌失敗或網路斷線，絕不能中斷或阻塞學生的遊戲體驗**。
3. **統一回導導覽列**：
   - 後台左上角或右上角必須包含首頁導航：
     - 導航規範：一律提供「🎮 回到遊戲」按鈕連結至對應的學生端遊戲 HTML 檔案，不設「回首頁」按鈕。

---

## 2. 兩道安全密碼驗證體系

為確保班級作答隱私，並防止學生誤改後台資料，所有教具後台嚴格遵守以下兩層密碼機制：

| 防護層級 | 密碼 | 觸發位置與行為 |
| :--- | :--- | :--- |
| **進入後台驗證** | `8888` | 學生端進入後台前透過 `prompt()` 驗證；驗證成功後透過 `window.open('[檔案名]', '_blank')` 以新分頁開啟，或快取於 `sessionStorage`（12 小時內免重複輸入）。 |
| **全域管理者密碼** | `0987912307` | 執行破壞性或敏感操作時必填：**單筆刪除紀錄**、**清空資料庫所有紀錄**、**下載全班 Excel / PDF**。 |

---

## 3. 資料庫規範（Firebase Realtime Database / Firestore）

系統優先採用 **Firebase Realtime Database (相容 v10.8.0 compat)** 作為後端儲存庫。

### A. 學生作答紀錄資料結構 (`records/{recordId}` 或 `attempts/{id}`)
```json
{
  "timestamp": 1718000000000,
  "dateStr": "2026-10-31",
  "className": "501",
  "seat": "12",
  "studentName": "王小明",
  "questionText": "3、4、8",
  "studentAnswer": "可以拼成",
  "correctAnswer": "不能拼成",
  "isCorrect": false,
  "details": {
    "sides": [3, 4, 8],
    "attemptSequence": [6, 12, 18],
    "score": 100,
    "errorReason": "兩邊和小於第三邊"
  }
}
```

### B. 學生端非同步送出範本（不影響主線遊戲）
```javascript
function logAttempt(recordData) {
  try {
    const payload = Object.assign({
      timestamp: Date.now(),
      dateStr: new Date().toISOString().split('T')[0]
    }, recordData);

    // 以 Firebase 或 REST API 背景送出
    if (window.firebaseDB) {
      window.firebaseDB.ref('records').push(payload).catch(() => {});
    }
  } catch (e) {
    // 靜默捕捉，絕不干擾學生作答
  }
}
```

---

## 4. 後台 UI / UX 標準模組

教師管理後台頁面必須包含以下四個區塊：

### 區塊 1：上方導覽與累計統計卡片（Stats Grid）
- **累計作答人數**：依據「班級 + 座號 / 姓名」去重統計。
- **全班答對率 / 平均分**：總答對次數 ÷ 總題數百分比。
- **高頻錯題焦點**：統計該單元學生最常出錯的數值、概念或題型。

### 區塊 2：動態篩選列（Filter Card）
- **📅 日期區間篩選**：`<input type="date" id="fDateStart"> ～ <input type="date" id="fDateEnd">`。**預設留空不限制日期，以確保老師進入後台第一時間能瀏覽所有歷史作答紀錄**；老師可依需求自由指定起訖區間或清空重置。
- **🏫 班級下拉選單**：從資料庫即時紀錄中動態提取不重複的班級（如「全部班級」、「501」、「502」）。
- **🔍 姓名搜尋框**：關鍵字即時比對。
- **❌ 只看錯題 Checkbox**：預設或可手動勾選，過濾出 `isCorrect === false` 的資料，方便課堂補救教學。

### 區塊 3：紀錄明細表格（Table）
- 斑馬紋與狀態高亮：答對以淺綠底（`#f0fdf4`）、答錯以淺紅底（`#fef2f2`）標記。
- 欄位包含：
  `作答時間` | `班級` | `座號` | `姓名` | `題目情境` | `學生作答` | `正解` | `結果` | `管理動作（🗑️ 單筆刪除）`
- 點擊「🗑️ 刪除」時需跳出 `prompt` 驗證管理員密碼 `0987912307`。

### 區塊 4：純前端匯出按鈕群
- 引入 **SheetJS (xlsx.full.min.js)**，直接在瀏覽器端把篩選後的表格陣列轉為 `.xlsx`。
- 下載檔名格式：`[教具名稱]_[班級]_[日期]_作答成果.xlsx`。

---

## 5. 快速建立新教具後台的標準程式碼範本

當需要為新教具生成教師後台時，請採用以下 HTML 骨架：

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>教具名稱 - 教師管理後台</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500;700;900&display=swap" rel="stylesheet">
  <!-- Firebase Compat SDK -->
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>
  <!-- 純前端 Excel 匯出庫 -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>
    :root {
      --bg: #f8fafc; --card: #ffffff; --border: #e2e8f0;
      --text: #334155; --primary: #0f172a; --accent: #2563eb;
      --success: #16a34a; --danger: #dc2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans TC', sans-serif; background: var(--bg); color: var(--text); padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .nav { display: flex; gap: 10px; margin-bottom: 20px; }
    .nav a { background: #fff; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); text-decoration: none; color: var(--text); font-weight: 700; font-size: 14px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid var(--border); padding-bottom: 16px; }
    .stats-grid { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat-card { flex: 1; min-width: 160px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: center; }
    .stat-val { font-size: 26px; font-weight: 900; color: var(--primary); margin: 6px 0; }
    .filter-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    th, td { padding: 12px 10px; border-bottom: 1px solid var(--border); text-align: center; font-size: 14px; }
    th { background: #f1f5f9; font-weight: 800; color: var(--primary); }
    tr.good td { background: #f0fdf4; } tr.wrong td { background: #fef2f2; }
    .btn { padding: 8px 16px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-success { background: var(--success); color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="https://hctsao.github.io/teachertsao/index.html">🏠 回首頁</a>
      <a href="[學生端遊戲].html">🎮 進入遊戲</a>
    </div>

    <header>
      <h1>👨‍🏫 [教具名稱]・教師管理後台</h1>
      <div>
        <button class="btn btn-success" onclick="exportExcel()">📥 下載 Excel</button>
        <button class="btn btn-danger" onclick="clearAllData()">🧹 清除全班紀錄</button>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card"><div>累計作答人數</div><div class="stat-val" id="stCount">0</div><div>人已完成作答</div></div>
      <div class="stat-card"><div>平均答對率</div><div class="stat-val" id="stAccuracy">0%</div><div>全體平均命中率</div></div>
      <div class="stat-card"><div>錯題總次數</div><div class="stat-val" id="stWrong">0</div><div>次判斷或計算錯誤</div></div>
    </div>

    <div class="filter-card">
      <label>📅 日期區間：<input type="date" id="fDateStart" onchange="applyFilters()"> ～ <input type="date" id="fDateEnd" onchange="applyFilters()"></label>
      <label>🏫 班級：<select id="fClass" onchange="applyFilters()"><option value="">全部班級</option></select></label>
      <label><input type="checkbox" id="fWrongOnly" onchange="applyFilters()"> 只看錯題</label>
    </div>

    <table>
      <thead>
        <tr><th>時間</th><th>班級</th><th>座號</th><th>姓名</th><th>題目</th><th>學生作答</th><th>正解</th><th>結果</th><th>操作</th></tr>
      </thead>
      <tbody id="recordTable"></tbody>
    </table>
  </div>

  <script>
    const ADMIN_PASS = '0987912307';
    // 密碼驗證：清空資料
    function clearAllData() {
      const p = prompt('請輸入管理者密碼以確認清空全部資料：');
      if (p !== ADMIN_PASS) { alert('密碼錯誤，操作取消'); return; }
      // 執行資料庫清空邏輯
    }
    // 密碼驗證：單筆刪除
    function deleteRecord(key) {
      const p = prompt('請輸入管理者密碼以刪除此筆紀錄：');
      if (p !== ADMIN_PASS) { alert('密碼錯誤，操作取消'); return; }
      // 執行單筆刪除
    }
  </script>
</body>
</html>
```

---

## 6. 維護與檢查檢核表（Checklist）

在為任何教具建立或更新教師後台時，依序檢查以下項目：
- [ ] 學生端在「查看後台」時需提示輸入 `8888`。
- [ ] 刪除單筆紀錄與清空全部資料時需驗證管理員密碼 `0987912307`。
- [ ] 學生端送出紀錄使用容錯架構（背景非同步），斷線或送出失敗不影響畫面。
- [ ] 後台表格設有「只看錯題」切換按鈕，支援快速補救教學。
- [ ] 頂部設有「🎮 回到遊戲」按鈕正確連結至對應遊戲端頁面。

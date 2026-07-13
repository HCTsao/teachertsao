---
name: 怎樣解題
description: 用於生成與維護「怎樣解題：雞兔問題」互動式評量網站及教師管理後台的邏輯規範
---

# 怎樣解題：雞兔問題 系統開發與維護指南

本 Skill 封裝了「怎樣解題：雞兔問題」學生互動評量網頁與教師管理後台的所有核心邏輯、資料庫結構及設計規範。

## 1. 系統架構概要

本教具由兩個主要的 HTML 檔案組成：
- **學生端 (六下/怎樣解題：雞兔問題.html)**: 供學生進行作答，包含情境選擇、五步驟引導式算式與解釋輸入。
  - 步驟標籤 Emoji 說明：步驟 1 💭（僅 Emoji，不附文字）、步驟 2 ⚖️ 比較假設與實際的總差、步驟 3 🔄 單一個體置換的差、步驟 4 🔢 計算置換次數、步驟 5 💡 算出另一方的數量。
- **教師端 (六下/教師後台.html)**: 供教師即時監控、匯出 Excel/PDF，以及管理開課狀態。

資料庫採用 **Firebase Realtime Database** 進行無伺服器（Serverless）即時連線。

---

## 2. 資料庫節點設計

### A. 開課節點 (`classes/{classPassword}`)
當老師在後台開立課堂時寫入，以唯一「課堂密碼」為鍵值 (Key)：
```json
{
  "classPassword": {
    "teacherName": "教師姓名",
    "timestamp": 1718000000000
  }
}
```

### B. 學生作答紀錄 (`records/{recordId}`)
學生完成五步驟後推入的紀錄：
```json
{
  "teacherName": "教師姓名",
  "classPassword": "課堂密碼",
  "student": "座號 學生姓名",
  "timestamp": "ISO 8601 時間字串",
  "scenario": "情境名稱",
  "totalCount": 10,
  "totalCost": 35,
  "solvedPath": "A 或 B",
  "durationSeconds": 120,
  "failedAttempts": 2,
  "stepAnswers": {
    "1": { "eq": "算式", "meaning": "解釋", "attempts": [] },
    "2": { "eq": "算式", "meaning": "解釋", "attempts": [] },
    "3": { "eq": "算式", "meaning": "解釋", "attempts": [] },
    "4": { "eq": "算式", "meaning": "解釋", "attempts": [] },
    "5": { "eq": "算式", "meaning": "解釋", "attempts": [] }
  }
}
```

---

## 3. 學生端核心邏輯規範

### A. 課堂登入驗證
- **密碼驅動**：首頁僅保留「🔑 輸入課堂密碼」按鈕，學生輸入後從 `classes/{password}` 節點撈取對應老師名稱，若成功則自動帶入。若未輸入密碼則視為訪客（不寫入 records）。

### B. 鍵盤事件處理
- 算式輸入框監聽 `input` 事件，使用 **非同步替換（`setTimeout` delay=0）**：先計算替換後的字串，若與現在內容不同才動手更新 `target.value` 並計算補正後的游標位置，避免輸入法導致重複插入 `××` 或 `÷÷` 的 Bug。
- **不**使用 `keydown` 攼截 + `preventDefault()` 的方式，因為在 Windows 中文輸入法下 `e.key` 會回傳 `'Process'`，此方式失效並會产生重複字元。

### C. 語音輔助
- 當學生按「查看提示」時，使用 `SpeechSynthesisUtterance`（Web Speech API）以國語 `zh-TW` 唸出提示的引導問句。

---

## 4. 教師管理後台規範

### A. 資料分組
- 後台卡片必須以 `classes` 節點為基準進行渲染，確保即使無作答紀錄（0 筆）也能顯示卡片。
- 卡片在 Flex 佈局中每排至多顯示 3 個，以 `calc((100% - 30px) / 3)` 動態計算寬度。

### B. 安全認證
- 下載 Excel/PDF、刪除開課資料，均須輸入開課時設定的「課堂密碼」或全域管理員密碼 `0987912307` 進行驗證。
- 刪除課堂時，系統會一併連帶清除該密碼名下的所有學生作答紀錄。

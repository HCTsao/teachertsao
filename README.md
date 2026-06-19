# 紅旗老師的AI教具 - 入口入口入口網站

這是一個專為國小數學課堂設計的互動式數位學習平台入口網站。本平台整合了「紅旗老師的AI教具」目錄，涵蓋二年級至六年級的各項數位教具（如分數、除法、幾何圖形、面積與體積等主題），並提供美觀的搜尋與分類瀏覽功能。

本專案採純靜態網頁（HTML/CSS/JS）開發，支援各種裝置響應式瀏覽，且完全相容並已設計好用於 GitHub Pages 部署。

---

## 📂 專案檔案結構

* `index.html` - 入口網站主結構，內含全螢幕教具檢視器。
* `index.css` - 入口網站設計系統、配色方案、微動畫與響應式排版樣式。
* `app.js` - 教具資料庫與控制邏輯（搜尋過濾、年級切換、檢視器切換及瀏覽器「回上一頁」防錯邏輯）。
* `二上/`、`三上/`、`四上/`、`四下/`、`五上/`、`五下/`、`六上/`、`六下/` - 各年級學期的數位教具實體 HTML 檔案。

---

## 🚀 本地測試運行

您只需在瀏覽器中直接開啟 `index.html`，即可完整體驗網站的所有功能：
1. 雙擊 `index.html` 檔案。
2. 或是使用編輯器（如 VS Code）的 Live Server 套件開啟。

---

## 🌐 部署到 GitHub Pages 詳細教學

請按照以下步驟將本專案部署至 GitHub Pages，讓所有人都可以透過網址線上使用這些教具：

### 第一步：在 GitHub 上建立新的儲存庫 (Repository)
1. 登入您的 [GitHub 帳號](https://github.com/)。
2. 點選右上角的 **「+」**，選擇 **「New repository」**。
3. 填入專案名稱，例如：`math-ai-tools`（建議使用英文小寫與減號）。
4. 選擇 **「Public」**（公開），其餘設定保持預設（**請勿**勾選 Add a README file，因為我們本地已經有這個檔案了）。
5. 點選底部的 **「Create repository」**。
6. 建立完成後，您會看到一個頁面，上面寫著類似以下的 remote 網址，請複製它（格式如：`https://github.com/您的帳號/您的專案名稱.git`）。

### 第二步：在本地初始化 Git 並推送檔案
開啟終端機（Terminal）或命令提示字元（CMD/PowerShell），將路徑切換至此資料夾，並依序執行以下指令：

```bash
# 1. 初始化本地 Git 儲存庫
git init

# 2. 將所有檔案加入暫存區
git add .

# 3. 提交檔案並附帶訊息
git commit -m "Initial commit: 建立紅旗老師的AI教具門戶網站與目錄分類"

# 4. 強制將預設分支名稱命名為 main
git branch -M main

# 5. 連結到您在 GitHub 建立的遠端儲存庫 (請將下方的 URL 替換為您第一步複製的網址)
git remote add origin https://github.com/您的帳號/您的專案名稱.git

# 6. 將程式碼推送到 GitHub
git push -u origin main
```

*(註：如果推送時提示需要登入，請依瀏覽器指示完成 GitHub 授權登入即可。)*

### 第三步：啟用 GitHub Pages 網頁託管
1. 回到瀏覽器中的 GitHub 專案頁面，點選頂部選單的 **「Settings」** (設定)。
2. 在左側側邊欄中尋找 **「Code and automation」** 區塊，點選 **「Pages」**。
3. 在 **Build and deployment** 下的 **Source** 選擇 **「Deploy from a branch」**。
4. 在 **Branch** 選項中，將 `None` 改選為 **`main`**，後方資料夾選擇 **`/ (root)`**，然後按下右側的 **「Save」** (儲存)。
5. 等待大約 1-2 分鐘，重新整理頁面，頂部會出現一個綠色的提示框，顯示您的網站已成功上線，網址格式通常為：
   `https://您的帳號.github.io/您的專案名稱/`

---

## 🛠️ 未來如何新增教具？

當您有新的數位教具完成時，只需以下簡單三步即可將其更新上線：
1. 將新教具的 HTML 檔案放入對應的年級資料夾中（例如：將 `新教具.html` 放入 `二下/` 目錄）。
2. 開啟 `app.js`，在 `toolsData` 陣列中新增一筆教具資料，例如：
   ```javascript
   {
       name: "新教具名稱",
       category: "二下",
       path: "二下/新教具.html",
       desc: "這是一段簡單的教具描述，用來向使用者介紹這個教具..."
   }
   ```
3. 在終端機執行 Git 更新指令：
   ```bash
   git add .
   git commit -m "Add new tool: 二下新教具"
   git push
   ```
   GitHub Pages 將會自動在背景重新部署，約一分鐘後網頁即可看到更新！

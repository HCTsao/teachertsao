@echo off
chcp 65001 >nul
echo ===================================================
echo   紅旗老師的AI教具 - GitHub 自動上傳小幫手
echo ===================================================
echo.

:: 檢查 Git 是否安裝
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Git 指令！
    echo 請先下載並安裝 Git (Windows 64位元版本)：
    echo 👉 https://git-scm.com/download/win
    echo.
    echo 安裝完成後，請「重新開啟此視窗」或重新執行此腳本 (upload.bat)。
    echo.
    pause
    exit /b
)

echo [1/3] 初始化 Git 本地儲存庫...
if not exist .git (
    git init
) else (
    echo 本地已存在 Git 儲存庫。
)

echo.
echo [2/3] 請輸入您的 GitHub Repository 遠端網址
echo (格式如：https://github.com/您的帳號/專案名稱.git)
echo.
set /p REPO_URL="請在此處貼上網址，然後按下 Enter: "

if "%REPO_URL%"=="" (
    echo [錯誤] 網址不能為空！
    pause
    exit /b
)

echo.
echo 正在設定遠端連接點 (origin)...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo [3/3] 正在收集網頁檔案並進行提交...
git add .
git commit -m "Initial commit: 建立紅旗老師的AI教具入口網站與目錄分類"
git branch -M main

echo.
echo 正在將檔案推送至 GitHub (首次推送可能會彈出登入視窗，請完成驗證)...
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   🎉 [成功] 檔案已成功推送到 GitHub！
    echo ===================================================
    echo.
    echo 接下來請至 GitHub 啟用網頁託管服務：
    echo 1. 開啟瀏覽器中的 GitHub 專案頁面。
    echo 2. 點選頂部的 [Settings] (設定) 頁籤。
    echo 3. 點選左側選單的 [Pages]。
    echo 4. 在 Build and deployment -> Source 選擇 "Deploy from a branch"。
    echo 5. 在 Branch 選項中將 None 改選為 "main"，資料夾保持 "/ (root)"，然後按下 [Save]。
    echo 6. 等待約 1-2 分鐘後重新整理 Pages 頁面，即可看到您的專屬網址！
    echo.
) else (
    echo.
    echo ❌ [失敗] 上傳失敗！請確認您的 GitHub 網址是否正確，或是網路連線是否正常。
    echo.
)

pause

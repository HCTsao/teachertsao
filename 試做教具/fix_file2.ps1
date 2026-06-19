$file = (Get-ChildItem "200*.html")[0].FullName

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Fix strokeStyle
$content = $content -replace "ctx\.strokeStyle = '#1e3a8a';[\s\S]*?ctx\.lineJoin = 'round';", "ctx.strokeStyle = '#1e3a8a'; // 深藍色`r`n            ctx.lineJoin = 'round';"

# Fix duplicated window.onload 
$content = $content -replace "window\.onload = \(\) => \{[\s\S]*?initGame\(\);\s*?\};", "window.onload = () => {`r`n            initHandwritingCanvas();`r`n            setMode('coin');`r`n            initGame();`r`n        };"

# Fix duplicated setMode
$setModeCorrect = @"
function setMode(newMode) {
            mode = newMode;
            if (mode === 'coin') {
                document.getElementById('btn-coin-mode').className = `"px-6 py-3 rounded-2xl font-bold text-lg shadow-md transition-all bg-amber-500 text-white border-2 border-amber-600 scale-105`";
                document.getElementById('btn-block-mode').className = `"px-6 py-3 rounded-2xl font-bold text-lg shadow-md transition-all bg-white text-amber-700 border-2 border-amber-300 hover:bg-amber-100`";
                document.getElementById('coin-mode-area').classList.remove('hidden');
                document.getElementById('block-mode-area').classList.add('hidden');
            } else {
                document.getElementById('btn-block-mode').className = `"px-6 py-3 rounded-2xl font-bold text-lg shadow-md transition-all bg-amber-500 text-white border-2 border-amber-600 scale-105`";
                document.getElementById('btn-coin-mode').className = `"px-6 py-3 rounded-2xl font-bold text-lg shadow-md transition-all bg-white text-amber-700 border-2 border-amber-300 hover:bg-amber-100`";
                document.getElementById('block-mode-area').classList.remove('hidden');
                document.getElementById('coin-mode-area').classList.add('hidden');
            }
            updateShoppingProblemText();
            initGame();
        }
"@
$content = $content -replace "function setMode\(newMode\) \{[\s\S]*?initGame\(\);\s*?\}", $setModeCorrect

# Fix duplicated nextQuestion
$nextQuestionCorrect = @"
function nextQuestion() {
            playSound('click');
            initHandwritingCanvas();
            setMode('coin');
            initGame();
        }
"@
$content = $content -replace "function nextQuestion\(\) \{[\s\S]*?initGame\(\);\s*?\}", $nextQuestionCorrect

# Now, dealing with the corrupted manualSpeechInput and updateShoppingProblemText
# First, remove them entirely
while ($content.Contains("function manualSpeechInput() {")) {
    $idx = $content.IndexOf("function manualSpeechInput() {")
    $endIdx = $content.IndexOf("let targetVal = 0;", $idx)
    if ($idx -ge 0 -and $endIdx -ge 0) {
        $content = $content.Remove($idx, $endIdx - $idx)
    } else {
        break
    }
}

while ($content.Contains("function updateShoppingProblemText() {")) {
    $idx = $content.IndexOf("function updateShoppingProblemText() {")
    $endIdx = $content.IndexOf("}", $idx)
    $endIdx = $content.IndexOf("}", $endIdx + 1) + 1
    if ($idx -ge 0 -and $endIdx -ge 0) {
        $content = $content.Remove($idx, $endIdx - $idx)
    } else {
        break
    }
}

# Now insert the correct ones before "let targetVal = 0;"
$correctFunctions = @"
        function manualSpeechInput() {
            playSound('click');
            const typed = prompt(`[手動輸入讀音] 請在此輸入中文讀音（例如：`${getChineseStandardReading(targetValue)}）：`);
            if (typed) {
                verifySpeech(typed.trim());
            }
        }

        function updateShoppingProblemText() {
            if (questionType === 1 && currentItem) {
                const toolName = mode === 'coin' ? '錢幣' : '積木';
                const actionName = mode === 'coin' ? '付錢' : '排';
                document.getElementById('problem-text').innerHTML = `買一個 <b>`${currentItem.name} `${currentItem.icon}</b> 要 <b>`${targetValue}</b> 元，怎麼`${actionName}會剛好？用`${toolName}排排看。`;
            }
        }

"@

$content = $content.Replace("        let targetVal = 0;", $correctFunctions + "        let targetVal = 0;")

$content = $content -replace "feedback\.innerHTML = `"[^`"]*`";", "feedback.innerHTML = `"🎉 <b>已收下手寫答案！</b> 下一步，請進行口說語音檢核。`";"
$content = $content -replace "document\.getElementById\('speech-status'\)\.innerText = `"[^`"]*`";", "document.getElementById('speech-status').innerText = `"點擊按鈕，念出這個數字`";"

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)

Write-Host "Replaced successfully!"

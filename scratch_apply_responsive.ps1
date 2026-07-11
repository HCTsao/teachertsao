$dir = "C:\Users\User001\Documents\teachertsao"
$file = Get-ChildItem -Path $dir -Recurse -Filter "*.html" | Where-Object { $_.FullName -match "\u4e58\u6cd5\u5fc3\u81df\u75c5" } | Select-Object -First 1
$filePath = $file.FullName
Write-Output "Updating: $filePath"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. Replace viewport meta tag for mobile zoom prevention
$oldMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
$newMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
$content = $content.Replace($oldMeta, $newMeta)

# 2. Add touch-action styles into style block
$oldStyle = '        body { overflow: hidden; background-color: #0f172a; margin: 0; font-family: system-ui, -apple-system, sans-serif; }'
$newStyle = '        * { touch-action: manipulation; }' + "`r`n" +
            '        .slap-area { touch-action: none !important; }' + "`r`n" +
            '        body { overflow: hidden; background-color: #0f172a; margin: 0; font-family: system-ui, -apple-system, sans-serif; }'
$content = $content.Replace($oldStyle, $newStyle)

# 3. Add toChineseNum and getChantText helper functions before App component (using Unicode escapes)
$oldAppDef = '        const App = () => {'
$newAppDef = @'
        const toChineseNum = (n) => {
            const mapping = { 
                0: "\u96f6", 1: "\u4e00", 2: "\u4e8c", 3: "\u4e09", 4: "\u56db", 
                5: "\u4e94", 6: "\u516d", 7: "\u4e03", 8: "\u516b", 9: "\u4e5d" 
            };
            if (n < 10) return mapping[n];
            if (n === 10) return "\u5341";
            if (n < 20) return "\u5341" + mapping[n % 10];
            if (n % 10 === 0) return mapping[Math.floor(n / 10)] + "\u5341";
            return mapping[Math.floor(n / 10)] + "\u5341" + mapping[n % 10];
        };

        const getChantText = (m, s, p) => {
            const chM = toChineseNum(m);
            const chS = toChineseNum(s);
            const chP = toChineseNum(p);
            if (s === 10) {
                return chM + "\u5341\u5f97" + chP;
            }
            if (p < 10) {
                if (s === 1) {
                    return chM + "\u4e00" + chP;
                }
                return chM + chS + "\u5f97" + chP;
            }
            return chM + chS + chP;
        };

        const App = () => {
'@
$newAppDef_norm = $newAppDef -replace "`r`n", "`n"
$content_norm = $content -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldAppDef, $newAppDef_norm)

# 4. Add scale state and handleResize useEffect inside App
$oldStateDef = '            const [gameState, setGameState] = useState(''menu'');'
$newStateDef = @'
            const [gameState, setGameState] = useState('menu'); 
            const [scale, setScale] = useState(1);
            useEffect(() => {
                const handleResize = () => {
                    const baseWidth = 1024;
                    const baseHeight = 768;
                    const scaleX = window.innerWidth / baseWidth;
                    const scaleY = window.innerHeight / baseHeight;
                    setScale(Math.min(scaleX, scaleY, 1));
                };
                window.addEventListener('resize', handleResize);
                handleResize();
                return () => window.removeEventListener('resize', handleResize);
            }, []);
'@
$newStateDef_norm = $newStateDef -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldStateDef, $newStateDef_norm)

# 5. Replace textToSpeak with getChantText in playTurn
$oldTextSpeak = '                            const textToSpeak = `${multiplier} 乘以 ${currentStep} 等於 ${callValue}`;'
$newTextSpeak = '                            const textToSpeak = getChantText(multiplier, currentStep, callValue);'
$content_norm = $content_norm.Replace($oldTextSpeak, $newTextSpeak)

# 6. Replace layouts positioning (move Computer 3 to right-12 symmetrically)
$oldLayouts = @'
                        const layouts = [
                            { pos: "bottom-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "left-[110%] top-1/2 -translate-y-1/2" },
                            { pos: "left-12 top-1/2 -translate-y-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" }, 
                            { pos: "top-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" },
                            { pos: "right-48 top-1/2 -translate-y-1/2", call: "right-full mr-4 top-1/2 -translate-y-1/2", cardAlign: "" } // 電腦3位置：文字在圖像左方，避免畫面右邊緣切掉
                        ];
'@
$newLayouts = @'
                        const layouts = [
                            { pos: "bottom-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "left-[110%] top-1/2 -translate-y-1/2" },
                            { pos: "left-12 top-1/2 -translate-y-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" }, 
                            { pos: "top-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" },
                            { pos: "right-12 top-1/2 -translate-y-1/2", call: "right-full mr-4 top-1/2 -translate-y-1/2", cardAlign: "" } // Computer 3: right-12, text to left
                        ];
'@
$oldLayouts_norm = $oldLayouts -replace "`r`n", "`n"
$newLayouts_norm = $newLayouts -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldLayouts_norm, $newLayouts_norm)

# 7. Add slap-area class to the slap area container
$oldSlapDiv = '                        <div className={`relative w-full h-full bg-emerald-800/40 rounded-[40px] border-4 border-dashed border-white/20 flex items-center justify-center cursor-pointer transition-colors ${gameState === ''slapping'' ? ''bg-red-500/30 border-red-500'' : ''''''}`} onClick={() => handleSlap(0)}>'
$newSlapDiv = '                        <div className={`relative w-full h-full bg-emerald-800/40 rounded-[40px] border-4 border-dashed border-white/20 flex items-center justify-center cursor-pointer transition-colors slap-area ${gameState === ''slapping'' ? ''bg-red-500/30 border-red-500'' : ''''''}`} onClick={() => handleSlap(0)}>'
$content_norm = $content_norm.Replace($oldSlapDiv, $newSlapDiv)

# 8. Wrap Menu screen return
$oldMenuReturn = @'
            if (gameState === 'menu') {
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center overflow-y-auto bg-slate-900">
                        <h1 className="text-6xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-md">十十乘法心臟病</h1>
'@
$newMenuReturn = @'
            if (gameState === 'menu') {
                return (
                    <div className="relative min-h-screen w-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none font-sans">
                        <div className="w-[1024px] h-[768px] shrink-0 relative bg-slate-900 rounded-[40px] border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center p-4" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                            <h1 className="text-6xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-md">十十乘法心臟病</h1>
'@
$oldMenuReturn_norm = $oldMenuReturn -replace "`r`n", "`n"
$newMenuReturn_norm = $newMenuReturn -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldMenuReturn_norm, $newMenuReturn_norm)

# Close Menu screen div wrap
$oldMenuEnd = @'
                        <div className="grid grid-cols-3 gap-4 max-w-lg w-full text-center">
                            {MULTIPLIERS.map(num => (<button key={num} onClick={() => startGame(num)} className="group relative h-16 bg-white text-slate-900 text-3xl font-black rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_6px_0_0_#cbd5e1] active:shadow-none active:translate-y-1">{num}</button>))}
                        </div>
                    </div>
                );
            }
'@
$newMenuEnd = @'
                        <div className="grid grid-cols-3 gap-4 max-w-lg w-full text-center">
                            {MULTIPLIERS.map(num => (<button key={num} onClick={() => startGame(num)} className="group relative h-16 bg-white text-slate-900 text-3xl font-black rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_6px_0_0_#cbd5e1] active:shadow-none active:translate-y-1">{num}</button>))}
                        </div>
                        </div>
                    </div>
                );
            }
'@
$oldMenuEnd_norm = $oldMenuEnd -replace "`r`n", "`n"
$newMenuEnd_norm = $newMenuEnd -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldMenuEnd_norm, $newMenuEnd_norm)


# 9. Wrap GameOver screen return
$oldGameOverReturn = @'
            if (gameState === 'gameOver') {
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-400 p-4 text-center text-slate-900">
                        <Trophy size={120} className="mb-4 animate-bounce mx-auto" />
                        <h2 className="text-5xl font-black mb-2">{winner ? `優勝者：${winner.name}` : "平局！牌都用完了"}</h2>
                        <button onClick={() => setGameState('menu')} className="mt-8 px-12 py-5 bg-slate-900 text-white rounded-2xl text-2xl font-bold hover:scale-105 transition-transform shadow-2xl">回主選單</button>
                    </div>
                );
            }
'@
$newGameOverReturn = @'
            if (gameState === 'gameOver') {
                return (
                    <div className="relative min-h-screen w-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none font-sans">
                        <div className="w-[1024px] h-[768px] shrink-0 relative bg-yellow-400 rounded-[40px] border-4 border-yellow-500 shadow-2xl flex flex-col items-center justify-center p-4 text-slate-900" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                            <Trophy size={120} className="mb-4 animate-bounce mx-auto" />
                            <h2 className="text-5xl font-black mb-2">{winner ? `優勝者：${winner.name}` : "平局！牌都用完了"}</h2>
                            <button onClick={() => setGameState('menu')} className="mt-8 px-12 py-5 bg-slate-900 text-white rounded-2xl text-2xl font-bold hover:scale-105 transition-transform shadow-2xl">回主選單</button>
                        </div>
                    </div>
                );
            }
'@
$oldGameOverReturn_norm = $oldGameOverReturn -replace "`r`n", "`n"
$newGameOverReturn_norm = $newGameOverReturn -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldGameOverReturn_norm, $newGameOverReturn_norm)


# 10. Wrap main Game Board return
$oldBoardReturn = @'
            return (
                <div className="relative min-h-screen bg-emerald-900 overflow-hidden select-none font-sans">
                    <div className="absolute top-4 left-4 z-50 flex gap-4">
'@
$newBoardReturn = @'
            return (
                <div className="relative min-h-screen w-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none font-sans">
                    <div className="w-[1024px] h-[768px] shrink-0 relative bg-emerald-900 rounded-[40px] border-4 border-emerald-800 shadow-2xl overflow-hidden" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                        <div className="absolute top-4 left-4 z-50 flex gap-4">
'@
$oldBoardReturn_norm = $oldBoardReturn -replace "`r`n", "`n"
$newBoardReturn_norm = $newBoardReturn -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldBoardReturn_norm, $newBoardReturn_norm)

# Close main Game Board wrap
$oldBoardEnd = @'
                    {showIdleHint && (<div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[100] bg-white text-emerald-800 px-6 py-3 rounded-full shadow-2xl border-4 border-yellow-400 font-black text-2xl flex items-center gap-2 animate-pulse text-center"><AlertCircle className="text-yellow-500" /> 輪到你了！</div>)}
                </div>
            );
        };
'@
$newBoardEnd = @'
                    {showIdleHint && (<div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[100] bg-white text-emerald-800 px-6 py-3 rounded-full shadow-2xl border-4 border-yellow-400 font-black text-2xl flex items-center gap-2 animate-pulse text-center"><AlertCircle className="text-yellow-500" /> 輪到你了！</div>)}
                    </div>
                </div>
            );
        };
'@
$oldBoardEnd_norm = $oldBoardEnd -replace "`r`n", "`n"
$newBoardEnd_norm = $newBoardEnd -replace "`r`n", "`n"
$content_norm = $content_norm.Replace($oldBoardEnd_norm, $newBoardEnd_norm)


# Save UTF-8 file
$content_crlf = $content_norm -replace "`n", "`r`n"
[System.IO.File]::WriteAllText($filePath, $content_crlf, [System.Text.Encoding]::UTF8)
Write-Output "Successfully applied all responsive and chant enhancements with clean ASCII Unicode escapes!"

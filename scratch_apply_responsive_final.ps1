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

# 5. Replace textToSpeak with getChantText in playTurn (regex-based to avoid matching Chinese characters)
$textSpeakRegex = 'const textToSpeak = .*?;'
$newTextSpeak = 'const textToSpeak = getChantText(multiplier, currentStep, callValue);'
$content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $textSpeakRegex, $newTextSpeak)

# 6. Replace the entire bottom return statement block of the App component (regex-based)
$returnBlockRegex = '(?s)if \(gameState === ''menu''\) \{.*?\n        \};'
$newReturnBlock = @'
            const renderScreen = () => {
                if (gameState === 'menu') {
                    return (
                        <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center overflow-y-auto bg-slate-900 text-white relative rounded-[40px]">
                            <h1 className="text-6xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-md">{"\u5341\u5341\u4e58\u6cd5\u5fc3\u81df\u75c5"}</h1>
                            <div className="flex flex-col gap-8 w-full max-w-md mb-8 text-white">
                                <div className="bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700 flex flex-col items-center">
                                    <div className="flex items-center justify-center gap-6">
                                        <span className={`text-lg font-bold transition-colors ${difficulty === 'easy' ? 'text-yellow-400' : 'text-slate-500'}`}>{"\u6b63\u80cc"}</span>
                                        <div 
                                            onClick={() => setDifficulty(d => d === 'easy' ? 'hard' : 'easy')}
                                            className="relative w-16 h-8 bg-slate-700 rounded-full p-1 cursor-pointer border-2 border-slate-600 hover:border-white transition-all"
                                        >
                                            <div className={`absolute top-1 left-1 bottom-1 w-5 flex items-center justify-center rounded-full bg-white transition-all duration-300 transform ${difficulty === 'hard' ? 'translate-x-8 bg-orange-500' : 'bg-yellow-400'}`} />
                                        </div>
                                        <span className={`text-lg font-bold transition-colors ${difficulty === 'hard' ? 'text-orange-500' : 'text-slate-500'}`}>{"\u5012\u80cc"}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700">
                                    <div className="flex items-center gap-2 mb-4 px-2 font-bold text-lg justify-center text-white"><Zap size={20} className="text-blue-400" /><span>{"\u96fb\u8166\u53cd\u61c9\u901f\u5ea6"}</span></div>
                                    <div className="flex justify-between mb-2 px-2 text-sm font-bold">
                                        <span className={aiLevel === 'easy' ? 'text-blue-400' : 'text-slate-400'}>{"\u7c21\u55ae"}</span>
                                        <span className={aiLevel === 'normal' ? 'text-yellow-400' : 'text-slate-400'}>{"\u666e\u901a"}</span>
                                        <span className={aiLevel === 'hard' ? 'text-red-500' : 'text-slate-400'}>{"\u56f0\u96e3"}</span>
                                    </div>
                                    <input type="range" min="0" max="2" step="1" value={aiLevel === 'easy' ? 0 : aiLevel === 'normal' ? 1 : 2} onChange={(e) => { const val = e.target.value; setAiLevel(val === "0" ? 'easy' : val === "1" ? 'normal' : 'hard'); }} className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 custom-range" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 max-w-lg w-full text-center">
                                {MULTIPLIERS.map(num => (<button key={num} onClick={() => startGame(num)} className="group relative h-16 bg-white text-slate-900 text-3xl font-black rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_6px_0_0_#cbd5e1] active:shadow-none active:translate-y-1">{num}</button>))}
                            </div>
                        </div>
                    );
                }

                if (gameState === 'gameOver') {
                    return (
                        <div className="flex flex-col items-center justify-center w-full h-full bg-yellow-400 p-4 text-center text-slate-900 rounded-[40px]">
                            <Trophy size={120} className="mb-4 animate-bounce mx-auto" />
                            <h2 className="text-5xl font-black mb-2">{winner ? `\u512a\u52dd\u8005\uff1a${winner.name}` : "\u5e73\u5c40\uff01\u724c\u90fd\u7528\u5b8c\u4e86"}</h2>
                            <button onClick={() => setGameState('menu')} className="mt-8 px-12 py-5 bg-slate-900 text-white rounded-2xl text-2xl font-bold hover:scale-105 transition-transform shadow-2xl">{"\u56de\u4e3b\u9078\u55ae"}</button>
                        </div>
                    );
                }

                return (
                    <div className="relative w-full h-full bg-emerald-900 overflow-hidden rounded-[40px]">
                        <div className="absolute top-4 left-4 z-50 flex gap-4">
                            <button onClick={() => { setIsMuted(!isMuted); initAudio(); }} className="p-3 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors">{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
                        </div>
                        <button onClick={() => setGameState('menu')} className="absolute bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900/80 text-white px-6 py-3 rounded-full hover:bg-slate-900 transition-all border border-white/20 shadow-xl"><Home size={20} className="mr-1" /><span className="font-bold">{"\u8fd4\u56de\u4e3b\u9078\u55ae"}</span></button>

                        {(gameState === 'starting' || errorMsg) && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 text-center text-slate-900">
                                <div className="bg-yellow-400 p-12 rounded-[40px] border-8 border-white shadow-2xl animate-bounce">
                                    <h2 className="text-6xl font-black">{errorMsg || startPrompt}</h2>
                                </div>
                            </div>
                        )}
                        
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-800 to-emerald-950 opacity-40" />

                        {players.map((player, idx) => {
                            const layouts = [
                                { pos: "bottom-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "left-[110%] top-1/2 -translate-y-1/2" },
                                { pos: "left-12 top-1/2 -translate-y-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" }, 
                                { pos: "top-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" },
                                { pos: "right-12 top-1/2 -translate-y-1/2", call: "right-full mr-4 top-1/2 -translate-y-1/2", cardAlign: "" }
                            ];
                            const cfg = layouts[idx];
                            const active = turn === idx;
                            const isCallForMe = currentCall && currentCall.playerIdx === idx;
                            
                            const unifiedCallBoxClass = "bg-yellow-400 text-slate-900 px-8 py-6 rounded-[40px] text-5xl font-black shadow-2xl border-4 border-white whitespace-nowrap";

                            return (
                                <Fragment key={player.id}>
                                    <div className={`absolute ${cfg.pos} flex flex-col items-center z-20`}>
                                        <div className="relative">
                                            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-4xl bg-white shadow-xl transition-all duration-300 ${active ? 'scale-125 border-yellow-400 ring-4 ring-yellow-400/30' : 'border-slate-200'}`}>
                                                {idx === 0 ? "\ud83d\ude4b" : "\ud83e\udd16"}
                                            </div>
                                            {/* 電腦與玩家公式定位邏輯 */}
                                            {idx !== 0 && isCallForMe && (
                                                <div className={`absolute ${cfg.call} z-40 pointer-events-none animate-bounce`}>
                                                    <div className={unifiedCallBoxClass}>
                                                        {currentCall.text}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-1 rounded-full text-sm font-bold border border-white/20 text-center min-w-[120px]">
                                            {player.name} {player.cards.length === 0 ? "\uff08\u6436\u62cd\u596a\u51a0\uff09" : "(" + player.cards.length + "\u5f35)"}
                                        </div>
                                        <div className="relative mt-6 w-24 h-32 flex justify-center items-center">
                                            <div className={`relative w-full h-full transition-all duration-500 ${idx === 0 && gameState === 'playing' && player.cards.length > 0 ? 'hover:scale-105 active:scale-95 cursor-pointer' : ''}`} onClick={() => idx === 0 && playTurn(true)}>
                                                {player.cards.length > 0 ? [...Array(Math.min(Math.ceil(player.cards.length / 1.5), 15))].map((_, i) => {
                                                    const cd = player.cards[player.cards.length - 1 - i] || {};
                                                    return (
                                                        <div key={i} className="absolute w-full h-full rounded-xl border-2 shadow-sm" style={{ 
                                                            top: isDealing ? cd.dealOy : -i * 2, 
                                                            left: isDealing ? cd.dealOx : i * 0.5, 
                                                            transform: `rotate(${isDealing ? cd.dealRot : 0}deg)`, 
                                                            zIndex: 20 - i, 
                                                            backgroundColor: (isDealing || i === 0) ? '#3b82f6' : '#f8fafc', 
                                                            borderColor: (isDealing || i === 0) ? '#2563eb' : '#cbd5e1' 
                                                        }} />
                                                    );
                                                }) : (
                                                    <div className="w-full h-full rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/20 font-black">{"\u7a7a"}</div>
                                                )}
                                            </div>
                                            {idx === 0 && isCallForMe && (
                                                <div className={`absolute ${cfg.cardAlign} z-40 pointer-events-none animate-bounce`}>
                                                    <div className={unifiedCallBoxClass}>
                                                        {currentCall.text}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Fragment>
                            );
                        })}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-64 h-80">
                            <div className={`relative w-full h-full bg-emerald-800/40 rounded-[40px] border-4 border-dashed border-white/20 flex items-center justify-center cursor-pointer transition-colors slap-area ${gameState === 'slapping' ? 'bg-red-500/30 border-red-500' : ''}`} onClick={() => handleSlap(0)}>
                                {isDealing ? (
                                    <div className="relative w-48 h-64">
                                        {[...Array(Math.min(mainDeck.length, 20))].map((_, i) => (<div key={i} className="absolute inset-0 bg-blue-500 rounded-2xl shadow-xl border-2 border-blue-600" style={{ top: -i * 1.5, left: i * 0.2, zIndex: 100 - i }} />))}
                                        {dealingProgress < 60 && (<div className={`fixed top-1/2 left-1/2 w-24 h-32 bg-blue-500 rounded-xl border-2 border-blue-600 shadow-lg z-[200] animate-deal-${dealingProgress % 4}`} />)}
                                    </div>
                                ) : (centerPile.length > 0 || flyingCard) && !punishingCard ? (
                                    <div className="relative w-48 h-64">
                                        {centerPile.slice(-8).map((card, i) => (<div key={card.id} className="absolute inset-0 bg-white rounded-2xl shadow-xl flex items-center justify-center text-7xl font-black text-slate-900 border-4 border-slate-50" style={{ zIndex: i }}>{i === centerPile.slice(-8).length - 1 ? card.value : ""}</div>))}
                                        {flyingCard && (
                                            <div className={`absolute inset-0 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-7xl font-black text-slate-900 z-[100] border-4 border-slate-200 pointer-events-none animate-fly-${flyingCard.fromPlayer}`}>
                                                {flyingCard.value}
                                            </div>
                                        )}
                                    </div>
                                ) : (!punishingCard && gameState !== 'dealing') && (<div className="text-white/10 font-black text-xl uppercase tracking-widest text-center text-slate-300">{"\u62cd\u724c\u5340"}</div>)}
                                {errorMsg && (<div className="absolute z-[160] bg-yellow-400 px-6 py-4 rounded-xl border-4 border-white shadow-2xl animate-pulse whitespace-nowrap pointer-events-none text-center text-slate-900"><h3 className="text-2xl font-black">{errorMsg}</h3></div>)}
                            </div>
                        </div>
                        {showIdleHint && (<div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[100] bg-white text-emerald-800 px-6 py-3 rounded-full shadow-2xl border-4 border-yellow-400 font-black text-2xl flex items-center gap-2 animate-pulse text-center"><AlertCircle className="text-yellow-500" /> {"\u8f2a\u5230\u4f60\u4e86\uff01"}</div>)}
                    </div>
                );
            };

            return (
                <div className="relative min-h-screen w-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none font-sans">
                    <div className="w-[1024px] h-[768px] shrink-0 relative bg-emerald-900 rounded-[40px] border-4 border-emerald-800 shadow-2xl overflow-hidden" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                        {renderScreen()}
                    </div>
                </div>
            );
        };
'@
$newReturnBlock_norm = $newReturnBlock -replace "`r`n", "`n"

if ([System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $returnBlockRegex)) {
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $returnBlockRegex, $newReturnBlock_norm)
    Write-Output "Successfully updated return statements block!"
} else {
    Write-Output "Could not match return statements block using regex!"
}

# Save UTF-8 file
$content_crlf = $content_norm -replace "`n", "`r`n"
[System.IO.File]::WriteAllText($filePath, $content_crlf, [System.Text.Encoding]::UTF8)
Write-Output "Successfully applied all responsive and chant enhancements cleanly!"

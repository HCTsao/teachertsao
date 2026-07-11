$dir = "C:\Users\User001\Documents\teachertsao"
$file = Get-ChildItem -Path $dir -Recurse -Filter "*.html" | Where-Object { $_.FullName -match "\u4e58\u6cd5\u5fc3\u81df\u75c5" } | Select-Object -First 1
$filePath = $file.FullName
Write-Output "Updating: $filePath"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Normalize line endings to LF for regex matching simplicity
$content_norm = $content -replace "`r`n", "`n"

# 1. Replace CSS keyframe animations
$oldCss = @'
        @keyframes flyFromBottom { 0% { transform: translate(-50%, 300px) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes flyFromLeft { 0% { transform: translate(-500px, -50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes flyFromTop { 0% { transform: translate(-50%, -400px) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes flyFromRight { 0% { transform: translate(400px, -50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
'@
$oldCss_norm = $oldCss -replace "`r`n", "`n"

$newCss = @'
        @keyframes flyFromBottom { 0% { transform: translateY(300px) scale(0.5); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes flyFromLeft { 0% { transform: translateX(-500px) scale(0.5); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
        @keyframes flyFromTop { 0% { transform: translateY(-400px) scale(0.5); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes flyFromRight { 0% { transform: translateX(400px) scale(0.5); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
'@
$newCss_norm = $newCss -replace "`r`n", "`n"

$content_norm = $content_norm.Replace($oldCss_norm, $newCss_norm)

# 2. Regex for JSX part (to be whitespace-independent)
$jsxRegex = "(?s)\) : centerPile\.length > 0 && !punishingCard \? \(.*?(w-32 h-44 md:w-48 md:h-64).*?\{flyingCard && \(<div.*?/div>\)\}"

$paiPaiQu = [regex]::Unescape("\u62cd\u724c\u5340")  # "拍牌區"

$newJsx = @'
) : (centerPile.length > 0 || flyingCard) && !punishingCard ? (
                                <div className="relative w-32 h-44 md:w-48 md:h-64">
                                    {centerPile.slice(-8).map((card, i) => (<div key={card.id} className="absolute inset-0 bg-white rounded-lg md:rounded-2xl shadow-xl flex items-center justify-center text-4xl md:text-7xl font-black text-slate-900 border-2 md:border-4 border-slate-50" style={{ zIndex: i }}>{i === centerPile.slice(-8).length - 1 ? card.value : ""}</div>))}
                                    {flyingCard && (
                                        <div className={`absolute inset-0 bg-white rounded-lg md:rounded-2xl shadow-2xl flex items-center justify-center text-4xl md:text-7xl font-black text-slate-900 z-[100] border-2 md:border-4 border-slate-200 pointer-events-none animate-fly-${flyingCard.fromPlayer}`}>
                                            {flyingCard.value}
                                        </div>
                                    )}
                                </div>
                            ) : (!punishingCard && gameState !== 'dealing') && (<div className="text-white/10 font-black text-sm md:text-xl uppercase tracking-widest text-center text-slate-300">{PAI_PAI_QU}</div>)}
                            {errorMsg && (<div className="absolute z-[160] bg-yellow-400 px-4 py-2 md:px-6 md:py-4 rounded-xl border-2 md:border-4 border-white shadow-2xl animate-pulse whitespace-nowrap pointer-events-none text-center text-slate-900"><h3 className="text-lg md:text-2xl font-black">{errorMsg}</h3></div>)}
'@
$newJsx = $newJsx.Replace("{PAI_PAI_QU}", $paiPaiQu)
$newJsx_norm = $newJsx -replace "`r`n", "`n"

if ([System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $jsxRegex)) {
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $jsxRegex, $newJsx_norm)
    $content_crlf = $content_norm -replace "`n", "`r`n"
    [System.IO.File]::WriteAllText($filePath, $content_crlf, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully updated JSX using regex with safe encoding!"
} else {
    Write-Output "Could not match JSX using regex!"
}

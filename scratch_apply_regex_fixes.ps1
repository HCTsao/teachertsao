$dir = "C:\Users\User001\Documents\teachertsao"
$file = Get-ChildItem -Path $dir -Recurse -Filter "*.html" | Where-Object { $_.FullName -match "\u4e58\u6cd5\u5fc3\u81df\u75c5" } | Select-Object -First 1
$filePath = $file.FullName
Write-Output "Applying regex fixes to: $filePath"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Normalize line endings to LF for regex matching simplicity
$content_norm = $content -replace "`r`n", "`n"

# 1. Replace layouts positioning (move Computer 3 to right-12 symmetrically)
$layoutsRegex = '(?s)const layouts = \[.*?right-48 top-1/2 -translate-y-1/2.*?\];'
$newLayouts = @'
const layouts = [
                            { pos: "bottom-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "left-[110%] top-1/2 -translate-y-1/2" },
                            { pos: "left-12 top-1/2 -translate-y-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" }, 
                            { pos: "top-8 left-1/2 -translate-x-1/2", call: "left-full ml-4 top-1/2 -translate-y-1/2", cardAlign: "" },
                            { pos: "right-12 top-1/2 -translate-y-1/2", call: "right-full mr-4 top-1/2 -translate-y-1/2", cardAlign: "" }
                        ];
'@
$newLayouts_norm = $newLayouts -replace "`r`n", "`n"

if ([System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $layoutsRegex)) {
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $layoutsRegex, $newLayouts_norm)
    Write-Output "Successfully updated layouts using regex!"
} else {
    Write-Output "Could not match layouts using regex!"
}

# 2. Replace textToSpeak with getChantText in playTurn
$textSpeakRegex = 'const textToSpeak = .*?;'
$newTextSpeak = 'const textToSpeak = getChantText(multiplier, currentStep, callValue);'

if ([System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $textSpeakRegex)) {
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $textSpeakRegex, $newTextSpeak)
    Write-Output "Successfully updated textToSpeak using regex!"
} else {
    Write-Output "Could not match textToSpeak using regex!"
}

# Save UTF-8 file
$content_crlf = $content_norm -replace "`n", "`r`n"
[System.IO.File]::WriteAllText($filePath, $content_crlf, [System.Text.Encoding]::UTF8)
Write-Output "Successfully applied final adjustments!"

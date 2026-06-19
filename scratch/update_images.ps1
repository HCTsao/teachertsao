# Find the html file dynamically without using any Chinese characters in the path
$folder = $pwd.Path
Write-Output "Searching in current directory: $folder"
$htmlFiles = Get-ChildItem -Path $folder -Filter "*.html" -Recurse
$path = ""
foreach ($file in $htmlFiles) {
    # Check for the filename by size or other patterns to ensure it's the correct one
    # The file size is around 160KB-170KB
    if ($file.Length -gt 100000 -and $file.Length -lt 250000) {
        $path = $file.FullName
        break
    }
}

if ($path -eq "") {
    Write-Error "HTML file not found!"
    exit 1
}

Write-Output "Found target HTML file: $path"

# Read content
$content = [System.IO.File]::ReadAllText($path)

# 1. Update window.onload
$target1 = "        window.onload = () => {`r`n" +
           "            // Mode Selectors`r`n" +
           "            document.getElementById('btn-coin-mode').onclick = () => { playSound('click'); selectMode('coin'); };`r`n" +
           "            document.getElementById('btn-block-mode').onclick = () => { playSound('click'); selectMode('block'); };`r`n" +
           "            `r`n" +
           "            initGame();`r`n" +
           "        };"

$replacement1 = "        window.onload = () => {`r`n" +
                "            // Mode Selectors`r`n" +
                "            document.getElementById('btn-coin-mode').onclick = () => { playSound('click'); selectMode('coin'); };`r`n" +
                "            document.getElementById('btn-block-mode').onclick = () => { playSound('click'); selectMode('block'); };`r`n" +
                "            `r`n" +
                "            selectMode(mode);`r`n" +
                "            initGame();`r`n" +
                "        };"

# Normalize line endings and replace
$content = $content.Replace($target1.Replace("`r`n", "`n"), $replacement1.Replace("`r`n", "`n"))
$content = $content.Replace($target1.Replace("`n", "`r`n"), $replacement1.Replace("`n", "`r`n"))
$content = $content.Replace($target1, $replacement1)

# 2. Update coin mode button image assignments
$yuan = [char]0x5143
$target2 = "                document.getElementById('img-btn-hundred').src = `"images/100$($yuan).jpg`";`r`n" +
            "                document.getElementById('img-btn-hundred').className = `"w-16 h-8 object-contain`";`r`n" +
            "                document.getElementById('img-btn-ten').src = `"images/10$($yuan).jpg`";`r`n" +
            "                document.getElementById('img-btn-ten').className = `"w-10 h-10 object-contain`";`r`n" +
            "                document.getElementById('img-btn-one').src = `"images/1$($yuan).jpg`";"

$replacement2 = "                document.getElementById('img-btn-hundred').src = IMAGES.coin100;`r`n" +
                "                document.getElementById('img-btn-hundred').className = `"w-16 h-8 object-contain`";`r`n" +
                "                document.getElementById('img-btn-ten').src = IMAGES.coin10;`r`n" +
                "                document.getElementById('img-btn-ten').className = `"w-10 h-10 object-contain`";`r`n" +
                "                document.getElementById('img-btn-one').src = IMAGES.coin1;"

$content = $content.Replace($target2.Replace("`r`n", "`n"), $replacement2.Replace("`r`n", "`n"))
$content = $content.Replace($target2.Replace("`n", "`r`n"), $replacement2.Replace("`n", "`r`n"))
$content = $content.Replace($target2, $replacement2)

# Write back as UTF-8 without BOM (same as original file representation)
$Utf8NoBom = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText($path, $content, $Utf8NoBom)
Write-Output "Successfully updated HTML file image paths!"

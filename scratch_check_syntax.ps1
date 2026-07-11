$file = Get-ChildItem -Recurse -Filter "*.html" | Where-Object { $_.FullName -match "\u4e58\u6cd5\u5fc3\u81df\u75c5" } | Select-Object -First 1
$content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

$braces = ($content.Split('{').Length - $content.Split('}').Length)
$parens = ($content.Split('(').Length - $content.Split(')').Length)
$brackets = ($content.Split('[').Length - $content.Split(']').Length)

Write-Output "Braces: $braces"
Write-Output "Parens: $parens"
Write-Output "Brackets: $brackets"

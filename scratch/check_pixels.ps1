Add-Type -AssemblyName System.Drawing

$folder = Join-Path $pwd.Path "試做教具\images"
if (-not (Test-Path $folder)) {
    # Try finding it dynamically
    $htmlFile = Get-ChildItem -Path $pwd.Path -Filter "*.html" -Recurse | Where-Object { $_.Name -like "*200*" }
    $folder = Join-Path $htmlFile.DirectoryName "images"
}

Write-Output "Checking folder: $folder"
$files = Get-ChildItem -Path $folder -Filter "*.*"

foreach ($file in $files) {
    if ($file.Extension -match "png|jpg|jpeg") {
        try {
            $img = New-Object System.Drawing.Bitmap($file.FullName)
            $pixel = $img.GetPixel(0, 0)
            Write-Output "$($file.Name): Width=$($img.Width), Height=$($img.Height), Format=$($img.PixelFormat), CornerPixel=R:$($pixel.R) G:$($pixel.G) B:$($pixel.B) A:$($pixel.A)"
            $img.Dispose()
        } catch {
            Write-Output "$($file.Name): Error reading: $_"
        }
    }
}

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = $pwd.Path }
$parentDir = Split-Path -Parent $scriptDir

$folderName = "$([char]0x516D)$([char]0x4E0B)"
$targetPath = Join-Path $parentDir $folderName

if (Test-Path $targetPath) {
    $pdfFile = Get-ChildItem -Path $targetPath -Filter "*.pdf" | Select-Object -First 1
    if ($pdfFile) {
        $pdfPath = $pdfFile.FullName
        $txtPath = Join-Path $scriptDir "pdf_content.txt"
        Write-Host "Found PDF: $pdfPath"
        
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0 # Suppress all dialogs/alerts
        
        try {
            Write-Host "Opening document..."
            # Open(FileName, ConfirmConversions, ReadOnly, LinkToFile, PasswordDocument, PasswordTemplate, Revert, WritePasswordDocument, WritePasswordTemplate, Format, Encoding, Visible, OpenAndRepair, DocumentDirection, NoRecentFiles, WritePasswordDocument, WritePasswordTemplate)
            $doc = $word.Documents.Open($pdfPath, $false, $true)
            Write-Host "Saving document..."
            $doc.SaveAs($txtPath, 2) # wdFormatText = 2
            $doc.Close()
            Write-Host "PDF text extracted successfully!"
        } catch {
            Write-Error $_.Exception.Message
        } finally {
            $word.Quit()
        }
    } else {
        Write-Error "No PDF file found in folder: $targetPath"
    }
} else {
    Write-Error "Folder does not exist: $targetPath"
}

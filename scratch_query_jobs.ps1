$url = "https://api.github.com/repos/HCTsao/teachertsao/actions/runs?per_page=1"
$headers = @{ "User-Agent" = "Mozilla/5.0" }
try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers
    $latest = $response.workflow_runs[0]
    Write-Output "Latest Run ID: $($latest.id)"
    Write-Output "Display Title: $($latest.display_title)"
    Write-Output "Status: $($latest.status)"
    Write-Output "Conclusion: $($latest.conclusion)"
} catch {
    Write-Error $_.Exception.Message
}

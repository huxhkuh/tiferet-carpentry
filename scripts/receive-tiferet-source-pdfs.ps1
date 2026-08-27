param(
  [Parameter(Mandatory = $true)]
  [string]$TargetRoot
)

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$targetPath = [IO.Path]::GetFullPath($TargetRoot)
if (-not $targetPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "TargetRoot must be inside the system temporary directory."
}

$null = New-Item -ItemType Directory -Path $targetPath -Force
Write-Output 'READY'

while ($true) {
  $fileId = [Console]::In.ReadLine()
  if ($null -eq $fileId -or $fileId -eq '__END__') {
    break
  }
  if ($fileId -notmatch '^[A-Za-z0-9_-]+$') {
    throw "Invalid Drive file ID: $fileId"
  }

  $base64 = [Console]::In.ReadLine()
  if ($null -eq $base64) {
    throw "Missing base64 payload for $fileId"
  }

  $bytes = [Convert]::FromBase64String($base64)
  $outputPath = Join-Path $targetPath "$fileId.pdf"
  [IO.File]::WriteAllBytes($outputPath, $bytes)
  Write-Output "WROTE $fileId $($bytes.Length)"
}

Write-Output 'DONE'

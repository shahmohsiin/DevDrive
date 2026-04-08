[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [string]$OutputPath,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Path -Parent

if (-not $ProjectRoot) {
    $ProjectRoot = Join-Path -Path $scriptDirectory -ChildPath ".."
}

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path

if (-not $OutputPath) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $projectName = Split-Path -Path $ProjectRoot -Leaf
    $OutputPath = Join-Path (Split-Path -Path $ProjectRoot -Parent) "$projectName-clean-$timestamp.zip"
}

$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Path $OutputPath -Parent

$normalizedProjectRoot = $ProjectRoot.TrimEnd("\", "/")
$projectRootPrefix = "$normalizedProjectRoot\"

if (($OutputPath -eq $normalizedProjectRoot) -or $OutputPath.StartsWith($projectRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputPath must be outside the project root to avoid zipping the archive into itself."
}

if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$cleanupDirectories = @(
    "mdrive-api\node_modules",
    "mdrive-api\dist",
    "mdrive-client\node_modules",
    "mdrive-client\dist",
    "mdrive-client\dist-ssr",
    "mdrive-client\src-tauri\target",
    "mdrive-client\src-tauri\gen\schemas"
)

$logPatterns = @(
    "*.log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    "pnpm-debug.log*",
    "lerna-debug.log*"
)

$cleanupTargets = New-Object System.Collections.Generic.List[string]

foreach ($relativePath in $cleanupDirectories) {
    $fullPath = Join-Path -Path $ProjectRoot -ChildPath $relativePath
    if (Test-Path -LiteralPath $fullPath) {
        $cleanupTargets.Add((Resolve-Path -LiteralPath $fullPath).Path)
    }
}

foreach ($pattern in $logPatterns) {
    Get-ChildItem -Path $ProjectRoot -Recurse -Force -File -Filter $pattern -ErrorAction SilentlyContinue |
        ForEach-Object {
            $cleanupTargets.Add($_.FullName)
        }
}

$uniqueTargets = $cleanupTargets | Sort-Object -Unique

Write-Host "Project root: $ProjectRoot"
Write-Host "Zip output:    $OutputPath"

if ($uniqueTargets.Count -eq 0) {
    Write-Host "No generated files or debug/log artifacts found to remove."
}
else {
    Write-Host ""
    Write-Host "Cleanup targets:"
    $uniqueTargets | ForEach-Object { Write-Host " - $_" }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Nothing was deleted and no zip was created."
    exit 0
}

foreach ($target in $uniqueTargets) {
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}

if (Test-Path -LiteralPath $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
}

$itemsToArchive = Get-ChildItem -LiteralPath $ProjectRoot -Force

if ($itemsToArchive.Count -eq 0) {
    throw "Nothing remains in the project root to archive."
}

Compress-Archive -Path $itemsToArchive.FullName -DestinationPath $OutputPath -CompressionLevel Optimal -Force

Write-Host ""
Write-Host "Created archive: $OutputPath"

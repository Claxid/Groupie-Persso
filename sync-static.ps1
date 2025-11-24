<#
Sync script: copy contents of `web/static` to `static` (overwrite).
Usage (PowerShell):
  .\sync-static.ps1
#>
$src = Join-Path $PSScriptRoot 'web\static'
$dst = Join-Path $PSScriptRoot 'static'

if (-not (Test-Path $src)) {
    Write-Error "Source not found: $src"
    exit 1
}

if (-not (Test-Path $dst)) {
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
}

Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
Write-Output "Synced $src -> $dst"

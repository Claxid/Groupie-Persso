# Script de build pour Groupie Tracker
# Contourne les problèmes de compilation Go liés aux chemins OneDrive

Write-Host "=== Build Groupie Tracker ===" -ForegroundColor Cyan

# Nettoyage
Write-Host "Nettoyage..." -ForegroundColor Yellow
Remove-Item groupie-tracker.exe -ErrorAction SilentlyContinue

# Création temporaire du go.sum si nécessaire
if (-not (Test-Path go.sum)) {
    Write-Host "Génération go.sum..." -ForegroundColor Yellow
    go mod download
}

# Build avec paramètres explicites
Write-Host "Compilation..." -ForegroundColor Yellow
$env:GOFLAGS = "-mod=mod"
go build -v -o groupie-tracker.exe .

if (Test-Path groupie-tracker.exe) {
    Write-Host "✓ Build réussi: groupie-tracker.exe" -ForegroundColor Green
    $size = (Get-Item groupie-tracker.exe).Length / 1MB
    Write-Host ("Taille: {0:N2} MB" -f $size) -ForegroundColor Gray
} else {
    Write-Host "✗ Échec du build" -ForegroundColor Red
    Write-Host "Essai avec build manuel..." -ForegroundColor Yellow
    
    # Fallback: compilation fichier par fichier
    go build -o groupie-tracker.exe main.go database.go auth.go routes.go
    
    if (Test-Path groupie-tracker.exe) {
        Write-Host "✓ Build manuel réussi!" -ForegroundColor Green
    } else {
        Write-Host "✗ Impossible de compiler. Vérifiez les erreurs ci-dessus." -ForegroundColor Red
        exit 1
    }
}

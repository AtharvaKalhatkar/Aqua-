# --- 🌊 Aqua Management System COMPLETE WIPE UTILITY 🌊 ---

$SupabaseUrl = "https://uszuutvdfavikxbyrduy.supabase.co/rest/v1/"
$ApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzenV1dHZkZmF2aWt4YnlyZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTczODEsImV4cCI6MjA5NDEzMzM4MX0.o-m2FoorW7H3J8wA5_v9OlfKbU007u2QM41VjnwimR0"

$headers = @{
    "apikey" = $ApiKey
    "Authorization" = "Bearer $ApiKey"
}

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 STEP 1: Wiping Cloud Database (Supabase)..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# Order matters because of Foreign Key constraints! 
# Delete dependent records first, then master table.

Write-Host "🗑️  Purging Deliveries..." -ForegroundColor Yellow
try {
    $r1 = Invoke-RestMethod -Uri "${SupabaseUrl}deliveries?id=neq.0" -Method DELETE -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Deliveries Cleared." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Deliveries clear status: $_" -ForegroundColor DarkYellow
}

Write-Host "🗑️  Purging Bills..." -ForegroundColor Yellow
try {
    $r2 = Invoke-RestMethod -Uri "${SupabaseUrl}bills?id=neq.0" -Method DELETE -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Bills Cleared." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Bills clear status: $_" -ForegroundColor DarkYellow
}

Write-Host "🗑️  Purging Customers..." -ForegroundColor Yellow
try {
    $r3 = Invoke-RestMethod -Uri "${SupabaseUrl}customers?id=neq.0" -Method DELETE -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Customers Cleared." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Customers clear status: $_" -ForegroundColor DarkYellow
}

Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 STEP 2: Wiping Local SQLite Database..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

$dbDir = Join-Path $env:USERPROFILE ".aqua_management"
$dbFile = Join-Path $dbDir "aqua_management.db"
$backupDir = Join-Path $dbDir "backups"

if (Test-Path $dbFile) {
    Write-Host "Removing local active DB: $dbFile..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $dbFile -Force -ErrorAction Stop
        Write-Host "✅ Local SQLite Database file deleted successfully!" -ForegroundColor Green
    } catch {
        Write-Host "🛑 FAILED to delete SQLite file: $_" -ForegroundColor Red
        Write-Host "   👉 Ensure the Java Desktop application is fully CLOSED before running wipe!" -ForegroundColor White
    }
} else {
    Write-Host "✨ SQLite Database file already clean/absent." -ForegroundColor Green
}

if (Test-Path $backupDir) {
    Write-Host "Removing local database backups..." -ForegroundColor Yellow
    try {
        Remove-Item -Path "$backupDir\*.*" -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "✅ Local backups directory cleared." -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Error cleaning backup files." -ForegroundColor DarkYellow
    }
}

Write-Host "`n🎉 SYSTEM RESET COMPLETE! 🌊" -ForegroundColor Magenta
Write-Host "Both Cloud and Desktop data pools are now completely empty." -ForegroundColor White
Write-Host "Start the desktop software or mobile app to begin entering production data." -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Killing all Node.js processes..." -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Waiting for processes to close..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting simple server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
npm run dev-simple 
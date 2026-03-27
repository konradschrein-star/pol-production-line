# Download a placeholder icon for the installer
# This script downloads a simple camera emoji icon from Twemoji

$iconUrl = "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f3ac.svg"
$svgPath = ".\electron\build\icon-temp.svg"
$outputPath = ".\electron\build\icon.ico"

Write-Host "Downloading placeholder icon..." -ForegroundColor Cyan

# Create build directory if it doesn't exist
$buildDir = ".\electron\build"
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
}

# Download SVG
try {
    Invoke-WebRequest -Uri $iconUrl -OutFile $svgPath
    Write-Host "Downloaded SVG icon" -ForegroundColor Green
} catch {
    Write-Host "Failed to download icon. Please use online tool instead." -ForegroundColor Red
    Write-Host "Visit: https://favicon.io/emoji-favicons/clapper-board/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Icon downloaded!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://cloudconvert.com/svg-to-ico" -ForegroundColor White
Write-Host "2. Upload: $svgPath" -ForegroundColor White
Write-Host "3. Download as .ico" -ForegroundColor White
Write-Host "4. Save as: $outputPath" -ForegroundColor White
Write-Host ""
Write-Host "Or use the faster method:" -ForegroundColor Cyan
Write-Host "Go to https://favicon.io/emoji-favicons/clapper-board/" -ForegroundColor White
Write-Host "Download and copy to: $outputPath" -ForegroundColor White

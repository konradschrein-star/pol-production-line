# Docker Desktop Silent Installer for Windows
# This script downloads and installs Docker Desktop if not already installed

param(
    [string]$InstallerPath = "$env:TEMP\DockerDesktopInstaller.exe"
)

# Output colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "========================================"
Write-ColorOutput Cyan "  Docker Desktop Installation Script"
Write-ColorOutput Cyan "========================================"
Write-Output ""

# Check if Docker is already installed
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

if (Test-Path $dockerPath) {
    Write-ColorOutput Yellow "Docker Desktop is already installed at:"
    Write-Output $dockerPath
    Write-Output ""
    Write-ColorOutput Green "Checking if Docker is running..."

    try {
        docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput Green "Docker is running!"
            exit 0
        } else {
            Write-ColorOutput Yellow "Docker is installed but not running."
            Write-Output "Starting Docker Desktop..."
            Start-Process $dockerPath
            Write-ColorOutput Green "Docker Desktop started. Please wait 30-60 seconds for it to initialize."
            exit 0
        }
    } catch {
        Write-ColorOutput Yellow "Docker is installed but not running."
        Write-Output "Starting Docker Desktop..."
        Start-Process $dockerPath
        exit 0
    }
}

# Download Docker Desktop installer
$dockerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"

Write-ColorOutput Cyan "Downloading Docker Desktop installer..."
Write-Output "URL: $dockerUrl"
Write-Output "Destination: $InstallerPath"
Write-Output ""

try {
    # Use BITS transfer for better progress and resume capability
    Import-Module BitsTransfer
    Start-BitsTransfer -Source $dockerUrl -Destination $InstallerPath -Description "Downloading Docker Desktop"
    Write-ColorOutput Green "Download complete!"
} catch {
    Write-ColorOutput Yellow "BITS transfer failed, trying WebClient..."

    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($dockerUrl, $InstallerPath)
        Write-ColorOutput Green "Download complete!"
    } catch {
        Write-ColorOutput Red "Failed to download Docker Desktop installer"
        Write-ColorOutput Red $_.Exception.Message
        exit 1
    }
}

Write-Output ""

# Verify download
if (-not (Test-Path $InstallerPath)) {
    Write-ColorOutput Red "Installer file not found after download!"
    exit 1
}

$fileSize = (Get-Item $InstallerPath).Length / 1MB
Write-Output "Installer size: $([math]::Round($fileSize, 2)) MB"
Write-Output ""

# Run installer
Write-ColorOutput Cyan "Installing Docker Desktop..."
Write-ColorOutput Yellow "This may take 5-10 minutes. Please wait..."
Write-Output ""

try {
    # Run installer with silent flags
    $process = Start-Process -FilePath $InstallerPath -ArgumentList "install --quiet --accept-license" -Wait -PassThru -NoNewWindow

    if ($process.ExitCode -eq 0) {
        Write-ColorOutput Green "Docker Desktop installed successfully!"
        Write-Output ""
        Write-ColorOutput Yellow "IMPORTANT: Windows may require a restart to complete installation."
        Write-ColorOutput Yellow "After restart, Docker Desktop should start automatically."
        Write-Output ""

        # Clean up installer
        Remove-Item $InstallerPath -Force

        exit 0
    } else {
        Write-ColorOutput Red "Installation failed with exit code: $($process.ExitCode)"
        exit $process.ExitCode
    }
} catch {
    Write-ColorOutput Red "Failed to run Docker Desktop installer"
    Write-ColorOutput Red $_.Exception.Message
    exit 1
}

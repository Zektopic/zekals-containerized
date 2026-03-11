# zekALS - Windows Setup Script
# This script helps set up the required tools and environment for zekALS on Windows.

# --- Helper Functions ---
function Print-Status ($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Print-Success ($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Print-Warning ($message) {
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Print-Error ($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Open-Link ($url) {
    Print-Warning "Opening the download page in your browser: $url"
    Start-Process $url
}

# --- Main Setup Logic ---
Print-Status "Starting Windows setup for zekALS..."

# 1. Install Chocolatey (if not present)
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Print-Status "Chocolatey (package manager) is not installed. Installing it now..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Print-Success "Chocolatey has been installed."
    } catch {
        Print-Error "Failed to install Chocolatey. Please install it manually from https://chocolatey.org/install"
        exit 1
    }
} else {
    Print-Success "Chocolatey is already installed."
}

# 2. Install Required Software
$requiredSoftware = @("python", "nodejs-lts", "git")
foreach ($pkg in $requiredSoftware) {
    if (-not (Get-Command $pkg.Split(' ')[0] -ErrorAction SilentlyContinue)) {
        Print-Status "Installing $pkg..."
        choco install $pkg -y
    } else {
        Print-Success "$pkg is already installed."
    }
}

# 3. Install Docker Desktop
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Print-Warning "Docker Desktop is required but not found."
    Open-Link "https://www.docker.com/products/docker-desktop/"
    Print-Warning "Please install Docker Desktop and ensure it is running before continuing."
    Wait-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
} else {
    Print-Success "Docker is already installed."
}

# 4. Create Python Virtual Environment
if (-not (Test-Path "venv")) {
    Print-Status "Creating Python virtual environment..."
    python -m venv venv
    Print-Success "Virtual environment created in 'venv'."
}

# 5. Install Dependencies
Print-Status "To install dependencies, please run 'run-dev.bat'."

# 6. Create .env file
if (-not (Test-Path ".env")) {
    Print-Status "Creating .env file from template..."
    Copy-Item ".env.example" -Destination ".env"
    Print-Warning "Please edit the .env file with your API keys and other settings."
}

Print-Success "Windows setup is complete. Please review the .env file and then run 'run-dev.bat'."
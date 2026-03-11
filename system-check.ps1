# zekALS - System Check for Windows

# --- Helper Functions ---
function Print-Check ($message) {
    Write-Host "[CHECK] $message" -NoNewline
}

function Print-Success ($message) {
    Write-Host "... OK" -ForegroundColor Green
    if ($message) {
        Write-Host "      $message"
    }
}

function Print-Error ($message) {
    Write-Host "... FAILED" -ForegroundColor Red
    if ($message) {
        Write-Host "      $message"
    }
}

# --- System Checks ---
Print-Check "Python 3 installation"
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyVersion = (python --version)
    Print-Success $pyVersion
} else {
    Print-Error "Python is not installed."
}

Print-Check "Node.js installation"
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = (node --version)
    Print-Success $nodeVersion
} else {
    Print-Error "Node.js is not installed."
}

Print-Check "Docker installation"
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Print-Success "Docker is installed."
} else {
    Print-Error "Docker Desktop is not installed or not in PATH."
}

# --- Project File Checks ---
Print-Check ".env file"
if (Test-Path ".env") {
    Print-Success "File exists."
} else {
    Print-Error ".env file not found. Run setup-windows.ps1 to create it."
}

Write-Host ""
Write-Host "System check complete. If any checks failed, please run 'setup-windows.ps1' or install the required software manually."
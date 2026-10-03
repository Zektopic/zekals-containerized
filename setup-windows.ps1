$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
if ($LASTEXITCODE -ne 0) { throw 'Install Node.js 22 or newer first.' }
npm ci --prefix za-frontend
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Write-Output 'Setup complete. Run .\run-dev.bat, then open http://localhost:3000.'

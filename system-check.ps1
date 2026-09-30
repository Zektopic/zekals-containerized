Set-Location $PSScriptRoot
Write-Output 'zekALS diagnostics (does not change system settings)'
node --version
npm --version
python --version
try { Invoke-RestMethod -Uri http://localhost:3000/health -TimeoutSec 2 } catch { Write-Output 'UI is not listening on port 3000. See docs/troubleshooting.md.' }

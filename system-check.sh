#!/usr/bin/env bash
set -uo pipefail
cd -- "$(dirname -- "$0")"
printf '%s\n' 'zekALS diagnostics (does not change system settings)'
node --version 2>/dev/null || true
npm --version 2>/dev/null || true
python3 --version 2>/dev/null || true
cargo --version 2>/dev/null || true
docker compose version 2>/dev/null || true
uname -sm
if [[ -e /dev/video0 ]]; then ls -l /dev/video0; else printf '%s\n' 'No /dev/video0; touch, keyboard and switch access are still available.'; fi
curl --max-time 2 -fsS http://localhost:3000/health || curl --max-time 2 -fsS http://localhost:8080/health || true
printf '\n%s\n' 'See docs/troubleshooting.md. Do not include private messages or .env files in bug reports.'

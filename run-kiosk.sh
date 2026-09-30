#!/usr/bin/env bash
set -euo pipefail
for browser in chromium chromium-browser google-chrome; do
  if command -v "$browser" >/dev/null 2>&1; then
    exec "$browser" --kiosk "${1:-http://localhost:8080}"
  fi
done
printf '%s\n' 'Install Chromium, or open http://localhost:8080 in your browser and use full screen.' >&2
exit 1

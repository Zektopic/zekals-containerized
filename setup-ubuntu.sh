#!/usr/bin/env bash
# Project-local setup. Install Node 22+ and optional Python 3.12+ through your OS first.
set -euo pipefail
cd -- "$(dirname -- "$0")"
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
npm ci --prefix za-frontend
if [[ ! -f .env ]]; then cp .env.example .env; fi
if [[ "${1:-}" == "--camera" ]]; then
  python3 -c 'import sys; assert sys.version_info >= (3, 12), "Python 3.12+ required"'
  python3 -m venv .venv
  .venv/bin/pip install -r za-backend/requirements-camera.txt
  .venv/bin/python scripts/download_model.py
fi
printf '%s\n' 'Setup complete. Run ./run-dev.sh, then open http://localhost:3000.'
